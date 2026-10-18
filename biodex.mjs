// The naturalist: invents new species (creatures and plants) for worlds and paints a portrait of each,
// in the same pixel-art cyberspace style as the stars. Saved in species.json + species/*.jpg.
// Needs the GEMINI_API_KEY secret (same one the painter uses). BIODEX_PER_RUN (repo variable) = new species per run, default 3.
import fs from "node:fs";

const U = "universe.json", S = "species.json", KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.log("No GEMINI_API_KEY secret, skipping."); process.exit(0); }
const uni = JSON.parse(fs.readFileSync(U, "utf8"));
const spec = fs.existsSync(S) ? JSON.parse(fs.readFileSync(S, "utf8")) : {};
const NEW = Math.max(0, Math.min(6, +(process.env.BIODEX_PER_RUN || 3)));
const MAX_PAINTS = 5, PER_WORLD = 10;
const IMG_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
const TEXT_MODELS = [process.env.GEMINI_TEXT_MODEL, "gemini-3.5-flash", "gemini-2.5-flash"].filter(Boolean);
const HABS = ["grass", "sand", "rock", "shallows"], TRAITS = ["curious", "shy", "nocturnal", "playful"];
let sharp = null; try { sharp = (await import("sharp")).default; } catch {}

const pick = a => a[Math.floor(Math.random() * a.length)];
const clean = (v, n) => String(v || "").replace(/https?:\/\/\S+|\S+@\S+/g, "").replace(/\s+/g, " ").replace(/["`]/g, "").trim().slice(0, n);
const rarity = () => { const r = Math.random(); return r < .5 ? "common" : r < .78 ? "uncommon" : r < .94 ? "rare" : "legendary"; };
const key = s => "w" + s.id;
let paints = 0;

async function paint(sp, w) {
  const l = w.lore || {};
  const prompt = `pixel art, neon cyberspace dreamscape, glowing colors, retro 8-bit, dark space background, a single ${sp.kind} centered in frame, full body, no text: ${sp.look}. Mood of its home world ${l.name || ""}: ${l.weather || ""}${sp.rarity === "legendary" ? ", radiant aura" : ""}`;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${IMG_MODEL}:generateContent`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"] } }),
    signal: AbortSignal.timeout(120000)
  });
  const j = await r.json().catch(() => ({}));
  const part = (j.candidates?.[0]?.content?.parts || []).find(p => p.inlineData || p.inline_data);
  if (!r.ok || !part) throw new Error("gemini " + r.status + " " + JSON.stringify(j.error || j.promptFeedback || "").slice(0, 160));
  const d = part.inlineData || part.inline_data;
  let buf = Buffer.from(d.data, "base64"), ext = (d.mimeType || d.mime_type || "image/png").includes("png") ? "png" : "jpg";
  if (sharp) { buf = await sharp(buf).resize(384, 384, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer(); ext = "jpg"; }
  if (buf.length < 1000 || buf.length > 4e6) throw new Error("bad image size");
  fs.mkdirSync("species", { recursive: true });
  const f = `species/${sp.id}.${ext}`; fs.writeFileSync(f, buf); return f;
}

async function invent(w, kind, rar, have) {
  const l = w.lore || {};
  const prompt = `You are a naturalist cataloguing life on a world in a pixel-art cyberspace universe, in the warm voice of a nature documentary.
World: "${l.name || "unnamed"}". Weather: ${l.weather || "calm"}. Known life: ${l.life || "unknown"}. Born from these words: ${String(w.text).replace(/\s+/g, " ").slice(0, 300)}
Already catalogued here: ${have.length ? have.join(", ") : "nothing yet"}.
Invent ONE new ${kind} species that lives here and is different from those. Its rarity is ${rar}.
Reply with JSON only: {"name":"a 1 to 3 word species name","habitat":"one of ${HABS.join(", ")}","trait":"one of ${TRAITS.join(", ")}","note":"one vivid field-note sentence under 140 characters","look":"a visual description under 200 characters: body shape, colors, glowing parts, one subject only"}. Never repeat real names, emails or addresses.`;
  for (const m of TEXT_MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 1.1, maxOutputTokens: 500, responseMimeType: "application/json" } }),
        signal: AbortSignal.timeout(60000)
      });
      const j = await r.json().catch(() => ({}));
      const o = JSON.parse((j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join(""));
      if (r.ok && o.name && o.note && o.look) return o;
    } catch (e) { console.log("model", m, "failed:", e.message); }
  }
  return null;
}

// 1) finish any portrait that failed earlier
const byId = new Map(uni.filter(s => s.id != null).map(s => [key(s), s]));
for (const k of Object.keys(spec)) for (const sp of spec[k]) {
  if (sp.img || (sp.tries || 0) >= 5 || paints >= MAX_PAINTS || !byId.has(k)) continue;
  paints++;
  try { sp.img = await paint(sp, byId.get(k)); delete sp.tries; } catch (e) { sp.tries = (sp.tries || 0) + 1; console.log("paint failed", sp.id, e.message); }
}

// 2) discover new species, favoring worlds with the fewest and the newest worlds
const worlds = uni.filter(s => s.id != null && s.text)
  .map((s, i) => ({ s, score: (spec[key(s)] || []).length - i * 0.01 + Math.random() }))
  .filter(x => (spec[key(x.s)] || []).length < PER_WORLD).sort((a, b) => a.score - b.score).map(x => x.s);
for (const w of worlds.slice(0, NEW)) {
  const k = key(w), list = spec[k] || (spec[k] = []);
  const kind = Math.random() < .3 ? "plant" : "creature", rar = rarity();
  const o = await invent(w, kind, rar, list.map(x => x.name));
  if (!o) continue;
  const name = clean(o.name, 40);
  if (!name || list.some(x => x.name.toLowerCase() === name.toLowerCase())) continue;
  const n = 1 + Math.max(0, ...list.map(x => +String(x.id).split("-").pop() || 0));
  const sp = { id: `${k}-${n}`, kind, name, habitat: HABS.includes(o.habitat) ? o.habitat : "grass", rarity: rar,
    trait: kind === "plant" ? "rooted" : TRAITS.includes(o.trait) ? o.trait : pick(TRAITS), note: clean(o.note, 140), look: clean(o.look, 200), img: null };
  list.push(sp);
  console.log(`catalogued ${rar} ${kind} "${name}" on ${w.lore?.name || k}`);
  if (paints < MAX_PAINTS) { paints++; try { sp.img = await paint(sp, w); } catch (e) { sp.tries = 1; console.log("paint failed", sp.id, e.message); } }
}
fs.writeFileSync(S, JSON.stringify(spec, null, 1) + "\n");
