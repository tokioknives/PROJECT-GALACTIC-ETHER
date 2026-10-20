# Account-free planting + shared love seeds (Cloudflare Worker, free)

Visitors plant stars with no GitHub account, and love seeds on planets are shared with everyone.

## 1. GitHub token (narrow on purpose)
GitHub > Settings > Developer settings > Personal access tokens > **Fine-grained tokens** > Generate.
- Repository access: **Only select repositories** > PROJECT-GALACTIC-ETHER
- Permissions: **Issues: Read and write** (nothing else)
- Expiration: 1 year (set a reminder, planting stops when it expires)

## 2. Create the Worker
cloudflare.com > **Workers & Pages** > **Create** > **Create Worker** > Deploy > **Edit code**. Delete the sample, paste all of `cloudflare-worker.js`, **Deploy**. (To update later: Edit code, paste the new file, Deploy. Your settings stay.)

## 3. Worker settings (Settings > Variables and Secrets)
- `REPO` = `tokioknives/PROJECT-GALACTIC-ETHER` (text)
- `ALLOWED_ORIGIN` = `https://tokioknives.github.io` (text, no slash at the end, no repo name)
- `DAILY_CAP` = `200` (text)
- `GITHUB_TOKEN` = your token (type **Secret**)

## 4. Storage
Storage & Databases > **KV** > create a namespace. Worker > Settings > Bindings > Add > **KV namespace** > variable name `RL`.
Free KV allows about 1,000 writes a day, shared by stars (2 each) and love seeds (1 each).

## 5. Connect the page
Copy the Worker address (like `https://name.you.workers.dev`) into `API_URL` in `index.html`, commit.

## Test
Plant a star on the site. A new Issue appears in the repo within a minute and the Action closes it. If planting says "not allowed", `ALLOWED_ORIGIN` is wrong.
