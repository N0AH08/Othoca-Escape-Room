// Arredi dei laboratori, costruiti a partire dalle foto 360° (ogni funzione ritorna un gruppo centrato, rivolto verso +z).
import { THREE, B, C, S, plane, mat, M, canvasTex, textSign, PAL, screenMat } from "./world.js";

const G = () => new THREE.Group();
const basic = (tex, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ map: tex }, o));
const lit = (tex, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: tex, roughness: .7 }, o));

// ---------- generici ----------
export function table(w = 1.4, d = 0.7, top = M.lightwood, legs = M.darkgrey, h = 0.76) {
  const g = G(); B(g, 0, h - 0.02, 0, w, 0.04, d, top);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(g, x * (w / 2 - 0.05), (h - 0.04) / 2, z * (d / 2 - 0.05), 0.04, h - 0.04, 0.04, legs);
  return g;
}
export function chair(seat = M.black, frame = M.darkgrey) {
  const g = G(); B(g, 0, 0.45, 0, 0.42, 0.05, 0.42, seat); B(g, 0, 0.72, -0.19, 0.42, 0.42, 0.04, seat);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(g, x * 0.18, 0.22, z * 0.18, 0.03, 0.44, 0.03, frame);
  return g;
}
export function stool() { const g = G(); C(g, 0, 0.62, 0, 0.18, 0.06, M.orange); C(g, 0, 0.32, 0, 0.025, 0.6, M.steel); C(g, 0, 0.03, 0, 0.25, 0.04, M.darkgrey, 0.25, 5); return g; }
export function monitor(on = true, img = null) {
  const g = G(); B(g, 0, 0.02, 0, 0.22, 0.02, 0.16, M.black); B(g, 0, 0.15, -0.02, 0.04, 0.24, 0.03, M.black);
  B(g, 0, 0.34, 0, 0.56, 0.34, 0.03, M.black);
  plane(g, 0, 0.34, 0.017, 0.52, 0.3, img ? basic(img) : on ? screenMat() : M.screen);
  B(g, 0, 0.012, 0.22, 0.44, 0.02, 0.14, M.darkgrey); // tastiera
  return g;
}
export function whiteboard(w = 1.8, h = 1.1, tex = null) {
  const g = G(); B(g, 0, 0, 0, w + 0.06, h + 0.06, 0.03, M.grey); plane(g, 0, 0, 0.017, w, h, tex ? lit(tex) : mat(0xffffff, { rough: .25 }));
  B(g, 0, -h / 2 - 0.05, 0.05, w * 0.8, 0.03, 0.08, M.grey); return g;
}
export function poster(tex, w = 0.8, h = 1.1, frame = true) { const g = G(); if (frame) B(g, 0, 0, -0.01, w + 0.05, h + 0.05, 0.02, M.darkgrey, false); plane(g, 0, 0, 0.005, w, h, lit(tex, { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.22 })); return g; }
export function tv(w = 1.3, img = null, stand = true) {
  const g = G(); const y = stand ? 1.45 : 0;
  B(g, 0, y, 0, w, w * 0.58, 0.06, M.black); plane(g, 0, y, 0.031, w - 0.06, w * 0.58 - 0.06, img ? basic(img) : screenMat());
  if (stand) { B(g, 0, 0.7, -0.04, 0.08, 1.2, 0.06, M.darkgrey); B(g, 0, 0.03, 0, 0.8, 0.04, 0.5, M.darkgrey); }
  return g;
}
export function bin(color = M.blue) { const g = G(); C(g, 0, 0.35, 0, 0.2, 0.7, color, 0.17); return g; }
export function extinguisher() { const g = G(); C(g, 0, 0.32, 0, 0.09, 0.6, M.red); C(g, 0, 0.67, 0, 0.03, 0.1, M.black); return g; }
export function plant() { const g = G(); C(g, 0, 0.25, 0, 0.18, 0.5, mat(0x8d6e63), 0.14); for (let i = 0; i < 6; i++) { const l = S(g, Math.cos(i) * 0.12, 0.7 + (i % 3) * 0.12, Math.sin(i) * 0.12, 0.16, mat(0x3f8f4a)); l.scale.y = 1.3; } return g; }

// ---------- chimica ----------
export function labBench(w = 3, d = 1.3, island = true) {
  const g = G(); const h = 0.92;
  B(g, 0, h, 0, w, 0.05, d, M.labTop);
  B(g, 0, (h - 0.1) / 2 + 0.05, 0, w - 0.1, h - 0.1, d - 0.1, M.white);
  for (let i = 0; i < Math.floor(w / 0.6); i++) {
    const x = -w / 2 + 0.3 + i * 0.6 + 0.02;
    B(g, x, h - 0.35, d / 2 - 0.04, 0.55, 0.5, 0.02, M.mint, false);
    if (island) B(g, x, h - 0.35, -d / 2 + 0.04, 0.55, 0.5, 0.02, M.mint, false);
    B(g, x, h - 0.18, d / 2 - 0.02, 0.18, 0.03, 0.03, M.steel, false);
  }
  B(g, 0, 0.04, 0, w - 0.2, 0.08, d - 0.2, M.darkgrey, false);
  // rubinetti e prese centrali
  if (island) for (let x = -w / 2 + 0.6; x < w / 2; x += 1.2) { C(g, x, h + 0.15, 0, 0.02, 0.3, M.steel); B(g, x, h + 0.3, 0.06, 0.03, 0.03, 0.14, M.steel); }
  return g;
}
export function glassCabinet(w = 2.4, h = 2.3, d = 0.5, fill = true) {
  const g = G(); B(g, 0, h / 2, 0, w, h, d, M.cream);
  const cols = Math.max(2, Math.round(w / 0.6)); const cw = w / cols;
  for (let i = 0; i < cols; i++) {
    const x = -w / 2 + cw * (i + 0.5);
    B(g, x, h * 0.66, d / 2 + 0.005, cw - 0.06, h * 0.55, 0.01, M.glass, false);
    B(g, x, h * 0.2, d / 2 + 0.01, cw - 0.06, h * 0.32, 0.01, M.creamDark, false);
    if (fill) for (let s = 0; s < 3; s++) for (let k = 0; k < 4; k++) {
      const colors = [0x8fc9e8, 0xf4f4f4, 0xb84a3c, 0xf2c21b, 0x6a9f58, 0x7a5aa6];
      const c = colors[(i * 7 + s * 3 + k) % colors.length];
      C(g, x - cw / 2 + 0.12 + k * (cw - 0.2) / 3, h * 0.44 + s * h * 0.18 + 0.07, 0, 0.04, 0.14, mat(c), 0.04, 8);
    }
  }
  return g;
}
export function fumeHood(w = 1.8, photo = null) {
  const g = G(); B(g, 0, 0.45, 0, w, 0.9, 0.8, M.white); B(g, 0, 0.92, 0, w, 0.04, 0.8, M.labTop);
  B(g, -w / 2 + 0.05, 1.5, 0, 0.1, 1.2, 0.8, M.white); B(g, w / 2 - 0.05, 1.5, 0, 0.1, 1.2, 0.8, M.white);
  B(g, 0, 2.2, 0, w, 0.3, 0.8, M.white); B(g, 0, 1.45, -0.38, w, 1.1, 0.04, mat(0xe7ecef));
  B(g, 0, 1.4, 0.39, w - 0.2, 0.9, 0.02, M.glass, false); B(g, 0, 2.6, -0.1, 0.4, 0.5, 0.4, M.grey);
  if (photo) { const t = photoTex(photo); plane(g, 0, 1.2, 0.405, w, 2.3, new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.15 })); }
  return g;
}
export function safetyCabinet() { const g = G(); B(g, 0, 0.95, 0, 1.1, 1.9, 0.6, M.yellow); B(g, 0, 1.2, 0.305, 0.02, 1.5, 0.01, M.black, false); const t = textSign("infiamm", "🔥 INFIAMMABILI", { bg: "#f2c21b", fg: "#111", font: "bold 48px Inter" }); plane(g, 0, 1.55, 0.306, 0.7, 0.18, basic(t)); return g; }
export function testTubeRack(colors) {
  const g = G(); B(g, 0, 0.05, 0, 0.5, 0.1, 0.14, M.wood); B(g, 0, 0.16, 0, 0.5, 0.02, 0.14, M.wood);
  colors.forEach((c, i) => { const x = -0.18 + i * (0.36 / Math.max(1, colors.length - 1)); C(g, x, 0.18, 0, 0.022, 0.26, M.glass, 0.022, 10); C(g, x, 0.12, 0, 0.019, 0.13, mat(c, { emissive: c, ei: 0.25 }), 0.019, 10); });
  return g;
}
export function flask(color = 0x66bb6a) { const g = G(); const b = S(g, 0, 0.09, 0, 0.09, M.glass); b.scale.y = 0.9; S(g, 0, 0.08, 0, 0.075, mat(color, { emissive: color, ei: 0.2 })); C(g, 0, 0.22, 0, 0.025, 0.14, M.glass); return g; }
export function phChartTex() {
  return canvasTex("phchart", 512, 700, (g, w, h) => {
    g.fillStyle = "#fffdf6"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#1a237e"; g.font = "800 46px Inter"; g.textAlign = "center"; g.fillText("SCALA DEL pH", w / 2, 64);
    g.font = "500 22px Inter"; g.fillStyle = "#444"; g.fillText("colore dell'indicatore universale", w / 2, 98);
    const rows = [["#e53935", "1", "acido forte"], ["#fb8c00", "4", "acido debole"], ["#43a047", "7", "neutro"], ["#1e88e5", "10", "basico"], ["#6a1b9a", "13", "basico forte"]];
    rows.forEach(([c, n, t], i) => { const y = 130 + i * 106; g.fillStyle = c; g.fillRect(40, y, 120, 86); g.fillStyle = "#111"; g.font = "800 60px Inter"; g.textAlign = "left"; g.fillText("pH " + n, 190, y + 52); g.font = "500 24px Inter"; g.fillStyle = "#555"; g.fillText(t, 192, y + 80); });
  });
}

