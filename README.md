# BLOODWATER

A horror-styled live shark tracker. **Real satellite imagery** color-graded dark
and bloody, photoreal (or vector-fallback) shark markers, blood-red migration
trails, blood-drip wordmark. JAWS-inspired in spirit, original art and branding
(no Universal trademarks — rename freely).

## Run it

Static site, no build step. The map pulls satellite tiles and Leaflet from CDNs,
so it needs an internet connection at runtime, but there's nothing to compile.

```bash
# any static server works; pick one
python3 -m http.server 8000
npx serve
# then open http://localhost:8000
```

On Windows with no Python/Node, a self-contained PowerShell dev server with
live-reload (`serve.ps1`, git-ignored) is handy: `pwsh -File serve.ps1`.

Opening `index.html` directly off the filesystem mostly works, but a server is
cleaner.

## Data

By default it tries the live OCEARCH endpoint, then falls back to a baked-in
**demo pod** of real well-known white sharks built on the exact OCEARCH schema.
The status chip (top-right) shows which feed is active.

The live endpoint is undocumented and serves plain `http`, so a browser will
usually block it (mixed content + CORS) and you'll land on the demo pod. To get
real data, run a tiny proxy that adds CORS headers and point `OCEARCH` in
`js/data.js` at it. Example (Node/Express):

```js
const express = require('express');
const app = express();
app.get('/sharks', async (req, res) => {
  const r = await fetch('http://www.ocearch.org/tracker/ajax/filter-sharks?tracking-activity=ping-most-recent');
  res.set('access-control-allow-origin', '*').json(await r.json());
});
app.listen(8787);
```

Then set `OCEARCH = "http://localhost:8787/sharks"`.

### Schema (per shark)

```
id, name, species, gender, stageOfLife, length, weight, tagDate, tagLocation,
pings: [ { latitude, longitude, tz_datetime } ]
```

Numbers come back as strings on the real feed; `length`/`weight` formatting is
inconsistent and `tz_datetime` is `"D MMM YYYY H:mm:ss ±ZZZZ"`. The demo pod
mirrors all of that so render code behaves the same on live data.

## Map & attribution

The basemap is **Esri World Imagery** served through [Leaflet](https://leafletjs.com/)
(both via CDN, pinned in `index.html`). Tiles are color-graded for the horror look
in CSS (`.leaflet-tile` filter + `.grade` overlay), not baked in. The required
attribution credit renders bottom-right. Check Esri's and Leaflet's terms before
any public/commercial use.

## Shark images

Markers use photoreal PNGs from `assets/sharks/` when present, falling back to a
built-in vector shark otherwise — see [`assets/sharks/README.md`](assets/sharks/README.md)
for file naming and image guidelines (top-down, transparent, nose up).

## Architecture

No bundler. Plain scripts share globals and load in order from `index.html`
(Leaflet loads first):

| file            | owns                                                        |
|-----------------|------------------------------------------------------------|
| `js/geo.js`     | month names + legacy equirectangular helpers (map now uses Leaflet) |
| `js/shark.js`   | vector fallback shark marker SVG + heading helper          |
| `js/data.js`    | OCEARCH loader, demo pod, schema helpers                   |
| `js/wordmark.js`| blood-drip title builder                                   |
| `js/app.js`     | Leaflet map, markers + gore, trails, dossier, controls, boot |
| `css/styles.css`| everything visual, incl. color-grade, animations + reduced-motion |

## Where to take it

- **Content** — real bios per shark, depth/temperature per ping, distance
  traveled, species beyond the big three.
- **Styling** — push the gnarly factor: chum clouds, blood-in-water diffusion,
  ambient dread pulse, distressed type treatment on the dossier.
- **UX** — search/jump to a shark, follow-cam that tracks one animal, time
  scrubber to replay a migration, mobile layout pass, keyboard nav.

## License

TBD. Code is yours to do as you like; OCEARCH data is theirs — check their terms
before any public/commercial use.
