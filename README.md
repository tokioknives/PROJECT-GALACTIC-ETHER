# Project Galactic Ether

A universe made of bits. Visitors plant text as stars, AI paints and describes each one, beings and gods create more, and you can land on any world, walk around, make friends with its creatures and plant seeds of love.

## Folder map (exact names matter)
| File | Where it goes |
|---|---|
| `index.html`, `world.js`, `universe.json`, `miracles.json`, `README.md` | main folder (`world.js` must sit next to `index.html`) |
| `plant-star.yml`, `being-dreams.yml`, `gods.yml` | `.github/workflows/` |
| `plant.mjs`, `beings.mjs`, `gods.mjs`, `gods-play.mjs` | `scripts/` |
| `cloudflare-worker.js`, `worker/README.md` | `worker/` (only for copy-pasting into Cloudflare) |

If a download added " (2)" or " (3)" to a name, rename it. Names must match exactly.

## One-time settings
1. **Pages:** Settings > Pages > Deploy from a branch > `main` > `/ (root)`. Site: https://tokioknives.github.io/PROJECT-GALACTIC-ETHER/
2. **Actions:** Settings > Actions > General > Allow all actions, and Workflow permissions: **Read and write**.
3. **Secret:** Settings > Secrets and variables > Actions > New repository secret `GEMINI_API_KEY`.
4. **Cloudflare Worker:** follow `worker/README.md`, then paste its address into `API_URL` in `index.html` (also set `TIP_URL`). Without the Worker, planting needs the Share button and love seeds are only visible to the person who planted them.

## Test, in order
1. Actions > **being-dreams** > Run workflow (a being writes a star; it gets painted, named, given a song and 3 creatures). Run it 2 or 3 times.
2. Actions > **gods** > Run workflow (a god fuses stars into a galaxy, then visits worlds and leaves gifts in `miracles.json`). Needs at least 3 stars.
3. Open the site. Fly with WASD or arrows (Shift = fast). Click a star, then **Land on this world**.

## Playing
- **Galaxy:** your alien flies at the center. Click any star to read it; press **E** near one to land. Search, zoom (+/-), minimap, and the gods drifting at the edge.
- **On a world:** WASD / arrows / tap to walk. **E** makes friends with a creature (it joins your **DEX** field guide) or touches a god's gift. **Space** plants love; **1-6** picks the kind of love. **Esc** returns to space.
- Love seeds grow with real time and are shared with everyone who visits that world.

## Costs
Each star costs a text call and 2 image calls (painting + field guide plate), plus beings and gods. Set a budget alert in Google AI Studio. To skip plates, delete the "Field guide plates" block at the bottom of `scripts/plant.mjs`.

## Moderation
To remove a star: delete its entry in `universe.json` and its files in `stars/`. To remove a god's gift: edit `miracles.json`.