// ---------- officina / torneria ----------
export function lathe() {
  const g = G(); const mm = M.machine, md = M.machineDark;
  B(g, 0, 0.45, 0, 2.1, 0.9, 0.55, md); B(g, 0, 0.98, 0, 2.2, 0.16, 0.5, mm);
  B(g, -0.82, 1.3, 0, 0.55, 0.5, 0.55, mm); C(g, -0.5, 1.28, 0, 0.13, 0.12, M.steel).rotation.z = Math.PI / 2;
  B(g, 0.85, 1.22, 0, 0.32, 0.32, 0.36, mm); C(g, 0.25, 1.28, 0, 0.025, 1.3, M.steel).rotation.z = Math.PI / 2;
  B(g, 0.1, 1.12, 0.12, 0.35, 0.12, 0.3, md); B(g, -0.82, 1.62, 0.3, 0.4, 0.06, 0.04, mat(0xffffff, { unique: true }));
  B(g, -0.4, 0.75, 0.29, 0.5, 0.25, 0.04, mat(0xf1f1f1));
  C(g, -0.95, 1.25, 0.32, 0.09, 0.04, M.red).rotation.x = Math.PI / 2;
  return g;
}
export function mill() {
  const g = G(); B(g, 0, 0.5, 0, 0.8, 1, 0.7, M.machineDark); B(g, 0, 1.05, 0.15, 1.2, 0.12, 0.45, M.machine);
  B(g, 0, 1.6, -0.2, 0.55, 1.1, 0.5, M.machine); B(g, 0, 2.05, 0.15, 0.4, 0.4, 0.6, M.machine); C(g, 0, 1.6, 0.35, 0.06, 0.4, M.steel);
  C(g, 0.62, 1.05, 0.15, 0.08, 0.04, M.steel).rotation.z = Math.PI / 2; return g;
}
export function drillPress() { const g = G(); C(g, 0, 0.05, 0, 0.25, 0.1, M.machineDark, 0.25, 6); C(g, 0, 0.9, -0.1, 0.05, 1.8, M.steel); B(g, 0, 0.9, 0.08, 0.35, 0.05, 0.35, M.machine); B(g, 0, 1.75, 0.05, 0.3, 0.35, 0.45, M.machine); C(g, 0, 1.5, 0.18, 0.02, 0.2, M.steel); return g; }
export function cnc() {
  const g = G(); B(g, 0, 0.95, 0, 1.8, 1.9, 1.1, mat(0x2b6cb0)); B(g, -0.15, 1.15, 0.555, 1.1, 0.8, 0.02, M.glass, false);
  B(g, 0.7, 1.3, 0.6, 0.35, 0.6, 0.12, M.darkgrey); plane(g, 0.7, 1.42, 0.661, 0.28, 0.2, mat(0x1b5e20, { emissive: 0x1b8e3a, ei: 0.7 }));
  const t = textSign("cnc", "CNC", { bg: "#2b6cb0", font: "bold 80px Inter" }); plane(g, -0.15, 1.75, 0.555, 0.5, 0.15, basic(t)); return g;
}
export function workbench(w = 2) { const g = table(w, 0.75, M.wood, M.machineDark, 0.9); B(g, -w / 2 + 0.2, 1.0, 0, 0.18, 0.14, 0.16, M.grey); B(g, 0, 1.3, -0.36, w, 0.7, 0.03, mat(0x7b8a8f)); for (let i = 0; i < 6; i++) B(g, -w / 2 + 0.25 + i * (w - 0.5) / 5, 1.3, -0.33, 0.05, 0.3, 0.02, M.steel, false); return g; }
export function pallet(w = 1.4, d = 0.9) { const g = G(); for (let i = 0; i < 7; i++) B(g, -w / 2 + 0.1 + i * (w - 0.2) / 6, 0.05, 0, 0.12, 0.04, d, M.pallet); B(g, 0, 0.015, 0, w, 0.03, 0.1, M.pallet); return g; }
export function toolCabinet(color = M.machineDark) { const g = G(); B(g, 0, 0.55, 0, 0.8, 1.1, 0.6, color); for (let i = 0; i < 5; i++) B(g, 0, 0.18 + i * 0.2, 0.305, 0.7, 0.16, 0.01, mat(0x5f7f75), false); return g; }
export function drawingTex() {
  return canvasTex("drawing", 700, 500, (g, w, h) => {
    g.fillStyle = "#eef3fb"; g.fillRect(0, 0, w, h); g.strokeStyle = "#1a3d7c"; g.lineWidth = 4; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = "#1a3d7c"; g.font = "800 30px Inter"; g.fillText("PERNO Ø 30 — DISEGNO TECNICO", 40, 60);
    // profilo del pezzo: tre tratti
    g.lineWidth = 5; g.strokeStyle = "#0d2350";
    const y0 = 230; const segs = [[60, 50, 25], [60 + 150, 90, 40], [60 + 150 + 240, 60, 15]];
    // tratto 1 (Ø 50, 25mm) tratto 2 (Ø 90, 40mm) tratto 3 (Ø 60, 15mm) -> lunghezze 150,240,90 px
    const px = [150, 240, 90]; let x = 60;
    segs.forEach(([, d], i) => { g.strokeRect(x, y0 - d / 2, px[i], d); x += px[i]; });
    g.setLineDash([12, 8]); g.lineWidth = 2; g.beginPath(); g.moveTo(40, y0); g.lineTo(x + 30, y0); g.stroke(); g.setLineDash([]);
    // quote
    g.font = "700 26px Inter"; g.fillStyle = "#c62828"; g.strokeStyle = "#c62828"; g.lineWidth = 2;
    x = 60; const ql = ["25", "40", "15"];
    px.forEach((p, i) => { g.beginPath(); g.moveTo(x, 330); g.lineTo(x + p, 330); g.stroke(); g.fillText(ql[i] + " mm", x + p / 2 - 34, 360); x += p; });
    g.beginPath(); g.moveTo(60, 400); g.lineTo(x, 400); g.stroke(); g.fillText("L = ?", (60 + x) / 2 - 30, 432);
    g.fillStyle = "#1a3d7c"; g.font = "500 20px Inter"; g.fillText("Quote in millimetri · tolleranza ±0,1", 40, h - 34);
  });
}

