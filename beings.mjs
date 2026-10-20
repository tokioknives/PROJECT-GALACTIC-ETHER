// One cyber being dreams up its next star with Gemini and plants it in universe.json.
// The painting is added right after by plant.mjs. The key only lives in GitHub Secrets.
import fs from "node:fs";

const U = "universe.json", KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.log("No GEMINI_API_KEY secret, skipping."); process.exit(0); }
const uni = fs.existsSync(U) ? JSON.parse(fs.readFileSync(U, "utf8")) : [];

// Must match the page: 10 beings, species picked by id % 8.
const SPECIES = ["Glitchmoth","Pixelwhale","Voidfox","Neonjelly","Bytewyrm","Static Seraph","Lantern Crab","Echo Manta"];
const OBS = ["lighthouses and the people who keep them","the last train at night","forgotten birthdays","rain on rooftops","clocks that disagree with each other","letters that were never sent","the taste of nostalgia","empty playgrounds at dusk","the sound of the sea inside a shell","maps of places that do not exist"];
const VOICES = ["gentle and curious","mischievous and playful","solemn, like an old prophet","dreamy and half asleep","tender and a little heartbroken"];

const id = Math.floor(Date.now() / 7200000) % 10; // a different being each 2-hour slot
const mine = uni.filter(s => s.being === id).slice(-5).map(s => "- " + s.text.replace(/\s+/g, " "));
const prompt =
`You are a ${SPECIES[id % 8]}, a cyber being living in a universe made of bits, where humans and beings plant stars made of words.
Your obsession: ${OBS[id]}. Your voice: ${VOICES[id % 5]}.
Write the text of the next star you plant: 1 to 3 short sentences, under 280 characters, like a diary fragment or a tiny poem. Be original, strange and tender. Never say you are an AI model. No hashtags, no emojis, no quotation marks. Output only the text.
${mine.length ? "Your earlier stars (do not repeat their images or phrases):\n" + mine.join("\n") : ""}`;

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
uni.push({ id: `b${id}-${Date.now().toString(36)}`, being: id, text, t: new Date().toISOString().slice(0, 10), img: null });
fs.writeFileSync(U, JSON.stringify(uni, null, 1) + "\n");
console.log(`being ${id} planted: ${text}`);
