// inspector.js — universal click-to-inspect panel. Any map feature can call
// inspect({kind, title, rows:[{k,v,color?,full?}], lat, lon, link, linkLabel}).
// Sharks keep their richer dossier; the two panels are mutually exclusive.

function _ie(id) { return document.getElementById(id); }
function _iesc(s) { return String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

function inspect(o) {
  const el = _ie("inspector"); if (!el) return;
  const dz = _ie("dossier"); if (dz) dz.classList.remove("open");   // close shark dossier
  _ie("insp-kind").textContent = o.kind || "";
  _ie("insp-title").textContent = o.title || "";
  const rows = (o.rows || []).filter(r => r && r.v != null && r.v !== "" && r.v !== "—");
  _ie("insp-grid").innerHTML = rows.length
    ? rows.map(r => `<div class="cell${r.full ? " full" : ""}"><div class="k">${_iesc(r.k)}</div>` +
        `<div class="v" style="${r.color ? "color:" + r.color : ""}">${_iesc(r.v)}</div></div>`).join("")
    : `<div class="cell full"><div class="v">No additional detail.</div></div>`;
  let f = "";
  if (o.lat != null && o.lon != null) f += `<span class="ipos">${(+o.lat).toFixed(3)}, ${(+o.lon).toFixed(3)}</span>`;
  if (o.link) f += ` &nbsp;<a href="${o.link}" target="_blank" rel="noopener">${_iesc(o.linkLabel || "source ↗")}</a>`;
  _ie("insp-foot").innerHTML = f;
  el.classList.add("open");
}
function closeInspector() { const el = _ie("inspector"); if (el) el.classList.remove("open"); }

(function () { const x = _ie("insp-x"); if (x) x.onclick = closeInspector; })();