// ---------- pneumatica ----------
export function pneumaticPanel(photo = null) {
  const g = G(); B(g, 0, 0.4, 0, 1.4, 0.8, 0.7, M.blue); B(g, 0, 0.82, 0, 1.5, 0.04, 0.75, mat(0x6b7d4a));
  B(g, 0, 1.45, -0.2, 1.4, 1.2, 0.05, mat(0x9b2226));
  if (photo) { const t = photoTex(photo); plane(g, 0, 1.45, -0.172, 1.38, 1.18, new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.2 })); return g; }
  for (let i = 0; i < 6; i++) B(g, 0, 0.95 + i * 0.2, -0.17, 1.35, 0.02, 0.02, M.steel, false);
  // componenti: cilindri e valvole
  C(g, -0.35, 1.55, -0.12, 0.05, 0.45, M.steel).rotation.z = Math.PI / 2; C(g, 0.3, 1.25, -0.12, 0.04, 0.35, M.steel).rotation.z = Math.PI / 2;
  B(g, 0.35, 1.65, -0.13, 0.18, 0.1, 0.06, M.black); B(g, -0.3, 1.15, -0.13, 0.16, 0.1, 0.06, M.blue);
  for (let i = 0; i < 4; i++) { const tube = new THREE.Mesh(new THREE.TorusGeometry(0.15 + i * 0.05, 0.008, 6, 16, Math.PI), mat([0x1e88e5, 0x111111, 0x1e88e5, 0xd32f2f][i])); tube.position.set(-0.1 + i * 0.08, 1.35, -0.11); g.add(tube); }
  return g;
}
export function compressor() { const g = G(); const t = C(g, 0, 0.3, 0, 0.18, 0.7, M.red); t.rotation.z = Math.PI / 2; B(g, 0.05, 0.55, 0, 0.35, 0.2, 0.25, M.black); C(g, -0.25, 0.08, 0.12, 0.06, 0.04, M.black).rotation.x = Math.PI / 2; C(g, -0.25, 0.08, -0.12, 0.06, 0.04, M.black).rotation.x = Math.PI / 2; C(g, 0.2, 0.68, 0.1, 0.05, 0.02, mat(0xffffff)).rotation.x = Math.PI / 2; return g; }
export function conveyor() { const g = G(); B(g, 0, 0.75, 0, 1.2, 0.08, 0.3, M.black); C(g, -0.6, 0.75, 0, 0.05, 0.3, M.steel).rotation.x = Math.PI / 2; C(g, 0.6, 0.75, 0, 0.05, 0.3, M.steel).rotation.x = Math.PI / 2; B(g, 0, 0.35, 0, 1.1, 0.7, 0.05, M.grey); return g; }
export function schemaTex() {
  return canvasTex("schema", 700, 500, (g, w, h) => {
    g.fillStyle = "#fffef8"; g.fillRect(0, 0, w, h); g.fillStyle = "#9b2226"; g.font = "800 32px Inter"; g.fillText("SCHEMA PNEUMATICO", 30, 52);
    const box = (x, y, t, c) => { g.fillStyle = c; g.fillRect(x, y, 170, 80); g.fillStyle = "#fff"; g.font = "700 22px Inter"; g.textAlign = "center"; g.fillText(t, x + 85, y + 48); g.textAlign = "left"; };
    box(40, 110, "COMPRESSORE", "#c62828"); box(270, 110, "FILTRO", "#555"); box(500, 110, "VALVOLA 5/2", "#1565c0"); box(500, 330, "CILINDRO", "#2e7d32");
    g.lineWidth = 8; const arrow = (x1, y1, x2, y2, c) => { g.strokeStyle = c; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    arrow(210, 150, 270, 150, "#1e88e5"); arrow(440, 150, 500, 150, "#1e88e5"); arrow(585, 190, 585, 330, "#111");
    g.fillStyle = "#333"; g.font = "500 20px Inter"; g.fillText("tubo BLU = aria in pressione · tubo NERO = comando", 30, h - 70);
    g.fillText("Collega i componenti nell'ordine dell'aria.", 30, h - 40);
  });
}

// ---------- ZooMate ----------
export function museumScreen(color = M.orange, img = null) {
  const g = G(); B(g, 0, 1.45, 0.05, 1.5, 1.1, 0.16, color); B(g, 0, 0.5, 0.05, 0.16, 1.0, 0.12, color); B(g, 0, 0.5, 0.05, 1.5, 0.06, 0.16, color);
  plane(g, 0, 1.45, 0.135, 1.1, 0.7, img ? basic(img) : mat(0x1b6e3a, { emissive: 0x1b8e4a, ei: 0.6 }));
  return g;
}
export function reeds() { const g = G(); C(g, 0, 0.3, 0, 0.16, 0.6, mat(0xb08a5a), 0.13); for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 0.05; const st = C(g, Math.cos(a) * r, 1.0, Math.sin(a) * r, 0.008, 1.0, mat(0xc9a86a)); st.rotation.set(Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15); const pl = S(g, Math.cos(a) * r * 3, 1.55, Math.sin(a) * r * 3, 0.06, mat(0xe6d3a3)); pl.scale.set(0.8, 3, 0.8); } return g; }
export function touchTable(img = null) { const g = G(); const base = S(g, 0, 0.35, 0, 0.5, M.white); base.scale.set(1.2, 0.7, 0.8); B(g, 0, 0.72, 0, 1.2, 0.1, 0.7, M.white); plane(g, 0, 0.775, 0, 1.0, 0.55, img ? basic(img) : mat(0x2f80c0, { emissive: 0x2070b0, ei: 0.7 }), 0, -Math.PI / 2); return g; }
export function partition(w = 2.4, h = 2.6) { const g = G(); B(g, 0, h / 2, 0, w, h, 0.1, M.white); B(g, -w / 2, h / 2, 0, 0.04, h, 0.12, M.grey); B(g, w / 2, h / 2, 0, 0.04, h, 0.12, M.grey); return g; }
export function birdTex(kind) {
  return canvasTex("bird" + kind, 420, 300, (g, w, h) => {
    const sky = { fenicottero: ["#9ec9e8", "#e8a5a0"], airone: ["#b9d7c6", "#5f8f6f"], folaga: ["#a7c4dd", "#3d6c8f"], cavaliere: ["#d9e9f2", "#88a9bf"] }[kind];
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.lineCap = "round";
    if (kind === "fenicottero") { g.fillStyle = "#f48fb1"; g.beginPath(); g.ellipse(210, 130, 70, 40, 0, 0, 7); g.fill(); g.strokeStyle = "#f48fb1"; g.lineWidth = 14; g.beginPath(); g.moveTo(260, 115); g.quadraticCurveTo(330, 40, 290, 30); g.stroke(); g.fillStyle = "#222"; g.beginPath(); g.moveTo(285, 25); g.lineTo(315, 40); g.lineTo(290, 40); g.fill(); g.strokeStyle = "#e57399"; g.lineWidth = 6; g.beginPath(); g.moveTo(200, 165); g.lineTo(195, 280); g.moveTo(220, 165); g.lineTo(235, 280); g.stroke(); }
    if (kind === "airone") { g.fillStyle = "#eceff1"; g.beginPath(); g.ellipse(200, 150, 60, 34, -0.3, 0, 7); g.fill(); g.strokeStyle = "#eceff1"; g.lineWidth = 12; g.beginPath(); g.moveTo(240, 130); g.quadraticCurveTo(250, 60, 280, 60); g.stroke(); g.strokeStyle = "#f2c21b"; g.lineWidth = 5; g.beginPath(); g.moveTo(285, 60); g.lineTo(330, 70); g.stroke(); g.strokeStyle = "#333"; g.lineWidth = 5; g.beginPath(); g.moveTo(190, 180); g.lineTo(185, 280); g.moveTo(210, 180); g.lineTo(220, 280); g.stroke(); }
    if (kind === "folaga") { g.fillStyle = "#263238"; g.beginPath(); g.ellipse(200, 200, 80, 40, 0, 0, 7); g.fill(); g.beginPath(); g.arc(275, 165, 28, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.ellipse(298, 168, 12, 9, 0, 0, 7); g.fill(); g.fillStyle = "#2e6f9e"; g.fillRect(0, 225, w, 75); }
    if (kind === "cavaliere") { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(200, 120, 60, 28, 0, 0, 7); g.fill(); g.fillStyle = "#222"; g.beginPath(); g.ellipse(190, 110, 55, 16, 0, 0, 7); g.fill(); g.strokeStyle = "#e91e63"; g.lineWidth = 4; g.beginPath(); g.moveTo(190, 140); g.lineTo(180, 290); g.moveTo(210, 140); g.lineTo(225, 290); g.stroke(); g.strokeStyle = "#111"; g.beginPath(); g.moveTo(258, 110); g.lineTo(300, 112); g.stroke(); }
  });
}

// ---------- informatica B09 ----------
export function hexTable(n = 6) {
  const g = G(); const top = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.05, 6), M.white); top.position.y = 0.74; top.castShadow = true; top.receiveShadow = true; g.add(top);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.03, 6), M.teal); edge.position.y = 0.72; g.add(edge);
  C(g, 0, 0.36, 0, 0.06, 0.72, M.grey);
  const cols = [0x26a69a, 0xffa726, 0x1e88e5, 0x26a69a, 0xffa726, 0x1e88e5];
  for (let i = 0; i < n; i++) {
    const a = i * Math.PI / 3 + Math.PI / 6; const x = Math.sin(a), z = Math.cos(a);
    const lap = G(); B(lap, 0, 0.77, 0, 0.34, 0.02, 0.24, M.darkgrey); const sc = B(lap, 0, 0.88, -0.11, 0.34, 0.22, 0.015, M.darkgrey); sc.rotation.x = -0.25;
    plane(lap, 0, 0.88, -0.1, 0.3, 0.18, mat(0x3a6ea5, { emissive: 0x2a5e95, ei: 0.6 }), 0, -0.25);
    lap.position.set(x * 0.62, 0, z * 0.62); lap.rotation.y = a; g.add(lap);
    const ch = chair(mat(cols[i]), M.grey); ch.position.set(x * 1.35, 0, z * 1.35); ch.rotation.y = a + Math.PI; g.add(ch);
  }
  return g;
}
export function printer3D(on = false) {
  const g = G(); B(g, 0, 0.05, 0, 0.5, 0.1, 0.45, M.black); B(g, -0.22, 0.35, 0, 0.04, 0.6, 0.04, M.black); B(g, 0.22, 0.35, 0, 0.04, 0.6, 0.04, M.black);
  B(g, 0, 0.64, 0, 0.5, 0.04, 0.04, M.black); B(g, 0, 0.42, 0.04, 0.08, 0.08, 0.08, M.darkgrey); B(g, 0, 0.12, 0, 0.36, 0.02, 0.36, mat(0x444444));
  C(g, -0.18, 0.78, -0.1, 0.07, 0.07, mat(0xf0559a)).rotation.x = Math.PI / 2; return g;
}
export function sofa(color = 0x2b2b30) { const g = G(); const m = mat(color, { rough: .9 }); B(g, 0, 0.25, 0, 1.6, 0.4, 0.8, m); B(g, 0, 0.6, -0.32, 1.6, 0.5, 0.16, m); B(g, -0.75, 0.45, 0, 0.12, 0.3, 0.8, m); B(g, 0.75, 0.45, 0, 0.12, 0.3, 0.8, m); return g; }
export function shelfUnit(color = M.orange, w = 0.9, h = 1.6) { const g = G(); B(g, 0, h / 2, 0, w, h, 0.4, color); for (let i = 1; i < 4; i++) B(g, 0, i * h / 4, 0.03, w - 0.06, 0.02, 0.36, M.white, false); for (let i = 0; i < 5; i++) B(g, -w / 2 + 0.15 + i * 0.15, h / 4 + 0.15, 0.05, 0.08, 0.26, 0.2, mat([0x1e88e5, 0xfdd835, 0x43a047, 0xe53935, 0x8e24aa][i]), false); return g; }
export function postIt(text, color = "#fff176") {
  const tex = canvasTex("postit" + text, 256, 256, (g, w, h) => { g.fillStyle = color; g.fillRect(0, 0, w, h); g.fillStyle = "#333"; g.font = "600 34px 'Comic Sans MS', 'Baloo 2', cursive"; g.textAlign = "center"; text.split("\n").forEach((l, i, a) => g.fillText(l, w / 2, h / 2 + (i - (a.length - 1) / 2) * 42)); });
  const g = G(); plane(g, 0, 0, 0, 0.12, 0.12, basic(tex, { side: THREE.DoubleSide })); return g;
}

