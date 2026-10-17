# Cyber Galaxy

A universe made of bits. Visitors plant text as stars; an AI paints each one; every star is saved in this repo forever.

## Setup (once)
1. Upload everything here to a **public** repo. Keep the folder names (`.github/workflows`, `scripts`).
2. In `index.html`, set `CFG.REPO` (like `yourname/cyber-galaxy`), `CFG.BRANCH`, and `CFG.TIP_URL`.
3. Settings > Pages: deploy from the `main` branch, root folder.
4. Settings > Actions > General: set workflow permissions to **Read and write**.
5. Optional: Settings > Secrets > Actions: add `IMAGE_URL` (your own image service, with `{prompt}` and `{seed}`) and `IMAGE_AUTH`. Without them it uses a free default painter.

## How a star is born
Visitor plants a star, hits **Share**, submits the prefilled GitHub Issue. The Action paints it, saves `stars/<id>.jpg` and adds it to `universe.json`, then closes the issue. New stars show up for everyone within a few minutes.

## Moderation
To remove a star, delete its entry in `universe.json` and its file in `stars/`.
