# Shark marker images

Drop your photoreal shark PNGs here and the map markers use them automatically.
Until a matching file exists, each marker falls back to the built-in vector shark,
so the app always works.

## File names (most specific wins)

For each shark the app looks for, in order (each name is tried as `.png`, `.webp`,
`.gif`, then `.svg`):

1. `assets/sharks/<id>.*`        — one specific shark (e.g. `1.png` = Mary Lee)
2. `assets/sharks/<species>.*`   — `white.*`, `tiger.*`, `mako.*`
3. `assets/sharks/default.*`     — catch-all
4. built-in vector shark         — if none of the above load

The quickest win: add **`white`**, **`tiger`**, **`mako`** (the demo pod is mostly
white sharks).

## Image guidelines

- **Format:** PNG, WebP, GIF, or SVG — anything with a **transparent background**
  (cut out, no sea/sky). **Not JPG** — it can't do transparency, so it'd show as a
  rectangular tile.
- **View:** **top-down** (looking straight down at the shark from above). The marker
  is rotated to point along the shark's direction of travel, so a top-down body
  reads correctly as it turns. Side-view photos will look tilted when rotated.
- **Orientation:** nose pointing **up** (toward the top of the image). Rotation is
  measured as a compass bearing from north, so "up = heading" keeps it accurate.
- **Size:** roughly square, ~256–512 px. Displayed at ~48 px, so detail beyond that
  is wasted.
- **Gore is added in code** (blood cloud, drip, glow on fresh kills) — the source
  image can be a clean shark; no need to pre-bloody it.

## Licensing

These files ship in a public repo. Use images you have the rights to publish
(your own, CC0/public-domain, or licensed). NOAA imagery is public domain.