// ---------- aula ----------
export function schoolDesk() { const g = G(); const d = table(0.7, 0.5, M.lightwood, mat(0x5c5f66), 0.74); g.add(d); const c = chair(M.lightwood, mat(0x5c5f66)); c.position.set(0, 0, 0.5); c.rotation.y = Math.PI; g.add(c); return g; }
export function teacherDesk() { const g = G(); B(g, 0, 0.74, 0, 1.5, 0.05, 0.75, M.lightwood); B(g, -0.7, 0.37, 0, 0.06, 0.72, 0.7, M.lightwood); B(g, 0.7, 0.37, 0, 0.06, 0.72, 0.7, M.lightwood); B(g, 0, 0.45, -0.34, 1.4, 0.5, 0.03, M.lightwood); B(g, 0.45, 0.6, 0.2, 0.45, 0.2, 0.3, mat(0xc9a06a)); return g; }
export function lim(tex = null) { const g = G(); B(g, 0, 0, 0, 1.75, 1.15, 0.06, M.grey); plane(g, 0, 0, 0.031, 1.65, 1.05, tex ? lit(tex) : mat(0xffffff, { rough: .3 })); B(g, 0, 0.75, 0.4, 0.3, 0.12, 0.25, M.white); B(g, 0, 0.68, 0.2, 0.04, 0.04, 0.45, M.grey); return g; }
export function locker() { const g = G(); B(g, 0, 1.0, 0, 0.9, 2.0, 0.5, mat(0xc9cbc6)); B(g, 0, 1.0, 0.255, 0.02, 1.9, 0.01, M.grey, false); return g; }
export function mapTex() {
  return canvasTex("mappaitalia", 700, 500, (g, w, h) => {
    g.fillStyle = "#cfe8f7"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#c5d99a"; g.beginPath(); // stivale stilizzato
    const pts = [[300, 40], [380, 60], [420, 130], [400, 190], [450, 260], [520, 330], [560, 400], [520, 420], [470, 370], [420, 320], [360, 260], [320, 190], [270, 140], [250, 80]];
    g.moveTo(...pts[0]); pts.forEach((p) => g.lineTo(...p)); g.closePath(); g.fill(); g.strokeStyle = "#7a8f55"; g.lineWidth = 3; g.stroke();
    g.beginPath(); g.ellipse(200, 340, 45, 75, 0, 0, 7); g.fill(); g.stroke(); // Sardegna
    g.beginPath(); g.ellipse(470, 455, 55, 24, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#c62828"; g.beginPath(); g.arc(180, 345, 9, 0, 7); g.fill();
    g.fillStyle = "#111"; g.font = "700 22px Inter"; g.fillText("Oristano", 95, 352);
    g.font = "800 28px Inter"; g.fillStyle = "#1a237e"; g.fillText("ITALIA", 40, 50);
    g.font = "600 20px Inter"; g.fillStyle = "#333"; g.fillText("Othoca: città fenicia vicino a Santa Giusta (VIII sec. a.C.)", 40, h - 24);
  });
}

// ---------- palestra ----------
export function wallBars(w = 1.0, h = 2.6) { const g = G(); B(g, -w / 2, h / 2, 0, 0.08, h, 0.08, M.lightwood); B(g, w / 2, h / 2, 0, 0.08, h, 0.08, M.lightwood); for (let y = 0.2; y < h; y += 0.16) C(g, 0, y, 0, 0.018, w, M.lightwood).rotation.z = Math.PI / 2; return g; }
export function climbingWall(w = 1.6, h = 5, photo = null) { const g = G(); B(g, 0, h / 2, 0, w, h, 0.08, mat(0xc4823f)); if (photo) { const t = photoTex(photo); plane(g, 0, h / 2, 0.042, w, h, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.15 })); } const cols = [0xe53935, 0xfdd835, 0x1e88e5, 0x43a047, 0xffffff]; for (let i = 0; i < 26; i++) S(g, (Math.random() - .5) * (w - 0.2), 0.3 + Math.random() * (h - 0.6), 0.06, 0.05, mat(cols[i % 5])); return g; }
export function hoop(h = 3.05) { const g = G(); C(g, 0, 1.6, -0.9, 0.07, 3.2, mat(0x1d3f8f)); B(g, 0, 3.2, -0.65, 0.12, 0.12, 0.6, mat(0x1d3f8f)); B(g, 0, 3.35, -0.3, 1.8, 1.05, 0.04, mat(0xffffff, { opacity: .85 })); const r = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.015, 8, 24), M.orange); r.rotation.x = Math.PI / 2; r.position.set(0, h, -0.02); g.add(r); return g; }
export function mat3(color = 0x1e5fc4) { const g = G(); B(g, 0, 0.1, 0, 2, 0.2, 1, mat(color)); return g; }
export function cone(color = 0xff6f00) { const g = G(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 16), mat(color)); c.position.y = 0.21; c.castShadow = true; g.add(c); B(g, 0, 0.01, 0, 0.36, 0.02, 0.36, mat(color)); return g; }
export function ball(kind = "basket") { const g = G(); const m = kind === "basket" ? mat(0xe8742a) : kind === "volley" ? mat(0xf5f0d8) : mat(0xffffff); S(g, 0, 0.12, 0, 0.12, m); if (kind === "volley") { const s = S(g, 0, 0.12, 0, 0.121, mat(0x1e5fc4)); s.scale.set(1, 0.3, 1); } if (kind === "basket") { const s = S(g, 0, 0.12, 0, 0.121, M.black); s.scale.set(0.08, 1, 1); } return g; }
export function ballCart(color = 0x1e5fc4, label = "") { const g = G(); B(g, 0, 0.45, 0, 0.9, 0.04, 0.6, M.steel); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { B(g, x * 0.43, 0.6, z * 0.28, 0.03, 0.9, 0.03, M.steel); C(g, x * 0.43, 0.05, z * 0.28, 0.05, 0.04, M.black).rotation.x = Math.PI / 2; } B(g, 0, 0.75, 0.3, 0.9, 0.6, 0.01, mat(color, { opacity: 0.5 }), false); B(g, 0, 0.75, -0.3, 0.9, 0.6, 0.01, mat(color, { opacity: 0.5 }), false); if (label) { const t = textSign("cart" + label, label, { bg: "#" + color.toString(16).padStart(6, "0"), font: "bold 60px Inter" }); plane(g, 0, 1.2, 0.31, 0.8, 0.2, basic(t)); } return g; }
export function gymBench(w = 3) { const g = G(); B(g, 0, 0.4, 0, w, 0.06, 0.3, M.lightwood); B(g, 0, 0.2, 0, w - 0.1, 0.04, 0.08, mat(0x3a3a40)); B(g, -w / 2 + 0.2, 0.2, 0, 0.06, 0.4, 0.3, mat(0x3a3a40)); B(g, w / 2 - 0.2, 0.2, 0, 0.06, 0.4, 0.3, mat(0x3a3a40)); return g; }

