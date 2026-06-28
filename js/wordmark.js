// wordmark.js — builds the blood-drip BLOODWATER title into #mark.
// Runs immediately; scripts are at end of <body> so #mark exists.

(function () {
  const word = "BLOODWATER";
  const drips = [[118,3.2,0],[206,4.6,1.1],[330,3.0,.5],[470,5.2,1.7],[612,3.4,.3],[754,4.4,.9]];
  let d = `<svg viewBox="0 0 880 96" xmlns="http://www.w3.org/2000/svg" aria-label="BLOODWATER">
    <defs>
      <linearGradient id="gore" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e6201c"/><stop offset=".55" stop-color="#bd0a13"/><stop offset="1" stop-color="#6e060b"/>
      </linearGradient>
      <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.04" numOctaves="2" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3"/></filter>
    </defs>
    <g filter="url(#rough)">
      <text x="2" y="64" font-family="Impact,'Arial Narrow Bold',sans-serif" font-size="74"
        letter-spacing="1" fill="url(#gore)" stroke="#3a0205" stroke-width="1">${word}</text>`;
  drips.forEach(([x, w, delay]) => {
    d += `<g class="drip" style="--dx:${delay}s">
      <path d="M${x} 60 q ${-w} 10 0 26 q ${w} -16 0 -26 Z" fill="url(#gore)"/>
      <circle class="bead" cx="${x}" cy="92" r="${w*0.9}" fill="#8c060b"/>
    </g>`;
  });
  d += `</g></svg>`;
  document.getElementById('mark').innerHTML = d;
})();
