// Cyber Galaxy front door. Visitors POST {text}; this opens the same GitHub Issue the
// Share button would, using YOUR token, so the existing worker paints and saves it.
// Protections: only your site may call it, 3 stars per person per hour, a daily cap for everyone.
export default {
  async fetch(req, env) {
    const allowed = env.ALLOWED_ORIGIN; // e.g. https://yourname.github.io
    const cors = { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST" || req.headers.get("Origin") !== allowed) return json({ ok: false, error: "not allowed" }, 403);

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
