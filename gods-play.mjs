// A god visits a few worlds and leaves a gift there: a shrine, a pond, a portal, a lantern...
// Visitors find it while walking around. Saved in miracles.json, keyed by world ("w" + star id).
// Works without a Gemini key too (the gods just improvise from a small list).
import fs from "node:fs";

const U = "universe.json", M = "miracles.json", KEY = process.env.GEMINI_API_KEY;
const uni = JSON.parse(fs.readFileSync(U, "utf8"));
const mir = fs.existsSync(M) ? JSON.parse(fs.readFileSync(M, "utf8")) : {};

// Order must match GODS in index.html and GOD in world.js
const GODS = [
  ["Mother Nebula", "gentle and warm: you leave gardens, ponds and shrines full of tenderness"],
  ["The Cartographer", "curious and clever: you leave portals, great trees and statues that point somewhere"],
  ["Old Static", "mischievous and musical: you leave lanterns, singing stones and odd little ponds"]
];
const KINDS = ["shrine", "pond", "great-tree", "portal", "statue", "lantern", "garden", "music-stone"];
const g = Math.floor(Date.now() / 43200000) % 3, VISITS = 2;
const key = s => "w" + s.id;
const pick = a => a[Math.floor(Math.random() * a.length)];
const clean = (v, n) => String(v || "").replace(/https?:\/\/\S+|\S+@\S+/g, "").replace(/\s+/g, " ").replace(/["`]/g, "").trim().slice(0, n);

const worlds = uni.filter(s => s.text && s.id != null);
if (!worlds.length) { console.log("No worlds yet."); process.exit(0); }
// visit the worlds with the fewest gifts first
worlds.sort((a, b) => (mir[key(a)] || []).length - (mir[key(b)] || []).length + (Math.random() - 0.5) * 2);

const FALLBACK = {
  name: ["The Pocket Sunrise", "Little Gate", "The Humming Stone", "Lost Lullaby", "Moss Throne", "Paper Moon Pond"],
  note: ["I left this here for whoever walks by. Stay as long as you like.", "Someone planted love nearby. I could not help adding to it.", "It hums if you stand very still.", "This used to be a rumor. Now it is a place."]
};
const models = [process.env.GEMINI_TEXT_MODEL, "gemini-3.5-flash", "gemini-2.5-flash"].filter(Boolean);

async function imagine(w) {
  if (!KEY) return null;
  const l = w.lore || {};
  const prompt = `You are ${GODS[g][0]}, a god in a pixel-art cyberspace universe. Your nature: ${GODS[g][1]}.
You are visiting a small world that visitors can walk around in. Leave ONE gift there for them to find.
World: "${l.name || "unnamed"}". Weather: ${l.weather || "calm"}. Life: ${l.life || "unknown"}. It was born from these words: ${String(w.text).replace(/\s+/g, " ").slice(0, 300)}
Reply with JSON only: {"kind":"one of ${KINDS.join(", ")}","name":"a 1 to 4 word name for your gift","note":"one warm, playful sentence you whisper to anyone who finds it, under 140 characters"}. Never repeat real names, emails or addresses.`;
  for (const m of models) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 1.1, maxOutputTokens: 400, responseMimeType: "application/json" } }),
        signal: AbortSignal.timeout(60000)
      });
      const j = await r.json().catch(() => ({}));
      const o = JSON.parse((j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join(""));
      if (r.ok && o.name && o.note) return o;
    } catch (e) { console.log("model", m, "failed:", e.message); }
  }
  return null;
}

for (const w of worlds.slice(0, VISITS)) {
  const o = (await imagine(w)) || {};
  const gift = {
    god: g,
    kind: KINDS.includes(o.kind) ? o.kind : pick(KINDS),
    name: clean(o.name, 40) || pick(FALLBACK.name),
    note: clean(o.note, 140) || pick(FALLBACK.note),
    t: new Date().toISOString().slice(0, 10)
  };
  mir[key(w)] = [...(mir[key(w)] || []), gift].slice(-6);
  console.log(`${GODS[g][0]} left a ${gift.kind} "${gift.name}" in ${w.lore?.name || key(w)}`);
}
fs.writeFileSync(M, JSON.stringify(mir, null, 1) + "\n");