// ---------- teatro ----------
export function seatRow(n = 8, w = 0.55) {
  const g = G();
  for (let i = 0; i < n; i++) { const x = -((n - 1) * w) / 2 + i * w; B(g, x, 0.45, 0, w - 0.06, 0.1, 0.45, M.seatRed); B(g, x, 0.78, -0.22, w - 0.06, 0.58, 0.08, M.seatRed); B(g, x - w / 2 + 0.02, 0.55, 0, 0.04, 0.35, 0.45, M.black); }
  B(g, (n * w) / 2 - w / 2 + 0.02, 0.55, 0, 0.04, 0.35, 0.45, M.black);
  B(g, 0, 0.2, 0, n * w, 0.4, 0.3, M.black);
  return g;
}
export function stage(w = 8, d = 3.5, h = 0.6) { const g = G(); B(g, 0, h / 2, 0, w, h, d, mat(0x2a2a2e)); B(g, 0, h + 0.005, 0, w - 0.02, 0.01, d - 0.02, mat(0xffffff, { map: TEX_CARPET() })); for (let i = 0; i < 2; i++) B(g, 0, 0.1 + i * 0.2, d / 2 + 0.25 + (1 - i) * 0.3, 1.6, 0.2 + i * 0.2, 0.6 - i * 0.3 + 0.0, mat(0xd94a2f)); return g; }
function TEX_CARPET() { return canvasTex("carpetstage", 256, 256, (g, w, h) => { g.fillStyle = "#c9412b"; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .12})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }); }
export function curtain(w = 2, h = 4) { const g = G(); const n = Math.round(w / 0.25); for (let i = 0; i < n; i++) B(g, -w / 2 + (i + 0.5) * w / n, h / 2, Math.sin(i * 1.7) * 0.06, w / n + 0.02, h, 0.08, M.curtain); return g; }
export function lightConsole() { const g = G(); B(g, 0, 0.45, 0, 1.2, 0.9, 0.6, M.darkgrey); const top = B(g, 0, 0.95, 0.05, 1.2, 0.08, 0.6, M.black); top.rotation.x = -0.3; const cols = [0xe53935, 0xfdd835, 0x1e88e5, 0x43a047, 0xffffff, 0xff9800]; for (let i = 0; i < 6; i++) { B(g, -0.45 + i * 0.18, 1.0, 0.05, 0.05, 0.05, 0.12, mat(cols[i], { emissive: cols[i], ei: 0.5 })).rotation.x = -0.3; } return g; }
export function spotlight(color = 0xffffff) { const g = G(); const c = C(g, 0, 0, 0, 0.12, 0.3, M.black, 0.16); c.rotation.x = Math.PI / 2.5; const lens = S(g, 0, -0.06, 0.14, 0.1, mat(color, { emissive: color, ei: 0.2, unique: true })); lens.scale.z = 0.3; return { g, lens }; }

// ---------- lavagne con scritte e ritratti dei prof ----------
// lines: array di righe; una riga può essere { t, color, size, x }
export function boardTex(key, lines, { bg = "#fbfbf8", ink = "#1a3d8f", w = 1024, h = 640, chalk = false } = {}) {
  return canvasTex("board" + key, w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (!chalk) { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "rgba(255,255,255,.0)"); gr.addColorStop(0.5, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    else { for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(255,255,255,.03)"; g.fillRect(Math.random() * w, Math.random() * h, 160, 30); } }
    let y = 70;
    for (const ln of lines) {
      const o = typeof ln === "string" ? { t: ln } : ln;
      const size = o.size || 44; y += o.gap || 0;
      g.fillStyle = o.color || ink; g.font = `${o.bold ? 700 : 500} ${size}px 'Comic Sans MS', 'Chalkboard SE', 'Baloo 2', cursive`;
      g.save(); g.translate(o.x ?? 50, y); g.rotate((Math.random() - 0.5) * 0.02); g.fillText(o.t, 0, 0); g.restore();
      if (o.underline) { g.strokeStyle = o.color || ink; g.lineWidth = 3; g.beginPath(); g.moveTo(o.x ?? 50, y + 10); g.lineTo((o.x ?? 50) + g.measureText(o.t).width, y + 8); g.stroke(); }
      y += size * 1.35;
    }
    if (!chalk) { g.strokeStyle = "rgba(0,0,0,.05)"; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.lineTo(Math.random() * w, Math.random() * h); g.stroke(); } }
  });
}
export function chalkboard(w, h, tex) { const g = G(); B(g, 0, 0, 0, w + 0.1, h + 0.1, 0.04, M.lightwood); plane(g, 0, 0, 0.021, w, h, lit(tex, { roughness: .95 })); B(g, 0, -h / 2 - 0.06, 0.06, w * 0.9, 0.03, 0.08, M.lightwood); return g; }

