// jason.js — easter egg: a Jason Voorhees hockey mask at the real Camp Crystal
// Lake filming location (Camp No-Be-Bo-Sco, Blairstown NJ). Click for the lore.
// Uses globals map, L, inspect. Drawn as crisp SVG; auto-swaps to a transparent
// assets/jason.png if one is present.

const JASON_AT = [41.0614853, -74.9426717];

function jasonMaskSVG() {
  return `<svg viewBox="-17 -19 34 42" width="100%" height="100%">
    <defs><linearGradient id="jm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#efe9d6"/><stop offset=".5" stop-color="#ddd5bd"/><stop offset="1" stop-color="#b6ae92"/>
    </linearGradient></defs>
    <g class="jmask">
      <path d="M0 -16 C9 -16 13.5 -9 13.5 -2 C13.5 6 8 15 0 17.5 C-8 15 -13.5 6 -13.5 -2 C-13.5 -9 -9 -16 0 -16 Z"
            fill="url(#jm)" stroke="#2f2b1f" stroke-width="1.1"/>
      <path d="M0 -13 L4 -7 L-4 -7 Z" fill="#b30a12" opacity=".88"/>
      <path d="M-9 -6 Q-5.5 -8 -2 -6 M2 -6 Q5.5 -8 9 -6" stroke="#2f2b1f" stroke-width="1" fill="none" opacity=".5"/>
      <ellipse cx="-5.5" cy="-3" rx="2.7" ry="3.3" fill="#13100b"/>
      <ellipse cx="5.5" cy="-3" rx="2.7" ry="3.3" fill="#13100b"/>
      <path d="M-2.6 3 Q0 1.4 2.6 3 Q3.6 6 1.6 8 Q0 9.2 -1.6 8 Q-3.6 6 -2.6 3 Z" fill="#13100b"/>
      <path d="M-11 -1 l4 1.5 M-11 2 l4 1.4" stroke="#b30a12" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>
      <path d="M11 -1 l-4 1.5 M11 2 l-4 1.4" stroke="#b30a12" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>
      <g fill="#26210f">
        <circle cx="-8" cy="6" r="1"/><circle cx="-5" cy="9" r="1"/><circle cx="-2" cy="11" r="1"/>
        <circle cx="2" cy="11" r="1"/><circle cx="5" cy="9" r="1"/><circle cx="8" cy="6" r="1"/>
        <circle cx="-9.6" cy="2" r="1"/><circle cx="9.6" cy="2" r="1"/><circle cx="0" cy="13.5" r="1"/>
        <circle cx="-3" cy="-11" r=".85"/><circle cx="3" cy="-11" r=".85"/><circle cx="0" cy="-9.5" r=".85"/>
      </g>
      <path d="M-10 -9 q3 4 1 9" stroke="#7a0b10" stroke-width="1.6" fill="none" opacity=".7" stroke-linecap="round"/>
      <circle class="jbleed" cx="-8.6" cy="2.5" r="1.3" fill="#8c060b"/>
    </g>
  </svg>`;
}

const JASON_LORE =
  "Jason Voorhees drowned at Camp Crystal Lake in 1957 while the counselors who " +
  "should have been watching looked away. Years later his mother, Pamela, butchered " +
  "the camp's staff in revenge — and was beheaded for it. Jason, who never truly " +
  "died, saw. He returned to stalk anyone who set foot near 'Camp Blood' — first with " +
  "a burlap sack over his ruined face, then the white hockey mask he took off a victim " +
  "in 1984. Drowned, burned, electrocuted, blown apart, even dragged to Hell — he " +
  "always comes back. These coordinates mark Camp No-Be-Bo-Sco outside Blairstown, NJ: " +
  "the real lake where the legend was filmed.";

function initJason() {
  if (typeof map === "undefined" || !map) return;
  const icon = L.divIcon({
    className: "jason",
    html: `<img class="jimg" src="assets/jason.png" alt="" onerror="this.parentNode.innerHTML=jasonMaskSVG()">`,
    iconSize: [42, 50], iconAnchor: [21, 25],
  });
  L.marker(JASON_AT, { icon, zIndexOffset: 1000 })
    .bindTooltip("Camp Crystal Lake", { className: "telem-tip", direction: "top" })
    .on("click", () => inspect({
      kind: "Camp Crystal Lake · Friday the 13th", title: "Jason Voorhees",
      rows: [
        { k: "Alias", v: "The Camp Blood killer" },
        { k: "Origin", v: "Camp Crystal Lake, New Jersey", full: true },
        { k: "Drowned", v: "1957 (age ~11)" },
        { k: "Signature", v: "Machete + hockey goalie mask" },
        { k: "Mask since", v: "Friday the 13th Part III (1982)" },
        { k: "Status", v: "Undead · seemingly unkillable", color: "#e6201c" },
        { k: "Backstory", v: JASON_LORE, full: true },
      ],
      lat: JASON_AT[0], lon: JASON_AT[1],
      link: "https://en.wikipedia.org/wiki/Jason_Voorhees", linkLabel: "Wikipedia ↗",
    }))
    .addTo(map);
}
initJason();
