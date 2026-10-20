// Cyber Galaxy front door.
//   POST /       {text}            opens the GitHub Issue that plants a star (as before)
//   POST /seed   {w,tx,ty,k,sp}    plants a seed of love in world "w" (stored in the same KV namespace)
//   GET  /seeds?w=<world>          everyone's seeds in that world
// Protections: only your site may call it, 3 stars per person per hour, a daily cap for everyone,
// 8 seeds per person per hour. Seeds carry no free text, only numbers, so there is nothing to moderate.
const WORLD_N = 96; // must match N in world.js

export default {
  async fetch(req, env) {
    const allowed = env.ALLOWED_ORIGIN; // e.g. https://yourname.github.io
    const cors = { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.headers.get("Origin") !== allowed) return json({ ok: false, error: "not allowed" }, 403);
    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    if (req.method === "GET" && path === "/seeds") return getSeeds(req, env, json);
    if (req.method === "POST" && path === "/seed") return postSeed(req, env, json);
    if (req.method === "POST" && path === "") return plantStar(req, env, json);
    return json({ ok: false, error: "not found" }, 404);
  }
};

const okWorld = w => /^[A-Za-z0-9._-]{1,48}$/.test(w);

async function getSeeds(req, env, json) {
  const w = new URL(req.url).searchParams.get("w") || "";
  if (!okWorld(w)) return json({ ok: false, error: "bad request" }, 400);
  let seeds = [];
  try { seeds = JSON.parse((await env.RL.get("seeds:" + w, { cacheTtl: 30 })) || "[]"); } catch {}
  return json({ ok: true, seeds });
}

async function postSeed(req, env, json) {
  let b; try { b = await req.json(); } catch { return json({ ok: false, error: "bad request" }, 400); }
  const w = String(b.w || ""), tx = +b.tx, ty = +b.ty, k = +b.k, sp = +b.sp;
  const int = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
  if (!okWorld(w) || !int(tx, WORLD_N - 1) || !int(ty, WORLD_N - 1) || !int(k, 5) || !int(sp, 7)) return json({ ok: false, error: "bad request" }, 400);

  const ip = req.headers.get("CF-Connecting-IP") || "x", hour = new Date().toISOString().slice(0, 13);
  const kIp = `sip:${ip}:${hour}`, nIp = +(await env.RL.get(kIp) || 0);
  if (nIp >= 8) return json({ ok: false, error: "You planted a lot of love this hour. Come back soon." }, 429);

  const key = "seeds:" + w;
  let arr = []; try { arr = JSON.parse((await env.RL.get(key)) || "[]"); } catch {}
  if (arr.some(s => s.tx === tx && s.ty === ty)) return json({ ok: false, error: "Something already grows there." }, 409);
  const seed = { id: crypto.randomUUID().slice(0, 8), tx, ty, k, sp, t: Date.now() }; // time is set here, so nobody can fake an old seed
  arr.push(seed); if (arr.length > 120) arr = arr.slice(-120);
  await env.RL.put(kIp, String(nIp + 1), { expirationTtl: 7200 });
  await env.RL.put(key, JSON.stringify(arr));
  return json({ ok: true, seed });
}

async function plantStar(req, env, json) {
  let text;
  try { text = String((await req.json()).text || "").trim(); } catch { return json({ ok: false, error: "bad request" }, 400); }
  text = text.replace(/`{3,}/g, "'''");
  if (text.length < 3 || text.length > 1500) return json({ ok: false, error: "Write between 3 and 1500 characters." }, 400);
  if ((text.match(/https?:\/\//g) || []).length > 2) return json({ ok: false, error: "Too many links." }, 400);

  const ip = req.headers.get("CF-Connecting-IP") || "x", hour = new Date().toISOString().slice(0, 13), day = hour.slice(0, 10);
  const kIp = `ip:${ip}:${hour}`, kDay = `day:${day}`;
  const nIp = +(await env.RL.get(kIp) || 0), nDay = +(await env.RL.get(kDay) || 0);
  if (nIp >= 3) return json({ ok: false, error: "You planted a lot this hour. Try again later." }, 429);
  if (nDay >= +(env.DAILY_CAP || 200)) return json({ ok: false, error: "The universe is full for today. Come back tomorrow." }, 429);
  await env.RL.put(kIp, String(nIp + 1), { expirationTtl: 7200 });
  await env.RL.put(kDay, String(nDay + 1), { expirationTtl: 172800 });

  const r = await fetch(`https://api.github.com/repos/${env.REPO}/issues`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "cyber-galaxy", Accept: "application/vnd.github+json" },
    body: JSON.stringify({ title: "New star: from the web", body: "```json\n" + JSON.stringify({ text }) + "\n```" })
  });
  return r.ok ? json({ ok: true }) : json({ ok: false, error: "The universe is busy. Try again soon." }, 502);
}
