// Plants a new star from a GitHub Issue, paints it, and saves everything in the repo.
// The issue body is untrusted: it is only parsed as JSON, never run or put in a shell.
import fs from "node:fs";

const U = "universe.json";
const DEF = "https://image.pollinations.ai/prompt/{prompt}?width=512&height=512&seed={seed}&nologo=true";
const tpl = process.env.IMAGE_URL || DEF, auth = process.env.IMAGE_AUTH;
const uni = fs.existsSync(U) ? JSON.parse(fs.readFileSync(U, "utf8")) : [];

// Gemini painter: used when the GEMINI_API_KEY secret exists. The key only ever lives in GitHub Secrets.
const GKEY = process.env.GEMINI_API_KEY, GMODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
const MAX_PAINTS_PER_RUN = 5; // spending safety: never paint more than this in one run
let painted = 0;
let sharp = null; try { sharp = (await import("sharp")).default; } catch {} // shrinks images so the repo stays small

async function paintGemini(prompt) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GMODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GKEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"] } }),
    signal: AbortSignal.timeout(120000)
  });
  const j = await r.json().catch(() => ({}));
  const part = (j.candidates?.[0]?.content?.parts || []).find(p => p.inlineData || p.inline_data);
  if (!r.ok || !part) throw new Error("gemini " + r.status + " " + JSON.stringify(j.error || j.promptFeedback || "").slice(0, 200));
  const d = part.inlineData || part.inline_data;
  return { buf: Buffer.from(d.data, "base64"), ct: d.mimeType || d.mime_type || "image/png" };
}

function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
const out = (k, v) => process.env.GITHUB_OUTPUT && fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);

let planted = false;
if (process.env.GITHUB_EVENT_NAME === "issues") {
  try {
    const iss = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")).issue;
    const m = /```json\s*([\s\S]*?)```/.exec(iss.body || "");
    const text = String(JSON.parse(m[1]).text || "").trim().slice(0, 1500);
    const links = (text.match(/https?:\/\//g) || []).length;
    if (text.length >= 3 && links <= 2 && !uni.some(s => s.text === text)) {
      uni.push({ id: iss.number, text, t: new Date().toISOString().slice(0, 10), img: null });
      planted = true;
    }
  } catch (e) { console.log("could not read submission:", e.message); }
}
out("planted", planted);

async function paint(s) {
  const prompt = "pixel art, neon cyberspace dreamscape, glowing colors, retro 8-bit, dark space: " + s.text.slice(0, 200);
  let buf, ct;
  if (GKEY) ({ buf, ct } = await paintGemini(prompt));
  else {
    const url = tpl.replace("{prompt}", encodeURIComponent(prompt)).replace("{seed}", hash(s.text) % 100000);
    const r = await fetch(url, { headers: auth ? { Authorization: auth } : {}, signal: AbortSignal.timeout(90000) });
    ct = r.headers.get("content-type") || ""; buf = Buffer.from(await r.arrayBuffer());
    if (!r.ok || !ct.startsWith("image/")) throw new Error("bad image " + r.status);
  }
  if (sharp) { buf = await sharp(buf).resize(512, 512, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer(); ct = "image/jpeg"; }
  if (buf.length < 1000 || buf.length > 6e6) throw new Error("bad image size");
  fs.mkdirSync("stars", { recursive: true });
  const f = `stars/${s.id}.${ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg"}`;
  fs.writeFileSync(f, buf);
  return f;
}

// paint the new star, and retry any older star that is still missing its painting
for (const s of uni) {
  if (s.img || (s.tries || 0) >= 5) continue;
  if (painted++ >= MAX_PAINTS_PER_RUN) break;
  try { s.img = await paint(s); delete s.tries; }
  catch (e) { s.tries = (s.tries || 0) + 1; console.log("paint failed for", s.id, e.message); }
}
// Lore: Gemini names each star and writes its weather report, wildlife, population and a fun fact.
const TYPES = ["star", "planet", "comet", "galaxy", "nebula"]; // same order as the page
const TEXT_MODELS = [process.env.GEMINI_TEXT_MODEL, "gemini-3.5-flash", "gemini-2.5-flash"].filter(Boolean);
const cut = v => String(v || "").replace(/\s+/g, " ").trim().slice(0, 140);

async function makeLore(s) {
  const prompt = `The text below was planted as a ${TYPES[hash(s.text) % 5]} in a pixel-art cyberspace universe. Describe that world like a playful nature documentary. Reply with JSON only: {"name":"a unique 1 to 3 word name","weather":"one vivid sentence","life":"the wildlife, one vivid sentence","population":"a number and who they are","fact":"one surprising fun fact","song":{"tempo":90,"notes":[12 integers from 0 to 14, a short melody that fits the mood]}}. Every value under 140 characters. Never repeat real names, emails or addresses from the text.\nTEXT:\n${s.text.slice(0, 600)}`;
  for (const m of TEXT_MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GKEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 1, maxOutputTokens: 800, responseMimeType: "application/json" } }),
      signal: AbortSignal.timeout(60000)
    });
    const j = await r.json().catch(() => ({}));
    const t = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
    try {
      const o = JSON.parse(t);
      if (r.ok && o.name && o.weather && o.life) {
        const L = { name: cut(o.name).slice(0, 40), weather: cut(o.weather), life: cut(o.life), population: cut(o.population), fact: cut(o.fact) };
        if (Array.isArray(o.song?.notes) && o.song.notes.length >= 4)
          L.song = { tempo: Math.max(50, Math.min(160, +o.song.tempo || 90)), notes: o.song.notes.slice(0, 16).map(n => Math.max(0, Math.min(14, (+n) | 0))) };
        return L;
      }
    } catch {}
    console.log("lore model", m, "failed:", r.status, JSON.stringify(j.error || "").slice(0, 160));
  }
  throw new Error("lore failed");
}
let lored = 0;
if (GKEY) for (const s of uni) {
  if ((s.lore && s.lore.song) || (s.ltries || 0) >= 3) continue;
  if (lored++ >= MAX_PAINTS_PER_RUN) break;
  try { s.lore = await makeLore(s); delete s.ltries; } catch (e) { s.ltries = (s.ltries || 0) + 1; console.log("lore failed for", s.id, e.message); }
}
fs.writeFileSync(U, JSON.stringify(uni, null, 1) + "\n");
