// shark.js — the snarling shark marker. Faces +x; flip horizontally to head west.
// Globals: sharkSVG(), bearingWest()

function sharkSVG(scale, hot) {
  const c  = hot ? "#1a0608" : "#0c1014";
  const c2 = hot ? "#23090b" : "#121a20";
  return `
  <g class="body" transform="scale(${scale})">
    <!-- trailing wake -->
    <path d="M-46 0 Q-30 -3 -16 0 Q-30 3 -46 0 Z" fill="${hot?'#3a0a0c':'#16242b'}" opacity=".7"/>
    <!-- dorsal -->
    <path d="M-8 -7 Q-2 -26 12 -9 Z" fill="${c2}" stroke="#05080a" stroke-width=".6"/>
    <!-- upper body/head -->
    <path d="M-26 -2 Q-10 -13 16 -11 Q34 -9 44 -1
             L30 1 Q12 0 -2 4 Q-16 7 -26 5 Z" fill="${c}" stroke="#04070a" stroke-width=".8"/>
    <!-- lower jaw (animated on hover/select) -->
    <g class="jaw" style="transform-box:fill-box;transform-origin:18% 0%">
      <path d="M-2 4 Q16 8 30 6 Q40 6 45 2 Q34 16 14 15 Q2 14 -4 8 Z" fill="${c2}" stroke="#04070a" stroke-width=".7"/>
      <!-- lower teeth -->
      <path d="M2 9 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4"
            fill="none" stroke="#efe9da" stroke-width="1.3" stroke-linejoin="bevel"/>
    </g>
    <!-- upper teeth -->
    <path d="M2 3 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4"
          fill="none" stroke="#efe9da" stroke-width="1.3" stroke-linejoin="bevel"/>
    <!-- gills -->
    <g stroke="#04070a" stroke-width=".8" opacity=".8">
      <path d="M-16 -6 q-3 6 0 11"/><path d="M-11 -7 q-3 6 0 12"/><path d="M-6 -7 q-3 6 0 12"/>
    </g>
    <!-- eye: pissed -->
    <circle cx="20" cy="-5" r="3.1" fill="#e6201c"/>
    <circle cx="20.6" cy="-5" r="1.2" fill="#180202"/>
    <path d="M14 -8 L24 -6" stroke="#04070a" stroke-width="1.6" stroke-linecap="round"/>
    <!-- blood drip off jaw -->
    <path d="M40 6 q-1.4 6 0 9 q1.4 -3 0 -9 Z" fill="#b00710"/>
  </g>`;
}

// true if the shark's last leg trended west (so we mirror the marker)
function bearingWest(s) {
  const p = s.pings;
  if (!p || p.length < 2) return false;
  return (+p[p.length - 1].longitude) < (+p[p.length - 2].longitude);
}
