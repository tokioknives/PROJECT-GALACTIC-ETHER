# Account-free planting (Cloudflare Worker, free)

Visitors plant a star on your site, no GitHub account needed. The Worker opens the GitHub Issue for them using your token.

## 1. GitHub token (narrow on purpose)
GitHub > Settings > Developer settings > Personal access tokens > **Fine-grained tokens** > Generate.
- Repository access: **Only select repositories** > your cyber-galaxy repo
- Permissions: **Issues: Read and write** (nothing else)
- Expiration: 1 year (put a reminder to renew it)
Copy the token. Never put it in index.html.

## 2. Create the Worker
1. Sign up free at cloudflare.com > **Workers & Pages** > **Create** > **Create Worker** > Deploy > **Edit code**.
2. Delete the sample code, paste all of `cloudflare-worker.js`, click **Deploy**.

## 3. Settings for the Worker (Settings > Variables and Secrets)
- `REPO` = `yourname/cyber-galaxy` (text)
- `ALLOWED_ORIGIN` = `https://yourname.github.io` (text, exactly that, no slash at the end, no repo name)
- `DAILY_CAP` = `200` (text, the most stars the whole world can plant per day)
- `GITHUB_TOKEN` = the token from step 1 (type: **Secret**)

## 4. Rate-limit storage
Storage & Databases > **KV** > Create a namespace (any name). Then Worker > Settings > Bindings > Add > **KV namespace** > variable name `RL` > pick it.

## 5. Connect the page
Copy the Worker address (looks like `https://something.yourname.workers.dev`) into `API_URL` at the top of `index.html`.

## Test
Plant a star on your site. Within a minute a new Issue appears in your repo and the Action closes it. The star shows for everyone a few minutes later.
If planting says "not allowed", `ALLOWED_ORIGIN` is wrong.

---

# Open world update (walk on planets, plant love)

Files: `world.js` (new, next to index.html), `miracles.json` (new, repo root, starts as `{}`), `scripts/gods-play.mjs` (new), plus updated `index.html`, `cloudflare-worker.js`, `gods.yml`.

1. Put them in your repo (same places as the old ones) and commit.
2. Re-paste `cloudflare-worker.js` into your Worker and **Deploy**. Seeds reuse the same `RL` KV binding, so there is nothing new to set up.
3. Keep `API_URL` filled in `index.html`. Without it, love seeds only show for the person who planted them.
4. Run the **gods** workflow once ("Run workflow") to see the first gifts appear in `miracles.json`.

Cloudflare's free KV allows about 1,000 writes a day, shared with star planting. A star costs 2 writes, a seed costs 2. If you outgrow it, the paid plan is $5/month.
