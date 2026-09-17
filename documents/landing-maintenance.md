# ContaMì landing page

Static, bilingual site for ContaMì, publicly available only through the canonical address [contami.glaucosilvestri.it](https://contami.glaucosilvestri.it/). It uses only relative paths and local assets, with no CDN, remote fonts, analytics, cookies or third-party runtime services.

## Media

- PNG screenshots are the static and reduced-motion fallback.
- MP4 demonstrations are generated from the local GIF capture sources, use H.264 at 1280 px and are loaded with `preload="none"`.
- Source GIF files remain local and are ignored by Git because they are large production sources rather than deployable assets.
- Every capture must use synthetic data and must be reviewed for financial values, names and workbook paths before commit.

The shared brand icon has one canonical source: `assets/icon.png`. It must remain an 8-bit RGBA PNG with fully transparent corners. `docs/assets/contami-icon.png` is a byte-identical public copy, while the macOS application and DMG packaging also use the canonical source. Run `npm run test:landing` after changing either file; the validation rejects opaque corners or copies that have drifted apart.

To refresh an MP4 from its GIF source:

```powershell
ffmpeg -hide_banner -loglevel error -y -i docs\assets\example.gif -vf "fps=20,scale=1280:-2:flags=lanczos" -c:v libx264 -preset veryfast -crf 27 -pix_fmt yuv420p -movflags +faststart -an docs\assets\example.mp4
```

## Local preview

Start the dependency-free static server, which exposes only `docs/`:

```powershell
npm run preview:landing
```

Then open `http://127.0.0.1:4174/`. Do not open `index.html` directly with `file://`, because browser media and CSP behavior should be checked over HTTP.

Run `npm run test:landing` for the static contract and `npm run test:landing:e2e` for language detection, theme/media selection, video controls, keyboard focus and mobile overflow.

## Publication and custom domain

The canonical public URL is `https://contami.glaucosilvestri.it/`. Both the HTML canonical link and Open Graph URL must use that exact address, and documentation or public site code must not advertise an alternative Pages address. The site lives entirely under `docs/`, and `docs/CNAME` must contain exactly `contami.glaucosilvestri.it`; preserve that file when changing or rebuilding the landing.

GitHub Pages remains the deployment service. In the repository settings, select **Pages → Deploy from a branch → main → /docs** and keep the custom domain set to `contami.glaucosilvestri.it`. The `.nojekyll` marker keeps the deployment static; no repository-managed Pages workflow is required. Treat every file under `docs/` as public. Technical specifications and maintenance notes belong under `documents/` instead.

Files stored at the repository root are not published as part of the landing. Links from the landing to `ISTRUZIONI.md` and `INSTRUCTIONS.md` must therefore use their absolute GitHub `blob/main` URLs; `docs/app.js` selects the matching manual whenever the landing language changes. The home icon in the right side of the header links to `https://glaucosilvestri.it/` and must retain its localized accessible name.