const photoLoader = new THREE.TextureLoader();
// ritratto incorniciato con targhetta del nome
export function portrait(url, name, role) {
  const g = G();
  const tex = photoLoader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; }); tex.colorSpace = THREE.SRGBColorSpace;
  B(g, 0, 0, -0.015, 0.62, 0.78, 0.03, mat(0x2b2b30, { rough: .4, metal: .3 }));
  B(g, 0, 0.07, 0.0, 0.54, 0.54, 0.01, M.white, false);
  plane(g, 0, 0.07, 0.007, 0.48, 0.48, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }));
  const plate = canvasTex("plate" + name, 512, 128, (c, w, h) => { c.fillStyle = "#f0559a"; c.fillRect(0, 0, w, h); c.fillStyle = "#fff"; c.font = "800 52px 'Baloo 2', Inter, sans-serif"; c.textAlign = "center"; c.fillText(name, w / 2, 58); c.font = "600 30px Inter, sans-serif"; c.fillText(role, w / 2, 104); });
  plane(g, 0, -0.29, 0.007, 0.54, 0.135, basic(plate));
  return g;
}

// ---------- dettagli per rendere le stanze più vere ----------
const photoCache = new Map();
export function photoTex(url) {
  if (photoCache.has(url)) return photoCache.get(url);
  const t = photoLoader.load(url, (tt) => { tt.colorSpace = THREE.SRGBColorSpace; tt.needsUpdate = true; }); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  photoCache.set(url, t); return t;
}
// quadro con foto vera (stampa su pannello, come al museo)
export function photoPanel(url, w, h, tag = null) {
  const g = G(); B(g, 0, 0, -0.012, w, h, 0.025, M.white);
  const pt = photoTex(url); plane(g, 0, 0, 0.002, w - 0.01, h - 0.01, new THREE.MeshStandardMaterial({ map: pt, roughness: 0.5, emissive: 0xffffff, emissiveMap: pt, emissiveIntensity: 0.38 }));
  if (tag) { const tg = B(g, w * 0.3, -h / 2 - 0.1, 0.005, 0.09, 0.09, 0.005, mat(tag), false); tg.rotation.z = 0.5; }
  return g;
}
// cartelli di sicurezza
export function safetySign(kind, s = 0.32) {
  const tex = canvasTex("safety" + kind, 256, 320, (g, w, h) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = 120;
    const label = { occhiali: "OBBLIGO\nOCCHIALI", camice: "OBBLIGO\nCAMICE", guanti: "OBBLIGO\nGUANTI", cuffie: "OBBLIGO\nCUFFIE", vietato: "VIETATO\nMANGIARE", fumo: "VIETATO\nFUMARE", pericolo: "ATTENZIONE\nORGANI IN MOTO", elettrico: "PERICOLO\nELETTRICO", estintore: "ESTINTORE", uscita: "USCITA DI\nEMERGENZA", doccia: "LAVAOCCHI" }[kind] || kind;
    if (["occhiali", "camice", "guanti", "cuffie"].includes(kind)) { g.fillStyle = "#1565c0"; g.beginPath(); g.arc(cx, cy, 95, 0, 7); g.fill(); g.fillStyle = "#fff"; g.font = "900 90px Inter"; g.textAlign = "center"; g.fillText({ occhiali: "👓", camice: "🥼", guanti: "🧤", cuffie: "🎧" }[kind], cx, cy + 32); }
    else if (["vietato", "fumo"].includes(kind)) { g.strokeStyle = "#d32f2f"; g.lineWidth = 22; g.beginPath(); g.arc(cx, cy, 86, 0, 7); g.stroke(); g.font = "900 80px Inter"; g.textAlign = "center"; g.fillStyle = "#111"; g.fillText(kind === "fumo" ? "🚬" : "🍔", cx, cy + 28); g.beginPath(); g.moveTo(cx - 60, cy - 60); g.lineTo(cx + 60, cy + 60); g.stroke(); }
    else if (["pericolo", "elettrico"].includes(kind)) { g.fillStyle = "#f2c21b"; g.strokeStyle = "#111"; g.lineWidth = 10; g.beginPath(); g.moveTo(cx, 20); g.lineTo(cx + 105, 205); g.lineTo(cx - 105, 205); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#111"; g.font = "900 110px Inter"; g.textAlign = "center"; g.fillText(kind === "elettrico" ? "⚡" : "!", cx, 185); }
    else { g.fillStyle = kind === "estintore" ? "#d32f2f" : "#2e7d32"; g.fillRect(20, 20, w - 40, 200); g.fillStyle = "#fff"; g.font = "900 110px Inter"; g.textAlign = "center"; g.fillText(kind === "estintore" ? "🧯" : kind === "doccia" ? "👁" : "🏃", cx, 160); }
    g.fillStyle = "#111"; g.font = "800 30px Inter"; g.textAlign = "center"; label.split("\n").forEach((l, i) => g.fillText(l, cx, 262 + i * 34));
  });
  const g = G(); plane(g, 0, 0, 0, s, s * 1.25, lit(tex, { roughness: 0.4 })); return g;
}
// cartello luminoso di uscita di emergenza
export function exitSign() { const t = canvasTex("exitlit", 512, 192, (g, w, h) => { g.fillStyle = "#1b8f3a"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = "900 110px Inter"; g.fillText("🏃", 30, 140); g.font = "900 70px Inter"; g.fillText("USCITA", 190, 125); }); const g = G(); B(g, 0, 0, -0.03, 0.62, 0.25, 0.06, M.white); plane(g, 0, 0, 0.002, 0.58, 0.21, new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.6 })); return g; }
// orologio da parete con l'ora vera di quando entri nella stanza
export function wallClock(r = 0.18) {
  const now = new Date(); const tex = canvasTex("clock" + now.getHours() + ":" + now.getMinutes(), 256, 256, (g, w) => {
    const c = w / 2; g.fillStyle = "#fff"; g.beginPath(); g.arc(c, c, 120, 0, 7); g.fill(); g.strokeStyle = "#222"; g.lineWidth = 10; g.stroke();
    g.fillStyle = "#222"; g.font = "700 26px Inter"; g.textAlign = "center"; g.textBaseline = "middle";
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; g.fillText(i, c + Math.sin(a) * 95, c - Math.cos(a) * 95); }
    const hand = (a, l, wd, col) => { g.strokeStyle = col; g.lineWidth = wd; g.lineCap = "round"; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(a) * l, c - Math.cos(a) * l); g.stroke(); };
    const m = now.getMinutes(), hh = now.getHours() % 12; hand((hh + m / 60) / 12 * Math.PI * 2, 55, 9, "#222"); hand(m / 60 * Math.PI * 2, 82, 6, "#222"); hand(now.getSeconds() / 60 * Math.PI * 2, 88, 2, "#d32f2f");
  });
  const g = G(); C(g, 0, 0, -0.02, r + 0.015, 0.04, M.black).rotation.x = Math.PI / 2; const f = new THREE.Mesh(new THREE.CircleGeometry(r, 40), lit(tex, { roughness: 0.3 })); f.position.z = 0.001; g.add(f); return g;
}
export function acUnit() { const g = G(); B(g, 0, 0, 0.1, 0.9, 0.3, 0.2, M.white); B(g, 0, -0.11, 0.2, 0.84, 0.05, 0.02, mat(0xd8d8d8), false); B(g, 0.36, 0.08, 0.205, 0.06, 0.015, 0.005, mat(0x4caf50, { emissive: 0x4caf50, ei: 1 }), false); return g; }
export function radiator(w = 1.2) { const g = G(); for (let x = -w / 2 + 0.04; x < w / 2; x += 0.08) B(g, x, 0.45, 0.06, 0.06, 0.6, 0.08, M.white); B(g, 0, 0.2, 0.06, w, 0.03, 0.04, M.white, false); B(g, 0, 0.72, 0.06, w, 0.03, 0.04, M.white, false); return g; }
export function noticeBoard(w = 1.2, h = 0.85, title = "AVVISI") {
  const tex = canvasTex("notice" + title, 600, 420, (g, W, H) => {
    g.fillStyle = "#b98552"; g.fillRect(0, 0, W, H); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    const papers = [["#fff", "GITA A\nTHARROS"], ["#fff59d", "OPEN DAY\nsabato 9-13"], ["#bbdefb", "Orario\nlaboratori"], ["#f8bbd0", "Torneo\ndi volley"], ["#c8e6c9", "Raccolta\ndifferenziata"], ["#fff", "Circolare\nn. 112"]];
    papers.forEach(([c, t], i) => { const x = 30 + (i % 3) * 190 + Math.random() * 10, y = 60 + Math.floor(i / 3) * 175 + Math.random() * 10; g.save(); g.translate(x + 75, y + 70); g.rotate((Math.random() - 0.5) * 0.12); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(-71, -61, 150, 135); g.fillStyle = c; g.fillRect(-75, -65, 150, 135); g.fillStyle = "#333"; g.font = "700 20px Inter"; g.textAlign = "center"; t.split("\n").forEach((l, k) => g.fillText(l, 0, -20 + k * 26)); g.fillStyle = "#d32f2f"; g.beginPath(); g.arc(0, -55, 7, 0, 7); g.fill(); g.restore(); });
    g.fillStyle = "#fff"; g.font = "900 30px Inter"; g.fillText(title, 20, 36);
  });
  const g = G(); B(g, 0, 0, -0.015, w + 0.06, h + 0.06, 0.03, M.lightwood); plane(g, 0, 0, 0.002, w, h, lit(tex)); return g;
}
export function periodicTex() {
  return canvasTex("periodic", 1024, 600, (g, W, H) => {
    g.fillStyle = "#f7f4ea"; g.fillRect(0, 0, W, H); g.fillStyle = "#1a237e"; g.font = "900 40px Inter"; g.fillText("TAVOLA PERIODICA DEGLI ELEMENTI", 200, 50);
    const el = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe".split(" ");
    const pos = (n) => { if (n === 1) return [0, 0]; if (n === 2) return [17, 0]; if (n <= 4) return [n - 3, 1]; if (n <= 10) return [n + 7, 1]; if (n <= 12) return [n - 11, 2]; if (n <= 18) return [n - 1, 2]; if (n <= 36) return [n - 19, 3]; return [n - 37, 4]; };
    const col = (n) => [1, 6, 7, 8, 15, 16, 34].includes(n) ? "#a5d6a7" : [2, 10, 18, 36, 54].includes(n) ? "#ce93d8" : [3, 11, 19, 37].includes(n) ? "#ef9a9a" : [4, 12, 20, 38].includes(n) ? "#ffcc80" : [9, 17, 35, 53].includes(n) ? "#fff59d" : [5, 14, 32, 33, 51, 52].includes(n) ? "#80cbc4" : n >= 21 && n <= 30 || n >= 39 && n <= 48 ? "#90caf9" : "#b0bec5";
    el.forEach((s, i) => { const n = i + 1, [cx, cy] = pos(n), x = 22 + cx * 54.5, y = 80 + cy * 66; g.fillStyle = col(n); g.fillRect(x, y, 51, 62); g.fillStyle = "#222"; g.font = "600 13px Inter"; g.fillText(n, x + 4, y + 15); g.font = "800 24px Inter"; g.fillText(s, x + 8, y + 46); });
    g.fillStyle = "#555"; g.font = "500 20px Inter"; g.fillText("Gli elementi più leggeri: idrogeno (H), elio (He), litio (Li)…", 22, H - 30);
  });
}
export function ghsTex() {
  return canvasTex("ghs", 400, 520, (g, W, H) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.fillStyle = "#c62828"; g.font = "900 32px Inter"; g.textAlign = "center"; g.fillText("SIMBOLI DI PERICOLO", W / 2, 46);
    const items = [["🔥", "Infiammabile"], ["☠", "Tossico"], ["🧪", "Corrosivo"], ["❗", "Irritante"], ["🌳", "Pericoloso per l'ambiente"], ["💥", "Esplosivo"]];
    items.forEach(([ic, t], i) => { const x = 100 + (i % 2) * 200, y = 130 + Math.floor(i / 2) * 135; g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.strokeStyle = "#d32f2f"; g.lineWidth = 8; g.fillStyle = "#fff"; g.fillRect(-40, -40, 80, 80); g.strokeRect(-40, -40, 80, 80); g.restore(); g.fillStyle = "#111"; g.font = "40px Inter"; g.fillText(ic, x, y + 14); g.font = "600 18px Inter"; g.fillText(t, x, y + 78); });
  });
}
export function ductRun(len, r = 0.18, color = 0x3d8c9a) { const g = G(); const d = C(g, 0, 0, 0, r, len, mat(color, { metal: .5, rough: .4 }), r, 20); d.rotation.z = Math.PI / 2; for (let x = -len / 2 + 0.5; x < len / 2; x += 1.5) { const ring = C(g, x, 0, 0, r + 0.015, 0.05, M.steel, r + 0.015, 20); ring.rotation.z = Math.PI / 2; B(g, x, r + 0.15, 0, 0.03, 0.3, 0.03, M.steel, false); } return g; }
export function beakers() {
  const g = G(); const cols = [0x4fc3f7, 0xef5350, 0x66bb6a, 0xffca28, 0xab47bc];
  for (let i = 0; i < 5; i++) { const x = (i - 2) * 0.12 + (Math.random() - 0.5) * 0.04, z = (Math.random() - 0.5) * 0.15, h = 0.1 + Math.random() * 0.12, r = 0.035 + Math.random() * 0.02; C(g, x, h / 2, z, r, h, M.glass, r, 14); const lq = cols[i % 5]; C(g, x, h * 0.3, z, r * 0.92, h * 0.55, mat(lq, { opacity: 0.75, rough: 0.2, emissive: lq, ei: 0.15 }), r * 0.92, 14); }
  return g;
}
export function microscope() { const g = G(); B(g, 0, 0.02, 0, 0.18, 0.04, 0.24, M.black); B(g, 0, 0.17, -0.07, 0.05, 0.28, 0.05, M.black); B(g, 0, 0.12, 0.03, 0.14, 0.015, 0.12, M.darkgrey); const t = C(g, 0, 0.28, 0.0, 0.025, 0.2, M.white); t.rotation.x = 0.4; C(g, 0, 0.36, -0.04, 0.018, 0.08, M.black).rotation.x = 0.4; return g; }
export function balance() { const g = G(); B(g, 0, 0.05, 0, 0.3, 0.1, 0.32, M.white); C(g, 0, 0.11, 0.03, 0.08, 0.01, M.steel); B(g, 0, 0.17, 0.03, 0.26, 0.22, 0.26, M.glass, false); plane(g, 0, 0.05, 0.161, 0.12, 0.04, mat(0x103020, { emissive: 0x33ff88, ei: 0.5 })); return g; }
export function networkRack() { const g = G(); B(g, 0, 0.65, 0, 0.6, 1.3, 0.6, M.black); B(g, 0, 0.7, 0.301, 0.5, 1.1, 0.01, M.glass, false); for (let i = 0; i < 6; i++) { B(g, 0, 0.3 + i * 0.16, 0.25, 0.46, 0.07, 0.04, M.darkgrey, false); for (let k = 0; k < 6; k++) B(g, -0.18 + k * 0.07, 0.3 + i * 0.16, 0.272, 0.02, 0.012, 0.005, mat([0x4caf50, 0xffc107, 0x2196f3][(i + k) % 3], { emissive: [0x4caf50, 0xffc107, 0x2196f3][(i + k) % 3], ei: 1.2 }), false); } return g; }
export function cableTray(len) { const g = G(); B(g, 0, 0, 0.05, len, 0.08, 0.1, mat(0xdfe3e6)); return g; }
export function robotKit() { const g = G(); B(g, 0, 0.05, 0, 0.16, 0.06, 0.12, mat(0x1e88e5)); for (const x of [-0.09, 0.09]) C(g, x, 0.04, 0.0, 0.035, 0.02, M.black).rotation.z = Math.PI / 2; B(g, 0, 0.1, 0.05, 0.08, 0.03, 0.02, M.darkgrey); S(g, -0.03, 0.1, 0.065, 0.008, mat(0xffffff, { emissive: 0x88ccff, ei: 1 })); S(g, 0.03, 0.1, 0.065, 0.008, mat(0xffffff, { emissive: 0x88ccff, ei: 1 })); return g; }
export function bookStack(n = 3) { const g = G(); const cols = [0xc62828, 0x1565c0, 0x2e7d32, 0xf9a825, 0x6a1b9a]; let y = 0; for (let i = 0; i < n; i++) { const h = 0.025 + Math.random() * 0.02; const b = B(g, (Math.random() - 0.5) * 0.03, y + h / 2, 0, 0.22, h, 0.16, mat(cols[(i + Math.floor(Math.random() * 5)) % 5])); b.rotation.y = (Math.random() - 0.5) * 0.4; y += h; } return g; }
export function schoolBag(color = 0x1565c0) { const g = G(); const m = mat(color, { rough: .8 }); B(g, 0, 0.2, 0, 0.3, 0.38, 0.15, m); B(g, 0, 0.1, 0.09, 0.24, 0.16, 0.05, m); return g; }
export function scoreboard() {
  const t = canvasTex("score", 800, 300, (g, W, H) => { g.fillStyle = "#0a0a0a"; g.fillRect(0, 0, W, H); g.font = "800 40px Inter"; g.fillStyle = "#ffd54f"; g.textAlign = "center"; g.fillText("OTHOCA", 170, 70); g.fillText("OSPITI", 630, 70); g.font = "900 130px 'Courier New', monospace"; g.fillStyle = "#ff3d00"; g.fillText("24", 170, 215); g.fillText("18", 630, 215); g.fillStyle = "#4caf50"; g.font = "900 70px 'Courier New', monospace"; g.fillText("12:00", 400, 170); g.font = "700 30px Inter"; g.fillStyle = "#fff"; g.fillText("PERIODO 2", 400, 250); });
  const g = G(); B(g, 0, 0, -0.06, 2.2, 0.9, 0.12, M.black); plane(g, 0, 0, 0.002, 2.1, 0.8, new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.3 })); return g;
}
// tribuna sopraelevata con parapetto in vetro e sedute
export function gallery(len, depth = 1.8, h = 2.8) {
  const g = G(); B(g, 0, h, 0, len, 0.2, depth, mat(0xe8e6e0));
  for (let x = -len / 2 + 0.3; x < len / 2; x += 3) B(g, x, h / 2, depth / 2 - 0.15, 0.22, h, 0.22, mat(0xd8d6d0));
  B(g, 0, h + 0.55, depth / 2 - 0.02, len, 0.9, 0.03, M.glass, false); B(g, 0, h + 1.02, depth / 2, len, 0.05, 0.08, M.steel, false);
  for (let x = -len / 2 + 0.4; x < len / 2 - 0.2; x += 0.55) { B(g, x, h + 0.35, 0.05, 0.45, 0.06, 0.4, mat(0x1d4fb8, { rough: .5 }), false); B(g, x, h + 0.6, -0.15, 0.45, 0.45, 0.06, mat(0x1d4fb8, { rough: .5 }), false); }
  return g;
}
export function netPost(h = 2.6) { const g = G(); C(g, 0, h / 2, 0, 0.05, h, mat(0xd32f2f)); C(g, 0, 0.05, 0, 0.2, 0.1, M.darkgrey); return g; }
export function sconce(color = 0xffd9a0) { const g = G(); B(g, 0, 0, 0.02, 0.18, 0.3, 0.04, M.darkgrey); const s = S(g, 0, 0.02, 0.09, 0.09, mat(0xffffff, { emissive: color, ei: 2.2 })); s.scale.set(1, 1.4, 0.6); return g; }
export function speakerBox() { const g = G(); B(g, 0, 0, 0, 0.35, 0.55, 0.3, M.black); C(g, 0, -0.08, 0.152, 0.1, 0.01, M.darkgrey).rotation.x = Math.PI / 2; C(g, 0, 0.16, 0.152, 0.045, 0.01, M.darkgrey).rotation.x = Math.PI / 2; return g; }
export function projector() { const g = G(); B(g, 0, 0, 0, 0.35, 0.12, 0.3, M.white); C(g, 0.08, 0, 0.155, 0.04, 0.02, M.black).rotation.x = Math.PI / 2; B(g, 0, 0.3, 0, 0.04, 0.5, 0.04, M.steel); return g; }
export function projectionScreen(w = 2.2, h = 1.3, tex = null) { const g = G(); B(g, 0, h / 2 + 0.08, 0, w + 0.1, 0.1, 0.1, M.darkgrey); plane(g, 0, 0, 0.001, w, h, tex ? new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 }) : mat(0xfafafa)); return g; }
export function acousticPanel(w = 1.2, h = 1.8) { const t = canvasTex("acoustic", 256, 384, (g, W, H) => { g.fillStyle = "#dedad3"; g.fillRect(0, 0, W, H); g.strokeStyle = "rgba(0,0,0,.08)"; g.lineWidth = 3; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(W / 2, H / 2, 20 + i * 18, 0, 7); g.stroke(); } }); const g = G(); B(g, 0, 0, -0.02, w, h, 0.04, lit(t)); return g; }

