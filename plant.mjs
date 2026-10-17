// Plants a new star from a GitHub Issue, paints it, and saves everything in the repo.
// The issue body is untrusted: it is only parsed as JSON, never run or put in a shell.
import fs from "node:fs";

const U = "universe.json";
const DEF = "https://image.pollinations.ai/prompt/{prompt}?width=512&height=512&seed={seed}&nologo=true";
const tpl = process.env.IMAGE_URL || DEF, auth = process.env.IMAGE_AUTH;
const uni = fs.existsSync(U) ? JSON.parse(fs.readFileSync(U, "utf8")) : [];

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
  const url = tpl.replace("{prompt}", encodeURIComponent(prompt)).replace("{seed}", hash(s.text) % 100000);
  const r = await fetch(url, { headers: auth ? { Authorization: auth } : {}, signal: AbortSignal.timeout(90000) });
  const ct = r.headers.get("content-type") || "", buf = Buffer.from(await r.arrayBuffer());
  if (!r.ok || !ct.startsWith("image/") || buf.length < 1000 || buf.length > 3e6) throw new Error("bad image " + r.status);
  fs.mkdirSync("stars", { recursive: true });
  const f = `stars/${s.id}.${ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg"}`;
  fs.writeFileSync(f, buf);
  return f;
}

// paint the new star, and retry any older star that is still missing its painting
for (const s of uni) {
  if (s.img || (s.tries || 0) >= 5) continue;
  try { s.img = await paint(s); delete s.tries; }
  catch (e) { s.tries = (s.tries || 0) + 1; console.log("paint failed for", s.id, e.message); }
}
fs.writeFileSync(U, JSON.stringify(uni, null, 1) + "\n");
