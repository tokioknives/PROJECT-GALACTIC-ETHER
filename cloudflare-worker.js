// Cyber Galaxy front door. Visitors POST {text}; this opens the same GitHub Issue the
// Share button would, using YOUR token, so the existing worker paints and saves it.
// Protections: only your site may call it, 3 stars per person per hour, a daily cap for everyone.
export default {
  async fetch(req, env) {
    const allowed = env.ALLOWED_ORIGIN; // e.g. https://yourname.github.io
    const cors = { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.headers.get("Origin") !== allowed) return json({ ok: false, error: "not allowed" }, 403);
    const url = new URL(req.url);

    // Love seeds: everyone who visits a planet sees everyone's seeds (max 150 per planet).
    if (url.pathname === "/seeds" && req.method === "GET") {
      const p = url.searchParams.get("p") || "";
      if (!/^[a-z0-9]{1,12}$/.test(p)) return json([], 400);
      const list = JSON.parse((await env.RL.get("seeds:" + p)) || "[]");
      return json(list.map(({ x, y, a, t }) => ({ x, y, a, t }))); // never reveal the hashed visitor id
    }
    if (url.pathname === "/seed" && req.method === "POST") {
      let b; try { b = await req.json(); } catch { return json({ ok: false }, 400); }
      const p = String(b.p || ""), x = +b.x, y = +b.y, a = b.a | 0;
      if (!/^[a-z0-9]{1,12}$/.test(p) || !(x >= 0 && x <= 768) || !(y >= 0 && y <= 768) || a < 0 || a > 5) return json({ ok: false, error: "bad seed" }, 400);
      let h = 2166136261; for (const c of (req.headers.get("CF-Connecting-IP") || "x")) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
      const who = (h >>> 0).toString(36), key = "seeds:" + p, now = Date.now();
      const list = JSON.parse((await env.RL.get(key)) || "[]");
      if (list.filter(s => s.i === who && now - s.t < 3600000).length >= 10) return json({ ok: false, error: "You planted a lot of love. Rest a bit!" }, 429);
      list.push({ x: Math.round(x), y: Math.round(y), a, t: now, i: who });
      await env.RL.put(key, JSON.stringify(list.slice(-150)));
      return json({ ok: true });
    }
    if (req.method !== "POST") return json({ ok: false, error: "not allowed" }, 403);

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
};
