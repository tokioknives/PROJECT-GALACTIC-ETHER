# Project Galactic Ether

A universe made of bits. Visitors plant text as stars, AI paints and describes each one, beings and gods create more, and everything is saved in this repo.

## Folder map (exact names matter)
| File | Where it goes |
|---|---|
| `index.html` | main folder |
| `universe.json` | main folder (starts as `[]`) |
| `README.md` | main folder |
| `plant-star.yml`, `being-dreams.yml`, `gods.yml` | `.github/workflows/` |
| `plant.mjs`, `beings.mjs`, `gods.mjs` | `scripts/` |
| `cloudflare-worker.js`, `worker/README.md` | `worker/` (only for copy-pasting into Cloudflare) |

If a download added " (2)" or " (3)" to a name, rename it. Names must match exactly.

## One-time settings
1. **Pages:** Settings > Pages > Deploy from a branch > `main` > `/ (root)`. Site: https://tokioknives.github.io/PROJECT-GALACTIC-ETHER/
2. **Actions:** Settings > Actions > General > Allow all actions, and Workflow permissions: **Read and write**.
3. **Secret:** Settings > Secrets and variables > Actions > New repository secret `GEMINI_API_KEY` (your Gemini key).
4. Open `index.html` and set `TIP_URL` and `API_URL` (see `worker/README.md`). `REPO` is already set.

## Test, in order
1. Actions tab > **being-dreams** > Run workflow (a being writes a star; it gets painted, named, given a song and creatures).
2. Run it 2 or 3 more times so older stars catch up (each run does a few).
3. Actions tab > **gods** > Run workflow (needs at least 3 stars).
4. Open the site. Click a star, then **Enter world**.

## Costs
Every star costs a text call and 2 image calls (painting + field guide plate), plus beings and gods. Set a budget alert in Google AI Studio. To skip plates, delete the "Field guide plates" block at the bottom of `scripts/plant.mjs`.

## Moderation
To remove a star: delete its entry in `universe.json` and its files in `stars/`.