// mobile/parete con la foto vera sul fronte (armadi, scaffali, pannelli)
export function photoBox(url, w, h, d = 0.5, body = M.cream) {
  const g = G(); B(g, 0, h / 2, 0, w, h, d, body);
  const t = photoTex(url); plane(g, 0, h / 2, d / 2 + 0.004, w, h, new THREE.MeshStandardMaterial({ map: t, roughness: 0.45, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.18 }));
  return g;
}
// fronte fotografico ripetuto su una parete lunga (es. fila di armadi)
export function photoRun(url, len, h, d, repeats, body = M.cream) {
  const g = G(); B(g, 0, h / 2, 0, len, h, d, body);
  const t = photoTex(url).clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(repeats, 1);
  plane(g, 0, h / 2, d / 2 + 0.004, len, h, new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.16 }));
  return g;
}
export function sinkCounter(w = 1.6) { const g = G(); B(g, 0, 0.45, 0, w, 0.9, 0.65, M.white); B(g, 0, 0.91, 0, w, 0.03, 0.66, M.steel); B(g, -w / 4, 0.86, 0.02, 0.5, 0.08, 0.4, mat(0x9aa0a6, { metal: .8, rough: .3 })); const tap = C(g, -w / 4, 1.05, -0.2, 0.015, 0.3, M.steel); void tap; B(g, -w / 4, 1.2, -0.13, 0.02, 0.02, 0.15, M.steel); return g; }
export function wallBench(len, d = 0.7) { const g = G(); B(g, 0, 0.9, 0, len, 0.05, d, M.labTop); for (let x = -len / 2 + 0.1; x <= len / 2; x += 1.2) { B(g, x, 0.44, d / 2 - 0.05, 0.05, 0.88, 0.05, M.black); B(g, x, 0.44, -d / 2 + 0.05, 0.05, 0.88, 0.05, M.black); } return g; }
