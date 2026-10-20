// A god takes 2 or 3 existing stars and fuses them into one new galaxy or nebula.
// The new world's painting, lore and song are added right after by plant.mjs.
import fs from "node:fs";

const U = "universe.json", KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.log("No GEMINI_API_KEY secret, skipping."); process.exit(0); }
const uni = JSON.parse(fs.readFileSync(U, "utf8"));

// Order must match GODS in index.html
const GODS = [
  ["Mother Nebula", "weave gentle things together: love, home and wonder"],
  ["The Cartographer", "join distant places into impossible maps"],
  ["Old Static", "remix noise, dreams and fear into strange beauty"]
];
const g = Math.floor(Date.now() / 43200000) % 3; // a different god every 12 hours

const pool = uni.filter(s => s.text && s.god == null); // gods remix humans and beings, never other gods
if (pool.length < 3) { console.log("Not enough stars yet."); process.exit(0); }

// prefer stars that haven't been remixed yet
const used = new Map();
uni.forEach(s => (s.parents || []).forEach(p => used.set(String(p), (used.get(String(p)) || 0) + 1)));
pool.sort((a, b) => (used.get(String(a.id)) || 0) - (used.get(String(b.id)) || 0) + (Math.random() - 0.5) * 2);
const parents = pool.slice(0, 8).sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2));

const prompt =
`You are ${GODS[g][0]}, a god in a pixel-art cyberspace universe. Your nature: you ${GODS[g][1]}.
You are fusing the stars below into ONE new world (a galaxy or nebula). Write its origin myth: 1 to 3 short sentences, under 280 characters, original and strange, echoing images from the parent stars without copying them word for word. Never repeat names, emails or addresses. No hashtags, no emojis, no quotation marks. Output only the myth.
PARENT STARS:
${parents.map(p => "- " + p.text.replace(/\s+/g, " ").slice(0, 300)).join("\n")}`;

const models = [process.env.GEMINI_TEXT_MODEL, "gemini-3.5-flash", "gemini-2.5-flash"].filter(Boolean);
async function ask() {
  for (const m of models) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 1.1, maxOutputTokens: 800 } }),
      signal: AbortSignal.timeout(60000)
    });
    const j = await r.json().catch(() => ({}));
    const t = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
    if (r.ok && t) return t;
    console.log("model", m, "failed:", r.status, JSON.stringify(j.error || j.promptFeedback || "").slice(0, 200));
  }
  throw new Error("all text models failed");
}

const text = (await ask()).replace(/^["'\s]+|["'\s]+$/g, "").replace(/[ \t]+/g, " ").slice(0, 400);
if (text.length < 10 || uni.some(s => s.text === text)) { console.log("skipped: too short or duplicate"); process.exit(0); }
uni.push({ id: `g${g}-${Date.now().toString(36)}`, god: g, parents: parents.map(p => p.id), text, t: new Date().toISOString().slice(0, 10), img: null });
fs.writeFileSync(U, JSON.stringify(uni, null, 1) + "\n");
console.log(`${GODS[g][0]} fused ${parents.length} stars: ${text}`);
