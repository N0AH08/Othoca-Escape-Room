/*
 * LA SCUOLA OTHOCA RICOSTRUITA IN 3D
 * ----------------------------------
 * Un'unica scena 3D navigabile senza stacchi: stanze, porte e arredi costruiti dalla mappa (scuola3d-mappa.js),
 * con dettagli presi dalle foto 360° vere (lib/scuola/*.jpg). Il robot rosa si guida con WASD.
 *
 * window.SCUOLA_MODE = "tour"   -> tour libero: punti informativi, foto 360° reali, mappa con teletrasporto
 * window.SCUOLA_MODE = "escape" -> escape room: enigmi di game.js (window.OthocaGame), porte chiuse da aprire
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const MAP = window.SCUOLA;
const MODE = window.SCUOLA_MODE || "tour";
const ESCAPE = MODE === "escape";
const G = ESCAPE ? window.OthocaGame : null;
const ROBOT_H = 1.2, RADIUS = 0.32, DOOR_H = 2.45;
const $ = (s) => document.querySelector(s);

// ---------- Renderer, scena, luci ----------
const canvas = $("#view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.08, 600);
const hemi = new THREE.HemisphereLight(0xf4f1ff, 0x9a8f82, 1.9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 120 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
scene.fog = new THREE.Fog(0xcfd9e6, 90, 260);

// ---------- Texture disegnate al volo ----------
function canvasTex(w, h, draw, rep = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const TEX = {
  tiles: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#e9ddc9"; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${150 + rnd() * 60},${130 + rnd() * 50},${110 + rnd() * 40},.12)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.strokeStyle = "#b8ab98"; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }),
  lighttiles: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#efe6dc"; g.fillRect(0, 0, w, h); g.strokeStyle = "#cbbdae"; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }),
  greytiles: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#d9d6d2"; g.fillRect(0, 0, w, h); for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(90,90,90,${rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.strokeStyle = "#a9a39c"; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }),
  terrazzo: canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#e6e1da"; g.fillRect(0, 0, w, h);
    const cols = ["#3b3f4f", "#5b5f70", "#8d8c90", "#b9a99a", "#2e3244", "#c7c2bb", "#6d5f57"];
    for (let i = 0; i < 9000; i++) { g.fillStyle = cols[(rnd() * cols.length) | 0]; const s = 0.8 + rnd() * 2.6; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, s, s * (0.5 + rnd() * 0.6), rnd() * 3, 0, 7); g.fill(); }
  }),
  cobble: canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#8a7f7a"; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const cx = c * 64 + (r % 2) * 32, cy = r * 64;
      for (let k = 5; k > 0; k--) { g.beginPath(); g.arc(cx, cy + 64, k * 12, Math.PI * 1.15, Math.PI * 1.85); g.strokeStyle = k % 2 ? "#9c857e" : "#918b87"; g.lineWidth = 11; g.stroke(); g.strokeStyle = "rgba(50,40,40,.28)"; g.lineWidth = 1.2; g.stroke(); }
    }
  }),
  grass: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#5f8a3c"; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `hsl(${85 + rnd() * 30},${35 + rnd() * 25}%,${25 + rnd() * 25}%)`; g.fillRect(rnd() * w, rnd() * h, 1.5, 3); } }),
  asphalt: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#77776f"; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},.06)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }),
  stripes: canvasTex(64, 256, (g, w, h) => { g.fillStyle = "#cfe5d8"; g.fillRect(0, 0, w, h); g.fillStyle = "#24394a"; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 5); }),
  panels: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#f2f0ea"; g.fillRect(0, 0, w, h); g.strokeStyle = "#d4d0c6"; g.lineWidth = 4; g.strokeRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = "rgba(150,150,140,.15)"; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); } }),
  acoustic: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#8f8d8a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#c9c6c0"; g.lineWidth = 2; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(0, 0, k * 32, 0, 7); g.stroke(); g.beginPath(); g.arc(w, h, k * 32, 0, 7); g.stroke(); } }),
  woodceil: canvasTex(512, 64, (g, w, h) => { for (let x = 0; x < w; x += 16) { g.fillStyle = `hsl(${22 + rnd() * 8},${55 + rnd() * 15}%,${30 + rnd() * 12}%)`; g.fillRect(x, 0, 16, h); } g.fillStyle = "#2f8f86"; g.fillRect(0, 0, w, 5); }),
  parquet: canvasTex(512, 512, (g, w, h) => { for (let y = 0; y < h; y += 32) for (let x = -((y / 32) % 4) * 64; x < w; x += 256) { g.fillStyle = `hsl(${32 + rnd() * 6},${60 + rnd() * 10}%,${55 + rnd() * 10}%)`; g.fillRect(x, y, 256, 32); g.strokeStyle = "rgba(90,50,20,.35)"; g.strokeRect(x, y, 256, 32); } }),
  rubber: canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#3a3c40"; g.fillRect(0, 0, w, h); g.fillStyle = "#55585e"; for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) { g.beginPath(); g.arc(x + ((y / 16) % 2) * 8, y, 3.5, 0, 7); g.fill(); } }),
  beige: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#e3d7bd"; g.fillRect(0, 0, w, h); for (let i = 0; i < 800; i++) { g.fillStyle = "rgba(160,140,100,.08)"; g.fillRect(rnd() * w, rnd() * h, 3, 3); } }),
  facade: canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#e7a99d"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(120,60,50,${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
    // finestre a nastro su due piani
    for (const y of [70, 330]) { g.fillStyle = "#e9e4df"; g.fillRect(0, y - 8, w, 132); for (let x = 16; x < w; x += 128) { g.fillStyle = "#3b4a5c"; g.fillRect(x, y, 96, 112); g.fillStyle = "rgba(190,215,235,.55)"; g.fillRect(x + 4, y + 4, 42, 104); g.fillRect(x + 50, y + 4, 42, 104); } }
  }),
  panelpink: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#d9a38c"; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 90},${rnd() > 0.5 ? 220 : 60},${rnd() > 0.5 ? 200 : 50},.12)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.fillStyle = "rgba(60,40,30,.35)"; g.fillRect(0, 0, 3, h); }),
  court: canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = "#1d4fa8"; g.fillRect(0, 0, w, h);
    // parquet centrale (il campo occupa la parte interna)
    const x0 = 90, y0 = 150, cw = w - 180, ch = h - 300;
    for (let y = y0; y < y0 + ch; y += 14) for (let x = x0 - ((y / 14) % 5) * 40; x < x0 + cw; x += 200) { g.fillStyle = `hsl(${33 + rnd() * 5},${62 + rnd() * 10}%,${58 + rnd() * 8}%)`; g.fillRect(Math.max(x, x0), y, Math.min(200, x0 + cw - Math.max(x, x0)), 14); }
    g.strokeStyle = "#ffffff"; g.lineWidth = 5; g.strokeRect(x0, y0, cw, ch);
    g.beginPath(); g.moveTo(w / 2, y0); g.lineTo(w / 2, y0 + ch); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 70, 0, 7); g.stroke();
    g.fillStyle = "#1d4fa8"; g.beginPath(); g.arc(w / 2, h / 2, 66, 0, 7); g.fill();
    for (const s of [-1, 1]) { const bx = s < 0 ? x0 : x0 + cw; g.beginPath(); g.arc(bx, h / 2, 240, s < 0 ? -1.5 : 1.64, s < 0 ? 1.5 : 4.64); g.stroke(); g.fillStyle = "#1d4fa8"; g.fillRect(s < 0 ? bx : bx - 150, h / 2 - 70, 150, 140); g.strokeRect(s < 0 ? bx : bx - 150, h / 2 - 70, 150, 140); }
    g.strokeStyle = "#d8283a"; g.lineWidth = 4; g.strokeRect(x0 + 60, y0 + 40, cw - 120, ch - 80);
  }, false),
  gym: canvasTex(256, 512, (g, w, h) => { g.fillStyle = "#f3f1ec"; g.fillRect(0, 0, w, h); g.fillStyle = "#e6e4de"; g.fillRect(0, h * 0.62, w, h * 0.38); g.fillStyle = "#3b5d7c"; g.fillRect(0, 26, w, 70); for (let x = 10; x < w; x += 64) { g.fillStyle = "#bcd6ec"; g.fillRect(x, 32, 52, 58); } g.fillStyle = "#2f8f86"; g.fillRect(0, 100, w, 6); }),
  white: canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#f4f2ee"; g.fillRect(0, 0, w, h); }),
  cream: canvasTex(64, 256, (g, w, h) => { g.fillStyle = "#f2ead8"; g.fillRect(0, 0, w, h); g.fillStyle = "#e3d6bb"; g.fillRect(0, h * 0.62, w, h * 0.38); }),
  sky: canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#5f95d6"); gr.addColorStop(0.5, "#a9c8ea"); gr.addColorStop(0.62, "#dfe8f1"); gr.addColorStop(1, "#cfd9e6"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false),
  fence: canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#9aa0a6"; for (let x = 4; x < w; x += 16) g.fillRect(x, 0, 4, h); g.fillRect(0, 6, w, 6); g.fillRect(0, h - 14, w, 6); }),
  hedge: canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#3f6b2c"; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `hsl(${90 + rnd() * 30},${40 + rnd() * 20}%,${18 + rnd() * 22}%)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 4, 0, 7); g.fill(); } }),
  othoca: canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = "#1c4f8f"; g.fillRect(0, 0, w, h); g.fillStyle = "#e9eef5"; g.fillRect(0, 0, w, 16); g.fillRect(0, h - 10, w, 10);
    g.fillStyle = "#1c4f8f"; g.font = "bold 11px Inter, sans-serif"; g.textAlign = "center"; g.fillText("ISTITUTO TECNICO INDUSTRIALE STATALE · LICEO SCIENTIFICO", w / 2, 12);
    g.fillStyle = "#fff"; g.font = "bold 78px Cinzel, Georgia, serif"; g.fillText("O T H O C A", w / 2, 98);
  }, false)
};
const MAT = {};
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
const texMat = (name, extra = {}) => std({ map: TEX[name], ...extra });
// texture fotografiche ricavate proiettando le foto 360° sul piano del pavimento / soffitto / muro
function photoTex(name, mirror = true) {
  const t = new THREE.TextureLoader().load(`lib/scuola/${name}.jpg`);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
  return t;
}
Object.assign(MAT, {
  tiles: std({ map: photoTex("t_piastrelle"), roughness: 0.32 }), lighttiles: std({ map: photoTex("t_piastrelle"), color: 0xfff4ee, roughness: 0.32 }), greytiles: texMat("greytiles", { roughness: 0.6 }),
  terrazzo: std({ map: photoTex("t_graniglia"), roughness: 0.3 }), cobble: std({ map: photoTex("t_porfido"), roughness: 0.9 }), cobble2: std({ map: photoTex("t_porfido2"), roughness: 0.9 }), grass: texMat("grass", { roughness: 1 }), asphalt: texMat("asphalt", { roughness: 1 }),
  court: texMat("court", { roughness: 0.3 }), rubber: std({ map: photoTex("t_gomma"), roughness: 0.6 }), beige: texMat("beige", { roughness: 0.6 }),
  stripes: (() => { const t = photoTex("t_soffitto_strisce"); return std({ map: t, emissiveMap: t, emissive: 0x777777, roughness: 0.6 }); })(), panels: texMat("panels"), acoustic: std({ map: photoTex("t_soffitto_teatro") }), woodceil: std({ map: photoTex("t_soffitto_palestra"), roughness: 0.7 }),
  skylight: texMat("panels"), vault: texMat("panels"),
  white: texMat("white", { roughness: 0.9 }), cream: texMat("cream"), gym: texMat("gym"), panelpink: std({ map: photoTex("t_pannelli_rosa"), roughness: 0.9 }),
  windowsPhoto: std({ map: photoTex("t_finestre_atrio", false), roughness: 0.8 }),
  doorGreen: (() => { const t = photoTex("d_porta_verde", false); return std({ map: t, emissiveMap: t, emissive: 0x666666, roughness: 0.6 }); })(), doorWood: (() => { const t = photoTex("d_porta_legno", false); return std({ map: t, emissiveMap: t, emissive: 0x444444, roughness: 0.6 }); })(),
  aoWall: new THREE.MeshBasicMaterial({ map: canvasTex(4, 64, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "rgba(0,0,0,.32)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  facade: texMat("facade"), roof: std({ color: 0x8c8780 }), hedge: texMat("hedge", { roughness: 1 }),
  fence: std({ map: TEX.fence, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, depthWrite: false, side: THREE.DoubleSide }),
  frame: std({ color: 0x4a4f57, metalness: 0.6, roughness: 0.35 }), alu: std({ color: 0xb9bec4, metalness: 0.7, roughness: 0.3 }),
  wood: std({ color: 0x8a5a32, roughness: 0.6 }), gymgreen: std({ color: 0x5d8a73, roughness: 0.5 }), lightwood: std({ color: 0xc89a62, roughness: 0.6 }), greendoor: std({ color: 0x2f5a46, roughness: 0.6 }),
  concrete: std({ color: 0xb8b2aa, roughness: 0.95 }), darkgrey: std({ color: 0x3c3f45, roughness: 0.6 }), grey: std({ color: 0x9a9da2, roughness: 0.6 }),
  cabinet: std({ color: 0x8e8b84, roughness: 0.5, metalness: 0.2 }), black: std({ color: 0x1e1f23, roughness: 0.5 }),
  red: std({ color: 0xc7262e, roughness: 0.5 }), redSeat: std({ color: 0xd3232d, roughness: 0.55 }), orange: std({ color: 0xe0571c, roughness: 0.5 }),
  green: std({ color: 0x1f8a4c, roughness: 0.5 }), mint: std({ color: 0xa9d8bf, roughness: 0.5 }), labWhite: std({ color: 0xf3f4f2, roughness: 0.4 }),
  machine: std({ color: 0x6f9a8a, roughness: 0.45, metalness: 0.25 }), blueMachine: std({ color: 0x1f78b4, roughness: 0.4, metalness: 0.2 }),
  yellow: std({ color: 0xf2c230, roughness: 0.5 }), blue: std({ color: 0x2357b8, roughness: 0.5 }), pink: std({ color: 0xf0559a, roughness: 0.5 }),
  carpet: std({ color: 0xc8361f, roughness: 1 }), curtain: std({ color: 0x1d2a22, roughness: 0.95 }), screen: std({ color: 0xffffff, emissive: 0x777777 }),
  light: new THREE.MeshBasicMaterial({ color: 0xffffff }), sky: new THREE.MeshBasicMaterial({ color: 0xdbeeff }),
  trunk: std({ color: 0x6b4f3a }), leaves: std({ color: 0x4f7d34, roughness: 1 }), leaves2: std({ color: 0x6c9443, roughness: 1 }),
  plant: std({ color: 0x3f8f3a, roughness: 0.9 }), pallet: std({ color: 0x8a5a2b, roughness: 0.9 }), orangeChair: std({ color: 0xd98a3a, roughness: 0.6 })
});
// foto vere ritagliate dai panorami
const photoMats = {};
const loader = new THREE.TextureLoader();
function photo(name) {
  if (!photoMats[name]) { const t = loader.load(`lib/scuola/${name}.jpg`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; photoMats[name] = std({ map: t, roughness: 0.6 }); }
  return photoMats[name];
}

// ---------- Geometria a lotti (tutto ciò che è fermo viene unito per materiale: poche chiamate di disegno) ----------
const batches = new Map();
function addGeo(geo, mat, cast = false) {
  const k = mat.uuid + (cast ? "c" : "");
  if (!batches.has(k)) batches.set(k, { mat, cast, geos: [] });
  batches.get(k).geos.push(geo);
}
function quad(p0, p1, p2, p3, uv, mat, cast = false) {
  const g = new THREE.BufferGeometry();
  const pos = [...p0, ...p1, ...p2, ...p3];
  const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1), c = new THREE.Vector3(...p3);
  const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([...n.toArray(), ...n.toArray(), ...n.toArray(), ...n.toArray()], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  addGeo(g, mat, cast);
}
// pavimento/soffitto orizzontale; s = metri per ripetizione della texture
function floorQuad(x0, z0, x1, z1, y, mat, s = 1, down = false) {
  const uv = [x0 / s, -z1 / s, x1 / s, -z1 / s, x1 / s, -z0 / s, x0 / s, -z0 / s];
  if (!down) quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], uv, mat);
  else quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0 / s, z0 / s, x1 / s, z0 / s, x1 / s, z1 / s, x0 / s, z1 / s], mat);
}
// parete verticale da A a B, vista dal lato in cui A->B va verso destra; uv in metri / s
function wallQuad(ax, az, bx, bz, y0, y1, mat, s = 1, sy = s, u0 = 0) {
  const L = Math.hypot(bx - ax, bz - az);
  quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], [u0 / s, y0 / sy, (u0 + L) / s, y0 / sy, (u0 + L) / s, y1 / sy, u0 / s, y1 / sy], mat);
}
function box(x0, y0, z0, x1, y1, z1, mat, cast = true) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); addGeo(g, mat, cast);
}
function cyl(x, y0, z, r, y1, mat, seg = 16, r2 = r, cast = true) {
  const g = new THREE.CylinderGeometry(r2, r, y1 - y0, seg); g.translate(x, (y0 + y1) / 2, z); addGeo(g, mat, cast);
}
function sphere(x, y, z, r, mat, sy = 1) { const g = new THREE.SphereGeometry(r, 12, 9); g.scale(1, sy, 1); g.translate(x, y, z); addGeo(g, mat, true); }
// gruppo ruotato: costruisce con le funzioni sopra in coordinate locali, poi ruota/sposta
function local(x, z, ry, build) {
  const start = new Map([...batches].map(([k, v]) => [k, v.geos.length]));
  build();
  const m = new THREE.Matrix4().makeRotationY(ry).setPosition(x, 0, z);
  for (const [k, v] of batches) for (let i = start.get(k) || 0; i < v.geos.length; i++) v.geos[i].applyMatrix4(m);
}
// pannello con foto vera appeso alla parete: centro (x, y, z), larghezza w, altezza h, rivolto verso ry
function picture(name, x, y, z, w, h, ry, frame = MAT.frame) {
  local(x, z, ry, () => {
    box(-w / 2 - 0.05, y - h / 2 - 0.05, -0.04, w / 2 + 0.05, y + h / 2 + 0.05, 0, frame, false);
    quad([-w / 2, y - h / 2, 0.005], [w / 2, y - h / 2, 0.005], [w / 2, y + h / 2, 0.005], [-w / 2, y + h / 2, 0.005], [0, 0, 1, 0, 1, 1, 0, 1], photo(name));
  });
}

// ---------- Collisioni ----------
const rooms = MAP.rooms.map((r) => ({ ...r, x0: r.rect[0], z0: r.rect[1], x1: r.rect[2], z1: r.rect[3], h: r.h || 4 }));
const roomById = Object.fromEntries(rooms.map((r) => [r.id, r]));
const obstacles = [];            // [x0, z0, x1, z1] (già allargati del raggio del robot quando servono)
const camBlock = [];             // pareti, per la telecamera
function block(x0, z0, x1, z1, forCam = false) {
  const o = [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)];
  obstacles.push(o); if (forCam) camBlock.push(o);
  return o;
}
const doors = MAP.doors.map((d, i) => {
  const vertical = Math.abs(d.a[0] - d.b[0]) < 1e-6;
  const c = [(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2];
  const w = vertical ? Math.abs(d.b[1] - d.a[1]) : Math.abs(d.b[0] - d.a[0]);
  const near = rooms.filter((r) => vertical
    ? (Math.abs(r.x0 - c[0]) < 1e-6 || Math.abs(r.x1 - c[0]) < 1e-6) && c[1] > r.z0 && c[1] < r.z1
    : (Math.abs(r.z0 - c[1]) < 1e-6 || Math.abs(r.z1 - c[1]) < 1e-6) && c[0] > r.x0 && c[0] < r.x1);
  if (d.to) { const dest = rooms.find((r) => d.to[0] > r.x0 && d.to[0] < r.x1 && d.to[1] > r.z0 && d.to[1] < r.z1); if (dest) near.push(dest); }
  return { ...d, i, vertical, c, w, rooms: near, open: 0, panels: [], lockBox: null };
});
const isLocked = (d) => {
  if (!ESCAPE || !d.lock) return false;
  if (d.lock === "chiuso") return true;
  return !(G && G.isSolved(d.lock));
};
function inRoom(p, r, m = 0) { return p.x >= r.x0 + m && p.x <= r.x1 - m && p.y >= r.z0 + m && p.y <= r.z1 - m; }
function roomAt(p) { for (const r of rooms) if (inRoom(p, r)) return r; return null; }
// ---------- Area della scuola (recinto, contorni degli edifici) ----------
const CAMPUS = MAP.campus || null;
function inPoly(p, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, zi] = P[i], [xj, zj] = P[j];
    if ((zi > p.y) !== (zj > p.y) && p.x < (xj - xi) * (p.y - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}
function distToEdges(p, P) {
  let d = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [ax, az] = P[j], [bx, bz] = P[i], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - az) * dz) / (dx * dx + dz * dz)));
    d = Math.min(d, Math.hypot(p.x - ax - dx * t, p.y - az - dz * t));
  }
  return d;
}
const inCampus = (p) => !!CAMPUS && inPoly(p, CAMPUS.perimeter) && distToEdges(p, CAMPUS.perimeter) > 0.4;
const inFootprint = (p) => !!CAMPUS && CAMPUS.footprints.some((f) => inPoly(p, f.pts) && distToEdges(p, f.pts) > 0.35);
const OUTSIDE = { id: "esterno", name: "Cortili della scuola", area: "Portici", outdoor: true, x0: 0, x1: 0, z0: 0, z1: 0, h: 30 };
function walkable(p) {
  const r = roomAt(p);
  if (!r || r.outdoor) { if (!(r || inCampus(p)) || inFootprint(p)) return false; }
  for (const o of obstacles) if (p.x > o[0] - RADIUS && p.x < o[2] + RADIUS && p.y > o[1] - RADIUS && p.y < o[3] + RADIUS) return false;
  for (const d of doors) if (d.lockBox && isLocked(d)) { const o = d.lockBox; if (p.x > o[0] - RADIUS && p.x < o[2] + RADIUS && p.y > o[1] - RADIUS && p.y < o[3] + RADIUS) return false; }
  return true;
}

// ---------- Costruzione di pareti, pavimenti, soffitti ----------
const T = 0.13; // mezzo spessore del muro
function edgesOf(r) {
  return [
    { side: "n", a: [r.x0, r.z0], b: [r.x1, r.z0], inward: [0, 1] },
    { side: "e", a: [r.x1, r.z0], b: [r.x1, r.z1], inward: [-1, 0] },
    { side: "s", a: [r.x1, r.z1], b: [r.x0, r.z1], inward: [0, -1] },
    { side: "w", a: [r.x0, r.z1], b: [r.x0, r.z0], inward: [1, 0] }
  ];
}
// intervalli [t0, t1] (in metri lungo il lato) in cui c'è un'altra stanza dall'altra parte
function neighbours(r, e) {
  const out = [], L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
  const dir = [(e.b[0] - e.a[0]) / L, (e.b[1] - e.a[1]) / L];
  for (const o of rooms) {
    if (o === r) continue;
    for (const oe of edgesOf(o)) {
      if (oe.inward[0] !== -e.inward[0] || oe.inward[1] !== -e.inward[1]) continue;
      // stesso allineamento?
      if (e.inward[0] === 0 ? Math.abs(oe.a[1] - e.a[1]) > 1e-6 : Math.abs(oe.a[0] - e.a[0]) > 1e-6) continue;
      const ta = (oe.a[0] - e.a[0]) * dir[0] + (oe.a[1] - e.a[1]) * dir[1], tb = (oe.b[0] - e.a[0]) * dir[0] + (oe.b[1] - e.a[1]) * dir[1];
      const t0 = Math.max(0, Math.min(ta, tb)), t1 = Math.min(L, Math.max(ta, tb));
      if (t1 > t0 + 1e-6) out.push({ t0, t1, room: o });
    }
  }
  return out;
}
function subtract(segs, cuts) {
  for (const [c0, c1] of cuts) segs = segs.flatMap(([s0, s1]) => (c1 <= s0 || c0 >= s1) ? [[s0, s1]] : [[s0, Math.max(s0, c0)], [Math.min(s1, c1), s1]].filter(([a, b]) => b - a > 1e-4));
  return segs;
}
function doorCuts(e) {
  const L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]), dir = [(e.b[0] - e.a[0]) / L, (e.b[1] - e.a[1]) / L];
  const cuts = [];
  for (const d of doors) {
    const onLine = e.inward[0] === 0 ? (!d.vertical && Math.abs(d.c[1] - e.a[1]) < 1e-6) : (d.vertical && Math.abs(d.c[0] - e.a[0]) < 1e-6);
    if (!onLine) continue;
    const ta = (d.a[0] - e.a[0]) * dir[0] + (d.a[1] - e.a[1]) * dir[1], tb = (d.b[0] - e.a[0]) * dir[0] + (d.b[1] - e.a[1]) * dir[1];
    const t0 = Math.min(ta, tb), t1 = Math.max(ta, tb);
    if (t1 > 0 && t0 < L) cuts.push([t0, t1, d]);
  }
  return cuts;
}
const at = (e, t, off = 0) => {
  const L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
  return [e.a[0] + (e.b[0] - e.a[0]) * t / L + e.inward[0] * off, e.a[1] + (e.b[1] - e.a[1]) * t / L + e.inward[1] * off];
};
function buildRoom(r) {
  const fm = MAT[r.floor] || MAT.tiles;
  const fs = { court: 1, cobble: 1.8, grass: 3, terrazzo: 1.6, rubber: 0.8, tiles: 2.4, lighttiles: 2.4, greytiles: 0.6, beige: 2 }[r.floor] || 1;
  if (r.floor === "court") {
    quad([r.x0, 0, r.z1], [r.x1, 0, r.z1], [r.x1, 0, r.z0], [r.x0, 0, r.z0], [0, 0, 1, 0, 1, 1, 0, 1], fm);
  } else floorQuad(r.x0, r.z0, r.x1, r.z1, 0, fm, fs);
  if (!r.outdoor) {
    const cm = MAT[r.ceil] || MAT.panels;
    const cs = { stripes: 2.4, woodceil: 6, acoustic: 4 }[r.ceil] || 1.2;
    floorQuad(r.x0, r.z0, r.x1, r.z1, r.h, cm, cs, true);
    box(r.x0 - T, r.h + 0.03, r.z0 - T, r.x1 + T, (r.extH || r.h + 0.4) + 0.05, r.z1 + T, MAT.roof, false); // tetto/solaio visto da fuori
  }
  if (r.roof) box(r.x0 + 1.2, 3.3, r.z0, r.x1 - 0.4, 3.55, r.z1, MAT.roof, false);
  for (const e of edgesOf(r)) {
    const L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
    const nb = neighbours(r, e);
    const cuts = doorCuts(e);
    const glass = (r.glass || []).includes(e.side);
    let segs = [[0, L]];
    if (r.outdoor) segs = subtract(segs, nb.map((n) => [n.t0, n.t1])); // all'aperto: il muro lo mette la stanza accanto (o niente)
    const solid = subtract(segs, cuts.map((c) => [c[0], c[1]]));
    const kind = r.outdoor ? (r.edge && r.edge[e.side]) || "facade" : "wall";
    if (kind === "none") continue; // nessun muro: si prosegue nel cortile della scuola
    const H = r.outdoor ? (kind === "facade" ? 7.5 : kind === "hedge" ? 1.4 : 2.1) : r.h;
    const wm = r.outdoor ? MAT[kind] : (MAT[r.wall] || MAT.white);
    const ws = r.wall === "gym" ? 6 : r.wall === "cream" || r.wall === "white" ? 4 : r.wall === "panelpink" ? 1.4 : 2;
    for (const [t0, t1] of solid) {
      const A = at(e, t0, r.outdoor ? 0 : T), B = at(e, t1, r.outdoor ? 0 : T);
      // lato interno (verso la stanza)
      if (glass) {
        wallQuad(A[0], A[1], B[0], B[1], 0, 0.9, MAT.panelpink, 2);
        wallQuad(A[0], A[1], B[0], B[1], 0.9, H, MAT.glass, 2);
        for (let t = t0; t <= t1 + 1e-6; t += 1.6) { const P = at(e, t, T); box(P[0] - 0.04, 0, P[1] - 0.04, P[0] + 0.04, H, P[1] + 0.04, MAT.frame, false); }
        box(Math.min(A[0], B[0]) - 0.04, 0.88, Math.min(A[1], B[1]) - 0.04, Math.max(A[0], B[0]) + 0.04, 0.95, Math.max(A[1], B[1]) + 0.04, MAT.frame, false);
      } else if (kind === "fence") {
        wallQuad(A[0], A[1], B[0], B[1], 0, H, MAT.fence, 2, H);
      } else {
        wallQuad(A[0], A[1], B[0], B[1], 0, H, wm, r.outdoor ? 8 : ws, r.outdoor ? 7.5 : (r.wall === "gym" ? r.h : r.wall === "cream" ? r.h : ws), t0);
        if (!r.outdoor) { // battiscopa, ombreggiatura negli angoli, finestre (foto vera)
          const a2 = at(e, t0, T + 0.01), b2 = at(e, t1, T + 0.01);
          wallQuad(a2[0], a2[1], b2[0], b2[1], 0, 0.08, MAT.darkgrey, 1);
          const a3 = at(e, t0, T + 0.012), b3 = at(e, t1, T + 0.012);
          quad([a3[0], 0.08, a3[1]], [b3[0], 0.08, b3[1]], [b3[0], Math.min(1, r.h * 0.3), b3[1]], [a3[0], Math.min(1, r.h * 0.3), a3[1]], [0, 0, 1, 0, 1, 1, 0, 1], MAT.aoWall);
          quad([b3[0], r.h - 0.01, b3[1]], [a3[0], r.h - 0.01, a3[1]], [a3[0], r.h - 0.6, a3[1]], [b3[0], r.h - 0.6, b3[1]], [0, 0, 1, 0, 1, 1, 0, 1], MAT.aoWall);
          // ombra sul pavimento lungo il muro
          const f0 = at(e, t0, T + 0.01), f1 = at(e, t1, T + 0.01), g0 = at(e, t0, T + 0.7), g1 = at(e, t1, T + 0.7);
          quad([g0[0], 0.004, g0[1]], [g1[0], 0.004, g1[1]], [f1[0], 0.004, f1[1]], [f0[0], 0.004, f0[1]], [0, 1, 0, 1, 0, 0.02, 0, 0.02], MAT.aoWall);
          if ((r.windows || []).includes(e.side) && t1 - t0 > 5) {
            for (let t = t0 + 0.4; t + 5.6 <= t1 - 0.3; t += 6.4) {
              const p0 = at(e, t, T + 0.015), p1 = at(e, t + 5.6, T + 0.015);
              const vt = (r.h + 0.9) / 6;
              quad([p0[0], 0, p0[1]], [p1[0], 0, p1[1]], [p1[0], r.h, p1[1]], [p0[0], r.h, p0[1]], [0.03, 0.15, 0.97, 0.15, 0.97, Math.min(1, vt), 0.03, Math.min(1, vt)], MAT.windowsPhoto);
            }
          }
        }
      }
      // lato esterno (facciata) e spessore
      if (!r.outdoor && !glass) {
        const eA = at(e, t1, 0), eB = at(e, t0, 0);
        wallQuad(eA[0], eA[1], eB[0], eB[1], 0, r.extH || r.h + 0.4, MAT.facade, 8, 7.5, L - t1);
      }
      if (kind !== "fence" && kind !== "hedge" || r.outdoor) {
        const P0 = at(e, t0, 0), P1 = at(e, t1, r.outdoor ? 0.25 : T);
        block(P0[0], P0[1], P1[0], P1[1], true);
      }
    }
    // sopra le porte
    for (const [t0, t1, d] of cuts) {
      if (r.outdoor) continue;
      const A = at(e, Math.max(0, t0), T), B = at(e, Math.min(L, t1), T);
      const hb = d.kind === "glassWide" ? r.h - 0.15 : d.kind === "open" ? Math.min(...d.rooms.map((o) => o.outdoor ? 99 : o.h), r.h) : DOOR_H;
      if (hb < r.h - 0.01) wallQuad(A[0], A[1], B[0], B[1], hb, r.h, wm, ws, ws);
      const eA = at(e, Math.min(L, t1), 0), eB = at(e, Math.max(0, t0), 0);
      wallQuad(eA[0], eA[1], eB[0], eB[1], Math.min(hb, r.extH || r.h + 0.4), r.extH || r.h + 0.4, MAT.facade, 8, 7.5, L - t1);
      // stipiti
      for (const t of [t0, t1]) { const P = at(e, t, 0), Q = at(e, t, T); if (d.kind !== "open") box(Math.min(P[0], Q[0]) - 0.03, 0, Math.min(P[1], Q[1]) - 0.03, Math.max(P[0], Q[0]) + 0.03, DOOR_H, Math.max(P[1], Q[1]) + 0.03, d.kind === "wood" ? MAT.lightwood : MAT.frame, false); }
    }
  }
}
rooms.forEach(buildRoom);
// terreno esterno e cielo
floorQuad(-300, -400, 400, 400, -0.03, MAT.grass, 3);
// ---------- Area della scuola: pavimentazione, recinto, edifici visti da fuori, campetto e pista ----------
function polyFloor(P, y, mat, s = 1) {
  const sh = new THREE.Shape(P.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / s, -pos.getZ(i) / s);
  addGeo(g, mat, false);
}
function orientOut(P) { // lati con la normale (−dz, dx) verso l'esterno
  let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] * P[i][1] - P[i][0] * P[j][1]);
  return a > 0 ? P.slice().reverse() : P.slice();
}
if (CAMPUS) {
  // strada davanti alla scuola
  const S = CAMPUS.perimeter;
  floorQuad(-120, 128, 200, 142, -0.015, MAT.asphalt, 6);
  floorQuad(-120, 124.6, 200, 128, -0.01, MAT.cobble, 1.8);
  polyFloor(S, -0.012, std({ map: TEX.asphalt, color: 0xd8d2c8, roughness: 1 }), 6);
  // recinto con il cancello d'ingresso
  const P = orientOut(S);
  for (let i = 0; i < P.length; i++) {
    const A = P[i], B = P[(i + 1) % P.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const dir = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
    let segs = [[0, L]];
    // il cancello sta sul lato sud
    if (Math.abs(dir[1]) < 0.3) { const tg = CAMPUS.gate.map((x) => (x - A[0]) / dir[0]).sort((a, b) => a - b); if (tg[1] > 0 && tg[0] < L) segs = subtract(segs, [tg]); }
    for (const [t0, t1] of segs) {
      const a = [A[0] + dir[0] * t0, A[1] + dir[1] * t0], b = [A[0] + dir[0] * t1, A[1] + dir[1] * t1];
      wallQuad(a[0], a[1], b[0], b[1], 0, 2.1, MAT.fence, 2, 2.1);
      for (let t = t0; t <= t1; t += 3) cyl(A[0] + dir[0] * t, 0, A[1] + dir[1] * t, 0.04, 2.15, MAT.frame, 6, 0.04, false);
    }
  }
  for (const x of CAMPUS.gate) cyl(x, 0, S[2][1] + (S[3][1] - S[2][1]) * (x - S[2][0]) / (S[3][0] - S[2][0]), 0.15, 2.4, MAT.darkgrey, 10);
  // edifici visti da fuori (facciate e tetto sui contorni veri), con i varchi delle porte
  for (const f of CAMPUS.footprints) {
    const Q = orientOut(f.pts);
    for (let i = 0; i < Q.length; i++) {
      const A = Q[i], B = Q[(i + 1) % Q.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (L < 0.3) continue;
      const dir = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], nrm = [-dir[1], dir[0]]; // nrm verso l'esterno
      const cuts = [];
      for (const d of doors) {
        const vx = d.c[0] - A[0], vz = d.c[1] - A[1], t = vx * dir[0] + vz * dir[1], off = vx * nrm[0] + vz * nrm[1];
        if (Math.abs(off) < 1.3 && t > -d.w && t < L + d.w) cuts.push([t - d.w / 2 - 0.25, t + d.w / 2 + 0.25]);
      }
      // anche dove una stanza esterna (cortile, portico) si appoggia all'edificio con il portico coperto
      const inset = 0.15;
      for (const [t0, t1] of subtract([[0, L]], cuts)) {
        const a = [A[0] + dir[0] * t0 - nrm[0] * inset, A[1] + dir[1] * t0 - nrm[1] * inset], b = [A[0] + dir[0] * t1 - nrm[0] * inset, A[1] + dir[1] * t1 - nrm[1] * inset];
        wallQuad(a[0], a[1], b[0], b[1], 0, f.h, MAT.facade, 8, 7.5, t0);
      }
      for (const [t0, t1] of cuts) { // sopra i varchi
        const a = [A[0] + dir[0] * Math.max(0, t0) - nrm[0] * inset, A[1] + dir[1] * Math.max(0, t0) - nrm[1] * inset], b = [A[0] + dir[0] * Math.min(L, t1) - nrm[0] * inset, A[1] + dir[1] * Math.min(L, t1) - nrm[1] * inset];
        if (t1 > 0 && t0 < L) wallQuad(a[0], a[1], b[0], b[1], 3.7, f.h, MAT.facade, 8, 7.5, t0);
      }
      // cornicione
      box(Math.min(A[0], B[0]) - 0.1, f.h, Math.min(A[1], B[1]) - 0.1, Math.max(A[0], B[0]) + 0.1, f.h + 0.35, Math.max(A[1], B[1]) + 0.1, MAT.concrete, false);
    }
    polyFloor(f.pts, f.h + 0.3, std({ color: 0xdedcd6, roughness: 0.9 }), 4);
  }
  // campetto con gli spalti e pista d'atletica
  polyFloor(CAMPUS.field, 0.01, std({ color: 0xb5553e, roughness: 0.95 }), 2);
  {
    const xs = CAMPUS.field.map((p) => p[0]), zs = CAMPUS.field.map((p) => p[1]);
    const x0 = Math.min(...xs) + 6, x1 = Math.max(...xs) - 2, z0 = Math.min(...zs) + 3, z1 = Math.max(...zs) - 3;
    for (const [a, b, c, d] of [[x0, z0, x1, z0 + 0.1], [x0, z1 - 0.1, x1, z1], [x0, z0, x0 + 0.1, z1], [x1 - 0.1, z0, x1, z1], [x0, (z0 + z1) / 2 - 0.05, x1, (z0 + z1) / 2 + 0.05]]) box(a, 0.012, b, c, 0.02, d, MAT.light, false);
    for (const z of [z0, z1]) { box((x0 + x1) / 2 - 1.5, 0, z - 0.05, (x0 + x1) / 2 + 1.5, 2, z + 0.05, MAT.light); }
    for (let i = 0; i < 4; i++) box(Math.min(...xs) + 0.3 + i * 0.8, 0, z0, Math.min(...xs) + 1.1 + i * 0.8, 0.45 * (i + 1), z1, i % 2 ? MAT.concrete : MAT.grey, true);
    block(Math.min(...xs), z0, Math.min(...xs) + 3.5, z1);
  }
  polyFloor(CAMPUS.track, 0.01, std({ color: 0xb4432f, roughness: 0.95 }), 2);
}
{
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), new THREE.MeshBasicMaterial({ map: TEX.sky, side: THREE.BackSide, fog: false }));
  sky.position.set(130, 0, 20); scene.add(sky);
}

// ---------- Porte (si aprono da sole quando il robot si avvicina) ----------
for (const d of doors) {
  if (d.kind === "open") continue;
  const n = d.vertical ? [1, 0] : [0, 1];
  const along = d.vertical ? [0, 1] : [1, 0];
  const mat = d.kind === "wood" ? (d.w < 3 ? MAT.doorWood : MAT.wood) : MAT.glass;
  const top = d.kind === "glassWide" ? Math.min(...d.rooms.map((r) => r.h)) - 0.15 : DOOR_H;
  const halves = d.kind === "wood" && d.w < 3 ? [1] : [-1, 1];
  for (const s of halves) {
    const pw = halves.length === 1 ? d.w : d.w / 2;
    const g = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(pw - 0.04, top - 0.04, 0.06), mat);
    panel.position.y = top / 2; g.add(panel);
    if (mat === MAT.glass) {
      for (const [w, h, x, y] of [[pw, 0.06, 0, top - 0.05], [pw, 0.06, 0, 0.05], [0.06, top, -pw / 2 + 0.03, top / 2], [0.06, top, pw / 2 - 0.03, top / 2], [pw * 0.7, 0.05, 0, 1.05]]) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), MAT.alu); f.position.set(x, y, 0); g.add(f);
      }
    } else {
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.12), MAT.alu); k.position.set((pw / 2 - 0.12) * -s, 1.05, 0); g.add(k);
    }
    g.rotation.y = d.vertical ? -Math.PI / 2 : 0;
    scene.add(g);
    d.panels.push({ g, s, pw, home: new THREE.Vector3(d.c[0] + along[0] * s * (halves.length === 1 ? 0 : pw / 2), 0, d.c[1] + along[1] * s * (halves.length === 1 ? 0 : pw / 2)) });
  }
  if (d.lock && ESCAPE) d.lockBox = d.vertical ? [d.c[0] - 0.2, d.c[1] - d.w / 2, d.c[0] + 0.2, d.c[1] + d.w / 2] : [d.c[0] - d.w / 2, d.c[1] - 0.2, d.c[0] + d.w / 2, d.c[1] + 0.2];
  d.n = n; d.along = along;
}
function updateDoors(dt, p) {
  for (const d of doors) {
    if (!d.panels.length) continue;
    const dist = Math.hypot(p.x - d.c[0], p.y - d.c[1]);
    const want = !isLocked(d) && dist < 3.2 ? 1 : 0;
    d.open += (want - d.open) * Math.min(1, dt * 5);
    for (const pn of d.panels) {
      { // vetrata scorrevole
        const slide = d.open * pn.pw * 0.92 * pn.s;
        pn.g.position.set(pn.home.x + d.along[0] * slide, 0, pn.home.z + d.along[1] * slide);
      }
    }
  }
}

// ---------- Arredi ----------
const lightsList = [];
function ceilingLights(r, sx = 3.2, sz = 3.2, w = 1.2, d = 0.3) {
  for (let x = r.x0 + sx / 2; x < r.x1; x += sx) for (let z = r.z0 + sz / 2; z < r.z1; z += sz) box(x - w / 2, r.h - 0.04, z - d / 2, x + w / 2, r.h - 0.01, z + d / 2, MAT.light, false);
}
function chair(x, z, ry, seat = MAT.black, frame = MAT.darkgrey) {
  local(x, z, ry, () => {
    box(-0.22, 0.42, -0.22, 0.22, 0.48, 0.22, seat); box(-0.22, 0.48, 0.18, 0.22, 0.9, 0.23, seat);
    for (const [a, b] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) box(a - 0.02, 0, b - 0.02, a + 0.02, 0.42, b + 0.02, frame);
  });
}
function desk(x, z, ry, w = 1.2, d = 0.6, top = MAT.lightwood, h = 0.76) {
  local(x, z, ry, () => {
    box(-w / 2, h - 0.04, -d / 2, w / 2, h, d / 2, top);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(a * (w / 2 - 0.05) - 0.025, 0, b * (d / 2 - 0.05) - 0.025, a * (w / 2 - 0.05) + 0.025, h - 0.04, b * (d / 2 - 0.05) + 0.025, MAT.darkgrey);
  });
}
function planter(x, z) {
  cyl(x, 0, z, 1.25, 0.65, MAT.concrete, 28); cyl(x, 0.6, z, 1.1, 0.64, std({ color: 0x5b4636 }), 24, 1.1, false);
  cyl(x, 0.6, z, 0.12, 2.2, MAT.trunk, 8);
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; local(x, z, a, () => { const g = new THREE.BoxGeometry(0.18, 0.04, 1.3); g.rotateX(-0.45); g.translate(0, 2.25, 0.55); addGeo(g, MAT.plant, true); }); }
  block(x - 1.2, z - 1.2, x + 1.2, z + 1.2);
}
function tree(x, z, s = 1) { cyl(x, 0, z, 0.18 * s, 2.6 * s, MAT.trunk, 8, 0.12 * s); sphere(x, 3.4 * s, z, 1.7 * s, MAT.leaves, 0.85); sphere(x + 0.8 * s, 3 * s, z + 0.3 * s, 1.1 * s, MAT.leaves2, 0.9); block(x - 0.3, z - 0.3, x + 0.3, z + 0.3); }
function column(x, z, r = 0.3, h = 3.6, mat = MAT.grey) { cyl(x, 0, z, r, h, mat, 20); block(x - r, z - r, x + r, z + r); }
function cabinetRow(x0, z0, x1, z1, h = 2, mat = MAT.cabinet, photoName = null, facing = 0) {
  box(x0, 0, z0, x1, h, z1, mat);
  if (photoName) {
    const w = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, depth = Math.min(Math.abs(x1 - x0), Math.abs(z1 - z0)) / 2 + 0.01;
    local(cx, cz, facing, () => quad([-w / 2, 0.05, depth], [w / 2, 0.05, depth], [w / 2, h - 0.05, depth], [-w / 2, h - 0.05, depth], [0, 0, 1, 0, 1, 1, 0, 1], photo(photoName)));
  }
  block(x0, z0, x1, z1);
}
function stairs(x0, z0, x1, z1, steps, h, dir) { // dir: verso in cui si sale (+1 = verso z1)
  const n = steps, dz = (z1 - z0) / n;
  for (let i = 0; i < n; i++) { const za = dir > 0 ? z0 + i * dz : z1 - (i + 1) * dz; box(x0, 0, za, x1, (i + 1) * h / n, za + dz, i % 2 ? MAT.red : std({ color: 0xb12a24 }), true); }
}
function bins(x, z, ry) { local(x, z, ry, () => { [MAT.blue, MAT.yellow, MAT.green].forEach((m, i) => cyl(-0.5 + i * 0.5, 0, 0, 0.2, 0.75, m, 12)); }); block(x - 0.8, z - 0.3, x + 0.8, z + 0.3); }
function machineLathe(x, z, ry, s = 1) {
  local(x, z, ry, () => {
    box(-1.6 * s, 0, -0.45, 1.6 * s, 0.05, 0.6, MAT.pallet);
    box(-1.4 * s, 0, -0.35, 1.4 * s, 0.85, 0.35, MAT.machine);
    box(-1.4 * s, 0.85, -0.2, -0.7 * s, 1.45, 0.3, MAT.machine);
    box(-0.7 * s, 0.95, -0.08, 1.3 * s, 1.05, 0.08, MAT.alu);
    box(0.9 * s, 0.85, -0.2, 1.25 * s, 1.25, 0.25, MAT.machine);
    cyl(-0.4 * s, 1.0, 0.2, 0.08, 1.3, MAT.alu, 10);
  });
  const c = Math.cos(ry), sn = Math.sin(ry), hw = 1.7 * s;
  block(x - Math.abs(c) * hw - Math.abs(sn) * 0.6, z - Math.abs(sn) * hw - Math.abs(c) * 0.6, x + Math.abs(c) * hw + Math.abs(sn) * 0.6, z + Math.abs(sn) * hw + Math.abs(c) * 0.6);
}
const R = roomById;
const FACE = { w: Math.PI / 2, e: -Math.PI / 2, n: 0, s: Math.PI };
function doorLabel(x, z, ry, txt) {
  const t = canvasTex(128, 48, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#1a237e"; g.font = "bold 30px Inter, sans-serif"; g.textAlign = "center"; g.fillText(txt, w / 2, 35); }, false);
  local(x, z, ry, () => quad([-0.25, 2.35, 0.05], [0.25, 2.35, 0.05], [0.25, 2.54, 0.05], [-0.25, 2.54, 0.05], [0, 0, 1, 0, 1, 1, 0, 1], std({ map: t })));
}
function wallDoor(x, z, ry, mat = MAT.doorGreen, w = 1.05, h = 2.2, label = null) {
  local(x, z, ry, () => {
    box(-w / 2 - 0.07, 0, -0.02, w / 2 + 0.07, h + 0.07, 0.03, MAT.lightwood, false);
    quad([-w / 2, 0, 0.035], [w / 2, 0, 0.035], [w / 2, h, 0.035], [-w / 2, h, 0.035], [0, 0, 1, 0, 1, 1, 0, 1], mat);
  });
  if (label) doorLabel(x, z, ry, label);
}
function onWall(r, side, t, off = 0.15) {
  if (side === "w") return [r.x0 + off, t, FACE.w];
  if (side === "e") return [r.x1 - off, t, FACE.e];
  if (side === "n") return [t, r.z0 + off, FACE.n];
  return [t, r.z1 - off, FACE.s];
}
const wallPic = (r, side, t, name, y, w, h, frame) => { const [x, z, ry] = onWall(r, side, t); picture(name, x, y, z, w, h, ry, frame); };
const wallDoorAt = (r, side, t, mat, w, h, label) => { const [x, z, ry] = onWall(r, side, t, 0.14); wallDoor(x, z, ry, mat, w, h, label); };
// blocca l'ingombro di un oggetto ruotato (larghezza w lungo la parete, profondità d)
function blockRot(x, z, ry, w, d) {
  const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
  block(x - (c * w + s * d) / 2, z - (s * w + c * d) / 2, x + (c * w + s * d) / 2, z + (s * w + c * d) / 2);
}
// oggetto appoggiato alla parete: centro a 'off' dalla parete (ry fa guardare dentro la stanza)
const atWall = (r, side, t, depth) => onWall(r, side, t, 0.14 + depth / 2);
function bench(x, z, ry, w = 2) {
  local(x, z, ry, () => { box(-w / 2, 0.42, -0.22, w / 2, 0.47, 0.22, MAT.lightwood); for (const s of [-1, 1]) box(s * (w / 2 - 0.1) - 0.04, 0, -0.18, s * (w / 2 - 0.1) + 0.04, 0.42, 0.18, MAT.darkgrey); });
  blockRot(x, z, ry, w, 0.5);
}
function extinguisher(x, z, ry) { local(x, z, ry, () => { cyl(0, 0.9, 0.12, 0.09, 1.45, MAT.red, 10, 0.09, false); box(-0.2, 1.5, 0.02, 0.2, 1.75, 0.04, std({ color: 0xd32f2f }), false); }); }
function radiator(x, z, ry, w = 1.2) { local(x, z, ry, () => { box(-w / 2, 0.15, 0.02, w / 2, 0.75, 0.12, MAT.labWhite, false); for (let k = -w / 2 + 0.05; k < w / 2; k += 0.1) box(k, 0.17, 0.12, k + 0.04, 0.73, 0.125, MAT.grey, false); }); }

// ---------- OGGETTI MODELLATI IN 3D ----------
const prodCols = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xfb8c00, 0x8e24aa, 0xffffff, 0x6d4c41, 0x00acc1].map((c) => std({ color: c, roughness: 0.5 }));
const vendBody = std({ color: 0x2b2d33, roughness: 0.4, metalness: 0.3 });
const glassDark = new THREE.MeshPhysicalMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false });
const glowWhite = std({ color: 0xffffff, emissive: 0xdde8ff, emissiveIntensity: 0.6 });
// distributore di snack e bibite: vetrina illuminata con le spirali e i prodotti, tastiera, sportello
function vendingSnack(x, z, ry, accent = 0xc62828) {
  local(x, z, ry, () => {
    box(-0.45, 0, -0.42, 0.45, 0.42, 0.42, vendBody); box(-0.45, 1.69, -0.42, 0.45, 1.85, 0.42, vendBody);   // base e cappello
    box(-0.45, 0.42, -0.42, 0.45, 1.69, -0.34, vendBody); box(-0.45, 0.42, -0.42, -0.41, 1.69, 0.42, vendBody); box(0.21, 0.42, -0.42, 0.45, 1.69, 0.42, vendBody);
    box(-0.45, 1.72, 0.42, 0.45, 1.85, 0.44, std({ color: accent, roughness: 0.4 }), false);
    box(-0.41, 0.42, -0.32, 0.2, 1.68, -0.28, glowWhite, false);          // fondo luminoso
    for (let r = 0; r < 5; r++) {
      const y = 0.48 + r * 0.24;
      box(-0.41, y - 0.01, -0.28, 0.2, y + 0.01, 0.38, MAT.alu, false);     // ripiano
      for (let c = 0; c < 5; c++) { const px = -0.36 + c * 0.11; box(px, y + 0.01, 0.12, px + 0.08, y + 0.15 + (c % 2) * 0.03, 0.34, prodCols[(r * 5 + c * 3) % prodCols.length], false); }
    }
    quad([-0.42, 0.42, 0.425], [0.21, 0.42, 0.425], [0.21, 1.69, 0.425], [-0.42, 1.69, 0.425], [0, 0, 1, 0, 1, 1, 0, 1], glassDark);
    box(0.24, 0.9, 0.42, 0.42, 1.6, 0.44, std({ color: 0x9ea3aa, metalness: 0.5, roughness: 0.3 }), false);   // tastiera
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) box(0.27 + c * 0.05, 1.25 + r * 0.06, 0.44, 0.31 + c * 0.05, 1.29 + r * 0.06, 0.45, MAT.black, false);
    box(0.27, 1.45, 0.44, 0.39, 1.55, 0.45, std({ color: 0x111111, emissive: 0x00e676, emissiveIntensity: 0.4 }), false);
    box(-0.38, 0.12, 0.42, 0.18, 0.36, 0.44, MAT.black, false);              // sportello di ritiro
  });
  blockRot(x, z, ry, 0.95, 0.9);
}
// distributore di caffè
function vendingCoffee(x, z, ry) {
  local(x, z, ry, () => {
    box(-0.36, 0, -0.38, 0.36, 1.83, 0.38, std({ color: 0x3e2723, roughness: 0.4, metalness: 0.2 }));
    box(-0.32, 1.2, 0.38, 0.32, 1.7, 0.4, std({ color: 0x5d4037, emissive: 0x3e2723, emissiveIntensity: 0.3 }), false);
    box(-0.25, 1.55, 0.4, 0.05, 1.65, 0.41, std({ color: 0x111111, emissive: 0x29b6f6, emissiveIntensity: 0.5 }), false);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) box(0.1 + c * 0.1, 1.25 + r * 0.08, 0.4, 0.17 + c * 0.1, 1.3 + r * 0.08, 0.42, MAT.alu, false);
    box(-0.15, 0.55, 0.3, 0.15, 0.85, 0.39, MAT.black, false);              // vano bicchiere
    box(-0.3, 0.05, 0.38, 0.3, 0.2, 0.4, MAT.alu, false);
  });
  blockRot(x, z, ry, 0.75, 0.8);
}
// vetrina in vetro con ripiani e oggetti (strumenti storici, trofei)
const trophyMat = std({ color: 0xd4af37, metalness: 0.8, roughness: 0.25 });
function displayCase(x, z, ry, w = 1.6, h = 2, d = 0.5, kind = "trophy") {
  local(x, z, ry, () => {
    box(-w / 2, 0, -d / 2, w / 2, 0.12, d / 2, MAT.labWhite); box(-w / 2, h - 0.06, -d / 2, w / 2, h, d / 2, MAT.labWhite);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(sx * w / 2 - 0.02, 0, sz * d / 2 - 0.02, sx * w / 2 + 0.02, h, sz * d / 2 + 0.02, MAT.alu, false);
    for (let k = 1; k <= 3; k++) {
      const y = 0.12 + k * (h - 0.18) / 4;
      box(-w / 2 + 0.03, y - 0.008, -d / 2 + 0.03, w / 2 - 0.03, y + 0.008, d / 2 - 0.03, MAT.glass, false);
      for (let i = 0; i < Math.floor(w / 0.3); i++) {
        const px = -w / 2 + 0.2 + i * 0.3;
        if (kind === "trophy") { cyl(px, y + 0.01, 0, 0.04, y + 0.06, MAT.black, 8, 0.05, false); cyl(px, y + 0.06, 0, 0.012, y + 0.16, trophyMat, 6, 0.012, false); cyl(px, y + 0.16, 0, 0.03, y + 0.24, trophyMat, 8, 0.055, false); }
        else { box(px - 0.08, y + 0.01, -0.08, px + 0.08, y + 0.06 + (i % 3) * 0.05, 0.08, i % 2 ? MAT.darkgrey : std({ color: 0x8d6e63 }), false); cyl(px + 0.05, y + 0.06, 0.05, 0.02, y + 0.2, MAT.alu, 6, 0.02, false); }
      }
    }
    for (const [a, b, c, e] of [[-w / 2, -d / 2, w / 2, -d / 2], [w / 2, d / 2, -w / 2, d / 2], [-w / 2, d / 2, -w / 2, -d / 2], [w / 2, -d / 2, w / 2, d / 2]]) quad([a, 0.12, b], [c, 0.12, e], [c, h - 0.06, e], [a, h - 0.06, b], [0, 0, 1, 0, 1, 1, 0, 1], MAT.glass);
  });
  blockRot(x, z, ry, w, d);
}
// armadio metallico grigio ad ante scorrevoli
const cabSeam = std({ color: 0x55585e, roughness: 0.5 });
function greyCabinet(x, z, ry, w = 2, h = 2, d = 0.6) {
  local(x, z, ry, () => {
    box(-w / 2, 0, -d / 2, w / 2, h, d / 2, MAT.cabinet);
    for (let k = -w / 2 + 1; k < w / 2 - 0.1; k += 1) box(k - 0.01, 0.05, d / 2, k + 0.01, h - 0.05, d / 2 + 0.005, cabSeam, false);
    for (let k = -w / 2 + 0.5; k < w / 2; k += 1) box(k + 0.36, 0.9, d / 2, k + 0.4, 1.2, d / 2 + 0.02, MAT.alu, false);
  });
  blockRot(x, z, ry, w, d);
}
// armadio da laboratorio con ante a vetri e vetreria colorata
const bottleCols = [0xbfe6ff, 0xffcc80, 0xa5d6a7, 0xef9a9a, 0xfff59d, 0xce93d8].map((c) => std({ color: c, transparent: true, opacity: 0.75, roughness: 0.1 }));
function labCabinet(x, z, ry, w = 2, h = 2.3, d = 0.5) {
  local(x, z, ry, () => {
    box(-w / 2, 0, -d / 2, w / 2, 0.9, d / 2, std({ color: 0xe8dfc5 }));
    box(-w / 2, 0.9, -d / 2, w / 2, h, -d / 2 + 0.05, std({ color: 0xe8dfc5 }));
    box(-w / 2, h - 0.06, -d / 2, w / 2, h, d / 2, std({ color: 0xe8dfc5 }));
    for (const sx of [-1, 1]) box(sx * w / 2 - 0.03, 0.9, -d / 2, sx * w / 2 + 0.03, h, d / 2, std({ color: 0xe8dfc5 }), false);
    for (let k = 0; k < 3; k++) {
      const y = 0.95 + k * 0.45; box(-w / 2, y, -d / 2, w / 2, y + 0.02, d / 2 - 0.03, std({ color: 0xd7ccb0 }), false);
      for (let i = 0; i < Math.floor(w / 0.16); i++) { const px = -w / 2 + 0.1 + i * 0.16; cyl(px, y + 0.02, 0, 0.04 + (i % 3) * 0.01, y + 0.14 + ((i + k) % 4) * 0.05, bottleCols[(i + k) % bottleCols.length], 8, 0.03, false); }
    }
    quad([-w / 2, 0.9, d / 2], [w / 2, 0.9, d / 2], [w / 2, h - 0.06, d / 2], [-w / 2, h - 0.06, d / 2], [0, 0, 1, 0, 1, 1, 0, 1], MAT.glass);
    box(-0.015, 0.92, d / 2, 0.015, h - 0.08, d / 2 + 0.01, std({ color: 0xd7ccb0 }), false);
    for (const sx of [-1, 1]) box(sx * 0.06 - 0.01, 0.45, d / 2, sx * 0.06 + 0.01, 0.6, d / 2 + 0.03, MAT.alu, false);
  });
  blockRot(x, z, ry, w, d);
}
// pannello di pneumatica: tavola rossa forata con cilindri, valvole e tubi blu
const holeTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#9b2d22"; g.fillRect(0, 0, w, h); g.fillStyle = "#4a120c"; for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); } });
const holeMat = std({ map: holeTex, roughness: 0.6 });
function pneumaticPanel(x, z, ry) {
  local(x, z, ry, () => {
    box(-1.1, 0.8, -0.06, 1.1, 2, 0, std({ color: 0x7a2119 }), true);
    quad([-1.08, 0.82, 0.002], [1.08, 0.82, 0.002], [1.08, 1.98, 0.002], [-1.08, 1.98, 0.002], [0, 0, 8, 0, 8, 4.3, 0, 4.3], holeMat);
    for (const [px, py] of [[-0.6, 1.75], [0.2, 1.75], [-0.6, 1.45], [0.2, 1.45]]) { const g = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 10); g.rotateZ(Math.PI / 2); g.translate(px + 0.3, py, 0.08); addGeo(g, MAT.alu, false); box(px - 0.05, py - 0.05, 0.03, px + 0.05, py + 0.05, 0.12, MAT.red, false); }
    for (let k = 0; k < 4; k++) box(-0.7 + k * 0.25, 1.05, 0.02, -0.55 + k * 0.25, 1.25, 0.14, MAT.black, false);
    box(-0.9, 1.0, 0.04, 0.9, 1.02, 0.06, std({ color: 0x1565c0 }), false);
    cyl(0.75, 1.0, 0.1, 0.07, 1.15, MAT.alu, 12, 0.07, false);
  });
}
// banco da laboratorio di elettronica con strumenti
function instrumentBench(x, z, ry, w = 3) {
  local(x, z, ry, () => {
    box(-w / 2, 0.8, -0.4, w / 2, 0.85, 0.4, std({ color: 0x546e7a }));
    box(-w / 2 + 0.05, 0, -0.35, -w / 2 + 0.55, 0.8, 0.35, std({ color: 0x37474f }));
    box(w / 2 - 0.55, 0, -0.35, w / 2 - 0.05, 0.8, 0.35, std({ color: 0x37474f }));
    box(-w / 2, 0.85, -0.4, w / 2, 1.5, -0.32, std({ color: 0x546e7a }));
    for (let k = 0; k < Math.floor(w / 0.6); k++) { const px = -w / 2 + 0.35 + k * 0.6; box(px - 0.2, 0.85, -0.3, px + 0.2, 1.07, 0.0, std({ color: 0xcfd8dc }), false); box(px - 0.16, 0.92, 0.001, px - 0.02, 1.02, 0.005, std({ color: 0x111111, emissive: 0x43a047, emissiveIntensity: 0.5 }), false); }
  });
  blockRot(x, z, ry, w, 0.8);
}
function tableRow(x0, z, x1, mat = MAT.lightwood) { // tavolo lungo della mensa con le sedute
  box(x0, 0.72, z - 0.4, x1, 0.76, z + 0.4, mat); box(x0 + 0.2, 0, z - 0.05, x1 - 0.2, 0.72, z + 0.05, MAT.darkgrey);
  for (let x = x0 + 0.35; x < x1 - 0.2; x += 0.6) { chair(x, z - 0.7, Math.PI, std({ color: 0x1e1f23 }), std({ color: 0xf2b134 })); chair(x, z + 0.7, 0, std({ color: 0x1e1f23 }), std({ color: 0xf2b134 })); }
  block(x0, z - 0.45, x1, z + 0.45);
}

if (!MAP.labs) {
// ---------------- PIAZZALE E PENSILINA ----------------
{
  box(-19.5, 4.1, 114.3, -8, 4.5, 121.5, MAT.roof, true);
  box(-19.5, 3.95, 121.4, -8, 4.6, 121.6, std({ color: 0x1c4f8f }), false);
  local(-13.75, 121.62, 0, () => quad([-5.6, 3.97, 0], [5.6, 3.97, 0], [5.6, 4.58, 0], [-5.6, 4.58, 0], [0, 0, 1, 0, 1, 1, 0, 1], std({ map: TEX.othoca, emissive: 0x111111 })));
  for (const x of [-19, -8.5]) column(x, 121, 0.28, 4.1, std({ color: 0xe7a99d }));
  box(-24, 0, 114.3, -20, 3.2, 117.5, std({ color: 0xd8d2ca }), true); block(-24, 114.3, -20, 117.5);
  for (let i = 0; i < 9; i++) box(-24, 0, 117.5 + i * 0.35, -20, 3.2 - i * 0.35, 117.85 + i * 0.35, MAT.concrete, true);
  block(-24, 117.5, -20, 120.7);
  for (const [x, c] of [[2, 0xffffff], [3.4, 0x2e7d32], [4.8, 0x1565c0]]) {
    cyl(x, 0, 121.2, 0.06, 9, MAT.alu, 8);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), std({ color: c, side: THREE.DoubleSide })); f.position.set(x + 0.72, 8.4, 121.2); scene.add(f); f.userData.flag = Math.random() * 6; lightsList.push(f);
  }
}

// ---------------- INGRESSO ----------------
{
  const r = R.vestibolo; ceilingLights(r, 3.4, 3.6);
  wallPic(r, "e", 103, "bacheca_disegni", 1.8, 8, 1.5, MAT.green);
  wallPic(r, "e", 95, "bacheca_atrio", 1.6, 2.8, 1.7, MAT.alu);
  bench(-16.9, 107, Math.PI / 2); bench(-16.9, 94, Math.PI / 2);
  box(-15.5, 0.003, 111.5, -11.8, 0.012, 114.2, MAT.black, false);
  box(-17.4, 0.004, 104, -9.9, 0.009, 104.1, MAT.yellow, false);
  for (const [x0, x1] of [[-17.6, -16.5], [-10.8, -9.7]]) { box(x0, 0, 90.13, x1, 2.6, 90.18, MAT.glass, false); box(x0, 2.55, 90.1, x1, 2.62, 90.2, MAT.frame, false); }
  radiator(-9.75, 108, FACE.e);
  displayCase(-16.95, 100.5, FACE.w, 1.6, 2, 0.5, "trophy");
}

// ---------------- ATRIO ----------------
{
  const r = R.atrio; ceilingLights(r, 3.4, 3.4);
  column(-7.7, 79.6, 0.3, r.h); column(-7.7, 83.1, 0.32, r.h, std({ color: 0xc0392b })); column(-7.7, 86.6, 0.3, r.h); column(-1, 86.4, 0.3, r.h);
  // portineria
  box(-3.8, 0, 78.2, -2.8, 0.76, 82, MAT.labWhite); box(-3.85, 0.76, 78.15, -2.75, 0.8, 82.05, std({ color: 0x9ccc65 })); block(-3.8, 78.2, -2.8, 82);
  for (let k = 0; k < 3; k++) chair(-2.2, 78.8 + k * 1.2, -Math.PI / 2, MAT.blue);
  box(-3.7, 0.8, 79.2, -3.6, 1.2, 79.7, MAT.black);
  // vetrine con gli strumenti storici e murale del mondo
  displayCase(r.x1 - 0.4, 80.8, FACE.e, 1.8, 2, 0.5, "instr");
  displayCase(r.x1 - 0.4, 83, FACE.e, 1.8, 2, 0.5, "instr");
  const globe = canvasTex(256, 256, (g) => {
    g.fillStyle = "#f4f2ee"; g.fillRect(0, 0, 256, 256);
    const gr = g.createRadialGradient(110, 110, 10, 128, 128, 100); gr.addColorStop(0, "#7fd3f7"); gr.addColorStop(1, "#1565c0");
    g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 96, 0, 7); g.fill();
    g.fillStyle = "#43a047"; for (const [x, y, a, b] of [[95, 100, 30, 22], [150, 90, 26, 34], [120, 165, 34, 18], [175, 150, 16, 22]]) { g.beginPath(); g.ellipse(x, y, a, b, 0.4, 0, 7); g.fill(); }
  }, false);
  local(r.x1 - 0.13, 86.5, FACE.e, () => quad([-1.1, 1.0, 0.01], [1.1, 1.0, 0.01], [1.1, 3.2, 0.01], [-1.1, 3.2, 0.01], [0, 0, 1, 0, 1, 1, 0, 1], std({ map: globe })));
  wallPic(r, "n", -14, "bacheca_atrio", 1.6, 1.8, 1.2, std({ color: 0x1e88e5 }));
  box(r.x0 + 0.15, 0, 84.5, r.x0 + 0.3, 2.2, 87, std({ color: 0x4db6ac }), true); block(r.x0 + 0.1, 84.5, r.x0 + 0.35, 87);
  bench(-16.9, 80, Math.PI / 2);
  const foot = std({ color: 0xc62828, roughness: 0.6 });
  for (let k = 0; k < 14; k++) { const t = k / 13, x = -13.6 + t * 6.1, z = 89.5 - t * 12.8; local(x + (k % 2 ? 0.18 : -0.18), z, Math.PI + 0.45, () => floorQuad(-0.09, -0.15, 0.09, 0.15, 0.006, foot, 1)); }
  box(-17.4, 0.004, 88, 5.4, 0.009, 88.1, MAT.yellow, false);
  extinguisher(r.x1 - 0.12, 88.6, FACE.e);
  // sala professori
  const S = R.salaProf; ceilingLights(S, 2.6, 3.3, 1.1, 0.25);
  box(1.8, 0.74, 68, 4.4, 0.78, 73, MAT.wood); box(2.9, 0, 70, 3.3, 0.74, 71, MAT.darkgrey); block(1.8, 68, 4.4, 73);
  for (let z = 68.5; z < 73; z += 1) { chair(1.4, z, Math.PI / 2, MAT.blue); chair(4.8, z, -Math.PI / 2, MAT.blue); }
  for (let z = 66.4; z < 75; z += 0.62) box(S.x1 - 0.55, 0, z, S.x1 - 0.14, 1.9, z + 0.58, std({ color: 0x8d5a2b, roughness: 0.6 }), true);
  block(S.x1 - 0.6, 66.2, S.x1, 75.6);
}

// ---------------- ANDITO: distributori, scala, fioriera, murale, vetrine ----------------
{
  const A = R.andito; ceilingLights(A, 3.15, 3, 0.2, 1.1);
  vendingSnack(-10.12, 74.6, FACE.w, 0xc62828); vendingSnack(-10.12, 73.6, FACE.w, 0x1565c0); vendingCoffee(-10.12, 72.7, FACE.w);
  // scrivania con il vecchio monitor (enigma dei pixel)
  desk(-10.15, 71.3, FACE.w, 1.0, 0.7, MAT.labWhite);
  local(-10.2, 71.3, FACE.w, () => { box(-0.25, 0.76, -0.2, 0.25, 1.22, 0.2, std({ color: 0xd8d2c0 })); box(-0.2, 0.82, 0.2, 0.2, 1.16, 0.205, MAT.black); });
  block(-10.55, 70.8, -9.8, 71.8);
  bins(-5.0, 75.4, Math.PI);
  // scala rossa
  for (let i = 0; i < 9; i++) { const x = -3.9 + i * 0.5; box(x, 0, 71, x + 0.5, (i + 1) * 0.3, 75, i % 2 ? MAT.red : std({ color: 0xb12a24 }), true); }
  block(-2.4, 71, 0.5, 75);
  box(-3.9, 0.9, 70.85, 0.4, 1, 70.9, MAT.alu, false);
  // fioriera sotto il lucernario, murale, bacheche, aule
  const F = R.anditoF; ceilingLights(F, 3.15, 3.6, 0.2, 1.1);
  planter(-7.4, 61.2);
  { const m = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), MAT.sky); m.rotation.x = Math.PI / 2; m.position.set(-7.4, F.h - 0.02, 61.2); scene.add(m); box(-9, F.h - 0.05, 59.6, -5.8, F.h - 0.03, 62.8, std({ color: 0x3b3027 }), false); }
  wallPic(F, "e", 64.4 + 0.1, "murale_rosa", 1.75, 1.0, 1.0, MAT.white);
  wallPic(F, "w", 64.5, "murale_rosa", 1.75, 3.8, 1.9, MAT.white);
  { const [x, z, ry] = onWall(F, "e", 66.5); local(x, z, ry, () => box(-0.75, 0.95, 0, 0.75, 2.25, 0.03, std({ color: 0xa3124a }), false)); }
  { const [x, z, ry] = onWall(F, "e", 56); local(x, z, ry, () => box(-0.9, 0.95, 0, 0.9, 2.2, 0.03, std({ color: 0x26a69a }), false)); }
  [[68, "A10"], [60.5, "A11"]].forEach(([z, l]) => wallDoorAt(F, "w", z, MAT.doorGreen, 1.05, 2.2, l));
  displayCase(-10.4, 56, FACE.w, 1.6, 2, 0.5, "trophy");
  bins(-5, 54.5, Math.PI);
  extinguisher(F.x1 - 0.12, 69, FACE.e); radiator(F.x0 + 0.13, 63, FACE.w);
  ceilingLights(R.passaggio, 3.3, 4, 1.1, 0.2);
  // tratto con le palme e le aule A12, A13
  const P = R.andito2; ceilingLights(P, 3.1, 3.6, 1.1, 0.2);
  const palm = (x, z) => {
    cyl(x, 0, z, 1.05, 0.65, MAT.concrete, 28); cyl(x, 0.6, z, 0.9, 0.64, std({ color: 0x5b4636 }), 24, 0.9, false);
    cyl(x, 0.6, z, 0.1, 2.5, MAT.trunk, 8);
    for (let k = 0; k < 9; k++) local(x, z, k / 9 * Math.PI * 2, () => { const g = new THREE.BoxGeometry(0.22, 0.03, 1.5); g.rotateX(-0.35); g.translate(0, 2.55, 0.65); addGeo(g, MAT.plant, true); });
    block(x - 1, z - 1, x + 1, z + 1);
  };
  palm(-10.2, 48.5); palm(-4.8, 48.5);
  [[51.5, "A12"], [45, "A13"]].forEach(([z, l]) => wallDoorAt(P, "w", z, MAT.doorGreen, 1.05, 2.2, l));
  [[51, "A17"], [45.5, "A16"]].forEach(([z, l]) => wallDoorAt(P, "e", z, MAT.doorGreen, 1.05, 2.2, l));
  // scritta sul pavimento
  const word = canvasTex(512, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#1a1a2e"; g.font = "bold 44px Inter, sans-serif"; g.textAlign = "center"; g.fillText("a m b i e n t e", w / 2, 48); }, false);
  local(-7.5, 52.3, 0, () => quad([-2.2, 0.008, 0.4], [2.2, 0.008, 0.4], [2.2, 0.008, -0.4], [-2.2, 0.008, -0.4], [0, 0, 1, 0, 1, 1, 0, 1], new THREE.MeshBasicMaterial({ map: word, transparent: true })));
  // mensa: file di tavoli, colonne, scala A14 nell'angolo
  const M = R.mensa; ceilingLights(M, 4, 3.4, 1.4, 0.25);
  for (const z of [16, 21, 26, 31, 36]) for (const x of [-12, -0.5]) column(x, z, 0.25, M.h, MAT.labWhite);
  for (let z = 13.5; z < 40; z += 2.6) { tableRow(-16.8, z, -12.8); tableRow(-11.2, z, -1.3); }
  box(0.5, 0, 11.2, 5.4, M.h, 18, std({ color: 0xe7a99d }), true); block(0.4, 11, 5.6, 18.2);
  wallDoorAt(M, "e", 22, MAT.doorGreen, 1.1, 2.2, "A14");
  wallPic(M, "s", 3, "bacheca_disegni", 1.8, 3, 1.2, MAT.wood);
}

// ---------------- CORRIDOIO E PALAZZETTO ----------------
{
  ceilingLights(R.corrPal, 2.5, 3.5, 1.1, 0.3); ceilingLights(R.corrPal2, 2.5, 3.5, 1.1, 0.3);
  for (const z of [91.6, 93.5, 95.4]) { box(-2.88, 0.6, z - 0.6, -2.6, 2.1, z + 0.6, z === 93.5 ? std({ color: 0xd9d4c4, metalness: 0.2 }) : std({ color: 0xc9c3b4 }), true); block(-2.9, z - 0.6, -2.58, z + 0.6); }
  box(-2.6, 1.2, 93.1, -2.58, 1.8, 93.9, MAT.black, false);
  wallDoorAt(R.corrPal2, "w", 101.5, MAT.doorGreen, 1.1, 2.2);
  extinguisher(-2.88, 103, FACE.w);
  box(-0.13, 1.0, 97.9, -0.05, 1.8, 98.7, MAT.darkgrey, false);
  const P = R.palestra, zc = (P.z0 + P.z1) / 2;
  for (const s of [-1, 1]) {
    const x = s < 0 ? P.x0 + 0.2 : P.x1 - 0.2;
    box(x - 0.1 * s, 2.2, zc - 0.05, x + 1.2 * s, 2.3, zc + 0.05, MAT.alu);
    box(x + 1.2 * s - 0.03, 2.9, zc - 0.9, x + 1.2 * s + 0.03, 3.95, zc + 0.9, std({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 8, 24), MAT.orange); ring.rotation.x = Math.PI / 2; ring.position.set(x + 1.45 * s, 3.05, zc); scene.add(ring);
  }
  // parete d'arrampicata in 3D con le prese colorate
  { const [x, z, ry] = onWall(P, "n", 6, 0.14); local(x, z, ry, () => { box(-1.6, 0, 0, 1.6, 7.5, 0.25, std({ color: 0xc8a25a, roughness: 0.8 })); for (let i = 0; i < 70; i++) { const px = -1.4 + rnd() * 2.8, py = 0.4 + rnd() * 6.8; sphere(px, py, 0.27, 0.06 + rnd() * 0.04, prodCols[i % prodCols.length], 0.7); } }); blockRot(x, z, ry, 3.2, 0.35); }
  for (let x = 10; x < 20; x += 1.1) box(x - 0.05, 0, P.z0 + 0.15, x + 0.05, 2.6, P.z0 + 0.25, MAT.lightwood, false);
  for (let y = 0.3; y < 2.6; y += 0.22) box(10, y, P.z0 + 0.17, 19.6, y + 0.03, P.z0 + 0.23, MAT.lightwood, false);
  for (let i = 0; i < 4; i++) box(4, 0, P.z1 - 0.85 - i * 0.75, 27, 0.45 * (4 - i), P.z1 - 0.1 - i * 0.75, i % 2 ? MAT.darkgrey : MAT.black, true);
  block(4, P.z1 - 3, 27, P.z1);
  box(P.x1 - 0.25, 5.2, 101.8, P.x1 - 0.05, 6.8, 106.8, MAT.black, false);
  for (let k = 0; k < 4; k++) box(P.x1 - 0.28, 5.6, 102.3 + k * 1.1, P.x1 - 0.26, 6.4, 103.1 + k * 1.1, std({ color: k < 2 ? 0xff3d3d : 0xffc400, emissive: k < 2 ? 0x991111 : 0x996600 }), false);
  box(29, 0, 103.5, 30, 0.75, 105.1, MAT.pallet, true); box(28.95, 0.72, 103.45, 30.05, 0.8, 105.15, std({ color: 0x5d3a1a }), true); block(29, 103.5, 30.3, 105.1);
  box(1, 0, 91, 4, 0.3, 91.5, MAT.blue); box(1, 0, 92, 4, 0.3, 92.5, MAT.red); block(1, 91, 4, 92.6);
  for (let z = P.z0 + 2; z < P.z1; z += 4.5) box(P.x0, P.h - 0.6, z - 0.15, P.x1, P.h - 0.05, z + 0.15, MAT.wood, false);
  for (let x = P.x0 + 3; x < P.x1 - 1; x += 6) for (let z = P.z0 + 3; z < P.z1 - 1; z += 6.5) box(x - 0.4, P.h - 0.75, z - 0.4, x + 0.4, P.h - 0.7, z + 0.4, MAT.light, false);
}

// ---------------- CORTILE ----------------
{
  floorQuad(5.7, 58.5, 35, 62.5, 0.012, MAT.cobble2, 2.0);
  for (let x = 8; x < 35; x += 4) { column(x, 58.8, 0.17, 3.3, MAT.concrete); column(x, 62.2, 0.17, 3.3, MAT.concrete); }
  box(5.7, 3.3, 58.1, 35, 3.6, 62.9, MAT.roof, true); box(5.7, 3.2, 58.1, 35, 3.3, 62.9, MAT.concrete, false);
  for (const [x, z, s] of [[12, 20, 1.2], [26, 30, 1.4], [18, 45, 1], [12, 76, 1.3], [27, 80, 1.2], [20, 10, 0.9], [28, 70, 0.9]]) tree(x, z, s);
  for (const [x, z] of [[16, 70], [28, 50], [10, 40]]) { sphere(x, 0.4, z, 0.8, MAT.leaves2, 0.6); block(x - 0.7, z - 0.7, x + 0.7, z + 0.7); }
  for (const x of [14, 26]) bench(x, 63.6, 0);
}

// ---------------- ALA VECCHIA ----------------
{
  const C = R.storico; ceilingLights(C, 2.6, 4, 0.2, 1.2);
  greyCabinet(C.x0 + 0.44, 26, FACE.w, 6); greyCabinet(C.x1 - 0.44, 30, FACE.e, 4);
  // corridoio dell'uscita: distributori e cestini (tour "corridoio uscita")
  vendingSnack(C.x1 - 0.6, 16, FACE.e, 0xc62828); vendingSnack(C.x1 - 0.6, 17, FACE.e, 0x1565c0); vendingCoffee(C.x1 - 0.55, 17.9, FACE.e);
  bins(C.x1 - 0.45, 19.5, FACE.e);
  [[12, "T05"], [34, "T07"], [68, "T11"], [74, "T13"]].forEach(([z, l]) => wallDoorAt(C, "w", z, MAT.doorWood, 1.5, 2.3, l));
  vendingSnack(C.x0 + 0.6, 63.8, FACE.w, 0xc62828); bins(C.x0 + 0.45, 65.6, FACE.w);
  extinguisher(C.x0 + 0.12, 40, FACE.w);
  // atrio dell'ala vecchia con il pavimento in legno e la portineria a vetri
  const Pn = R.portineria; ceilingLights(Pn, 3.2, 2.6, 1.1, 0.25);
  box(48, 0, 42.2, 54.8, 2.6, 45, std({ color: 0xf0eeea }), true); box(48.2, 1.1, 45, 54.6, 2.2, 45.03, MAT.glass, false); block(48, 42.2, 54.8, 45.1);
  // atrio con i ballatoi
  const A = R.atrioSt;
  for (const by of [3.6, 7.0]) {
    const bw = 2.4;
    box(A.x0, by, A.z0, A.x1, by + 0.3, A.z0 + bw, MAT.concrete, false); box(A.x0, by, A.z1 - bw, A.x1, by + 0.3, A.z1, MAT.concrete, false);
    box(A.x1 - bw, by, A.z0 + bw, A.x1, by + 0.3, A.z1 - bw, MAT.concrete, false);
    const rail = (x0, z0, x1, z1) => { box(x0 - 0.03, by + 1.05, z0 - 0.03, x1 + 0.03, by + 1.12, z1 + 0.03, MAT.alu, false); const L = Math.hypot(x1 - x0, z1 - z0); for (let t = 0; t <= L; t += 0.4) { const x = x0 + (x1 - x0) * t / L, z = z0 + (z1 - z0) * t / L; box(x - 0.012, by + 0.3, z - 0.012, x + 0.012, by + 1.05, z + 0.012, MAT.alu, false); } };
    rail(A.x0, A.z0 + bw, A.x1 - bw, A.z0 + bw); rail(A.x0, A.z1 - bw, A.x1 - bw, A.z1 - bw); rail(A.x1 - bw, A.z0 + bw, A.x1 - bw, A.z1 - bw);
    for (let z = A.z0 + 3; z < A.z1 - 1; z += 4) box(A.x1 - 0.1, by + 0.3, z - 0.5, A.x1 - 0.05, by + 2.4, z + 0.5, MAT.wood, false);
  }
  for (const [x, z] of [[A.x1 - 2.4, A.z0 + 2.4], [A.x1 - 2.4, A.z1 - 2.4]]) column(x, z, 0.22, 7.0, MAT.concrete);
  box(A.x0 + 1, A.h - 0.05, A.z0 + 3.4, A.x1 - 3.4, A.h - 0.02, A.z1 - 3.4, MAT.sky, false);
  for (let z = A.z0 + 3.4; z < A.z1 - 3.3; z += 2.5) box(A.x0 + 1, A.h - 0.3, z - 0.06, A.x1 - 3.4, A.h - 0.05, z + 0.06, MAT.alu, false);
  greyCabinet(A.x1 - 0.44, 24, FACE.e, 4); greyCabinet(A.x1 - 0.44, 37, FACE.e, 3);
  box(A.x1 - 0.1, 0, 33.5, A.x1 - 0.05, 2.3, 35.5, MAT.alu, false); // ascensore
  doorLabel(A.x1 - 0.15, 30.5, FACE.e, "T25"); doorLabel(A.x1 - 0.15, 14.5, FACE.e, "T28");
  // laboratori di chimica e fisica (banconi bianchi)
  const L = R.labFisica; ceilingLights(L, 3.3, 4, 1.4, 0.25);
  for (const z of [24, 29, 35, 39]) { box(54, 0, z - 0.6, 60.5, 0.88, z + 0.6, MAT.labWhite); box(53.95, 0.88, z - 0.65, 60.55, 0.92, z + 0.65, std({ color: 0xeceff1 })); block(54, z - 0.6, 60.5, z + 0.6); for (let x = 54.6; x < 60.5; x += 1.5) chair(x, z + 1.05, Math.PI, MAT.darkgrey); }
  labCabinet(L.x1 - 0.39, 32, FACE.e, 3); labCabinet(L.x0 + 0.39, 22, FACE.w, 2.4);
  // ZooMate
  const Z = R.zoomate; ceilingLights(Z, 3.3, 3.2, 1.2, 0.25);
  box(56.8, 0, 9.5, 57, 2.8, 17, MAT.labWhite, true); block(56.8, 9.5, 57, 17);
  picture("quadri_uccelli", 57.01, 1.7, 13.2, 3.4, 1.7, FACE.w + Math.PI, MAT.labWhite);
  picture("quadri_uccelli", 56.79, 1.7, 13.2, 3.4, 1.7, FACE.w, MAT.labWhite);
  wallPic(Z, "e", 13.5, "quadri_uccelli", 1.7, 4, 2, MAT.labWhite);
  wallPic(Z, "s", 59, "poster_zoomate", 1.5, 1.2, 1.8, MAT.wood);
  for (const [side, t, col] of [["n", 54.5, MAT.orange], ["n", 59.5, MAT.green]]) {
    const [x, z, ry] = onWall(Z, side, t, 0.13);
    local(x, z, ry, () => box(-0.9, 0.9, 0, 0.9, 2.4, 0.25, col));
    picture("schermo_zoomate", x + Math.sin(ry) * 0.26, 1.65, z + Math.cos(ry) * 0.26, 1.2, 1.1, ry, col);
  }
  for (let k = 0; k < 5; k++) chair(53 + k * 0.62, 18.6, Math.PI);
  box(59, 0, 17.5, 61.4, 0.75, 18.7, MAT.labWhite); box(59.2, 0.75, 17.7, 61.2, 0.78, 18.5, MAT.black); block(59, 17.5, 61.4, 18.7);
  // corridoio dei laboratori a nord
  ceilingLights(R.storicoN, 4, 2.6, 1.2, 0.2);
  greyCabinet(42, R.storicoN.z1 - 0.44, FACE.s, 4);
  doorLabel(54.5, R.storicoN.z0 + 0.15, FACE.n, "T29"); doorLabel(R.storicoN.x1 - 0.15, 5, FACE.e, "T30");
  for (let i = 0; i < 6; i++) box(R.storicoN.x0 + 0.1, 0, 3.3 + i * 0.45, R.storicoN.x0 + 1.6, (i + 1) * 0.17, 3.75 + i * 0.45, MAT.concrete, true);
  // laboratorio di chimica (banconi con cassetti verdi, cappe, armadi con vetreria)
  const CH = R.chimica; ceilingLights(CH, 3.4, 3.3, 1.4, 0.25);
  for (const [x0, z0, x1, z1] of [[49.5, -5, 55, -3.6], [49.5, -1.5, 55, -0.1], [56.5, -5, 60.5, -3.6]]) {
    box(x0, 0, z0, x1, 0.86, z1, MAT.mint); box(x0 - 0.05, 0.86, z0 - 0.05, x1 + 0.05, 0.92, z1 + 0.05, MAT.labWhite);
    box(x0 + 0.3, 0.92, (z0 + z1) / 2 - 0.05, x1 - 0.3, 1.5, (z0 + z1) / 2 + 0.05, MAT.labWhite); block(x0, z0, x1, z1);
    for (let x = x0 + 0.6; x < x1 - 0.4; x += 1.3) { cyl(x, 0.92, z0 + 0.3, 0.06, 1.1, bottleCols[0], 10); cyl(x + 0.4, 0.92, z1 - 0.35, 0.08, 1.05, bottleCols[1], 10); }
  }
  // cappa aspirante
  box(CH.x1 - 3.6, 0, CH.z0 + 0.15, CH.x1 - 0.5, 0.9, CH.z0 + 1.1, MAT.labWhite); box(CH.x1 - 3.6, 0.9, CH.z0 + 1.05, CH.x1 - 0.5, 2.1, CH.z0 + 1.1, MAT.glass, false);
  box(CH.x1 - 3.6, 2.1, CH.z0 + 0.15, CH.x1 - 0.5, 2.9, CH.z0 + 1.1, MAT.labWhite); block(CH.x1 - 3.6, CH.z0, CH.x1 - 0.5, CH.z0 + 1.1);
  labCabinet(CH.x0 + 0.39, -4.5, FACE.w, 2.6); labCabinet(CH.x0 + 0.39, -1.3, FACE.w, 2.6);
  labCabinet(51, CH.z0 + 0.39, FACE.n, 3);
  box(CH.x1 - 1.5, 0, 1.2, CH.x1 - 0.15, 2, 2.85, MAT.yellow); block(CH.x1 - 1.5, 1.2, CH.x1 - 0.15, 2.85);
  // officina meccanica
  const O = R.officina; ceilingLights(O, 4.5, 4.5, 1.4, 0.3);
  for (const [x, z] of [[66, -4], [66, 1], [66, 6], [77, -4], [77, 1], [72, 12]]) machineLathe(x, z, 0);
  box(74, 0, 6, 77, 2.3, 8.5, std({ color: 0xece6ea })); box(74.2, 0.9, 8.5, 76.8, 2.0, 8.55, std({ color: 0xc2185b }), false); block(74, 6, 77, 8.5);
  box(78, 0, 6, 80.3, 1.6, 8, MAT.blueMachine); block(78, 6, 80.3, 8);
  for (let k = 0; k < 3; k++) { desk(69 + k * 1.3, 9.5, 0, 1.2, 0.6, std({ color: 0x2bb39a })); chair(69 + k * 1.3, 10.3, 0, MAT.orangeChair); }
  block(68.3, 9.2, 72.3, 9.8);
  // palestra piccola: pavimento verde con il riquadro rosso, spalliere, finestre in alto
  const G = R.palestraP; ceilingLights(G, 4, 5, 0.8, 0.8);
  box(34.5, 0.004, -17, 43, 0.01, -2, std({ color: 0xb5553e }), false);
  for (let z = -20; z < -6; z += 1.1) box(G.x0 + 0.15, 0, z - 0.05, G.x0 + 0.25, 2.6, z + 0.05, MAT.lightwood, false);
  for (let y = 0.3; y < 2.6; y += 0.22) box(G.x0 + 0.17, y, -20, G.x0 + 0.23, y + 0.03, -6.4, MAT.lightwood, false);
  bench(G.x1 - 0.5, -12, FACE.e, 3);
  // corridoio vetrato: colonne nere
  ceilingLights(R.vetrato, 1.9, 4, 0.2, 1.1);
}

// ---------------- AULA MAGNA (poltroncine rosse, palco con il sipario) ----------------
{
  const A = R.aula;
  box(A.x0 + 3, 0, A.z1 - 6, A.x1 - 1, 0.9, A.z1, MAT.carpet, true); block(A.x0 + 3, A.z1 - 6.2, A.x1 - 1, A.z1);
  box(47.5, 0, A.z1 - 6.8, 53.5, 0.3, A.z1 - 6, MAT.carpet); box(48.5, 0.3, A.z1 - 6.4, 52.5, 0.6, A.z1 - 6, MAT.carpet);
  for (const s of [-1, 1]) box(50.5 + s * 8, 0.9, A.z1 - 0.8, 50.5 + s * 11, A.h, A.z1 - 0.3, MAT.curtain, false);
  box(42, 0.9, A.z1 - 0.3, 59, A.h - 0.3, A.z1 - 0.15, MAT.curtain, false);
  box(46, 2.2, A.z1 - 0.36, 55, 5.2, A.z1 - 0.32, MAT.screen, false);
  box(48.5, 0.9, A.z1 - 3.5, 52.5, 1.66, A.z1 - 2.5, MAT.lightwood, true);
  for (let k = 0; k < 4; k++) chair(49.1 + k * 0.9, A.z1 - 2, Math.PI, MAT.redSeat);
  for (let row = 0; row < 10; row++) {
    const z = A.z1 - 9 - row * 1.3, y = Math.max(0, (row - 2) * 0.3);
    if (y > 0) box(A.x0 + 2.4, 0, z - 0.65, A.x1 - 0.2, y, z + 0.65, MAT.rubber, true);
    for (const [a, b] of [[A.x0 + 2.6, 49.1], [51.9, A.x1 - 1]]) for (let x = a + 0.35; x < b; x += 0.62) {
      local(x, z, Math.PI, () => { box(-0.27, y + 0.42, -0.25, 0.27, y + 0.5, 0.2, MAT.redSeat); box(-0.27, y + 0.5, 0.18, 0.27, y + 1.05, 0.26, MAT.redSeat); box(-0.29, y, -0.05, -0.25, y + 0.62, 0.25, MAT.black); });
    }
    block(A.x0 + 2.6, z - 0.45, 49.1, z + 0.5); block(51.9, z - 0.45, A.x1 - 1, z + 0.5);
  }
  for (let x = A.x0 + 2; x < A.x1; x += 4) for (let z = A.z0 + 2; z < A.z1; z += 4) box(x - 0.3, A.h - 0.04, z - 0.3, x + 0.3, A.h - 0.01, z + 0.3, MAT.light, false);
}

// ---------------- PORTICI E EDIFICI X / Y DEI LABORATORI ----------------
{
  floorQuad(41, -45.2, 46.9, -22.7, 0.012, MAT.cobble2, 2.0);
  for (let z = -43; z < -22.7; z += 4) { column(41.3, z, 0.17, 3.3, MAT.concrete); }
  box(40.9, 3.3, -45.2, 45.1, 3.6, -22.7, MAT.roof, true); box(40.9, 3.2, -45.2, 45.1, 3.3, -22.7, MAT.concrete, false);
  for (const [x, z, s] of [[32, -35, 1.2], [60, -30, 1.3], [72, -38, 1.1], [56, -40, 0.9]]) tree(x, z, s);
  for (const [x, z] of [[36, -28], [66, -26]]) { sphere(x, 0.4, z, 0.8, MAT.leaves2, 0.6); block(x - 0.7, z - 0.7, x + 0.7, z + 0.7); }
  // edificio X: corridoio con i lucernari rotondi
  const X = R.corrX; ceilingLights(X, 3.5, 6, 0.2, 1.2);
  for (let z = -30; z < 0; z += 6) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), MAT.sky); m.rotation.x = Math.PI / 2; m.position.set(12.75, X.h - 0.02, z); scene.add(m); }
  doorLabel(11.05, -20.5, FACE.w, "X03"); doorLabel(14.45, -20.3, FACE.e, "X04");
  greyCabinet(X.x0 + 0.44, -3, FACE.w, 3);
  vendingSnack(X.x1 - 0.6, -1.5, FACE.e, 0x2e7d32);
  const T = R.labTel; ceilingLights(T, 3.3, 4, 1.4, 0.25);
  instrumentBench(T.x0 + 0.55, -22, FACE.w, 6); instrumentBench(T.x0 + 0.55, -14, FACE.w, 6);
  for (const z of [-26, -20, -14]) { desk(6.5, z, 0, 3.4, 0.8, MAT.lightwood); block(4.8, z - 0.4, 8.2, z + 0.4); for (let x = 5.2; x < 8.2; x += 1) chair(x, z + 0.7, Math.PI, MAT.darkgrey); }
  greyCabinet(5, T.z0 + 0.44, FACE.n, 6);
  const E = R.labElt; ceilingLights(E, 3.3, 4, 1.4, 0.25);
  instrumentBench(E.x1 - 0.55, -26, FACE.e, 6); instrumentBench(E.x1 - 0.55, -15, FACE.e, 6);
  for (const z of [-28, -22, -16, -10]) { desk(18.5, z, 0, 4, 0.8, MAT.lightwood); block(16.5, z - 0.4, 20.5, z + 0.4); }
  // edificio Y
  const Y = R.corrY; ceilingLights(Y, 4, 6, 1.2, 0.25);
  for (let x = 2; x < 62; x += 7) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), MAT.sky); m.rotation.x = Math.PI / 2; m.position.set(x, Y.h - 0.02, -48.2); scene.add(m); }
  [[2, "Y21"], [24, "Y24"], [33, "Y25"], [52, "Y27"], [58, "Y28"]].forEach(([x, l]) => wallDoorAt(Y, "n", x, MAT.doorGreen, 1.1, 2.2, l));
  [[8, "Y22"], [20, "Y23"], [55, "Y29"]].forEach(([x, l]) => wallDoorAt(Y, "s", x, MAT.doorGreen, 1.1, 2.2, l));
  doorLabel(45.25, Y.z0 + 0.14, 0, "Y26"); doorLabel(13.75, Y.z0 + 0.14, 0, "Y20");
  const LY = R.labY; ceilingLights(LY, 4, 4, 1.4, 0.3);
  for (let z = -80; z < -55; z += 6) { instrumentBench(6, z, 0, 8); instrumentBench(22, z, 0, 8); }
  ceilingLights(R.pneumatica, 3.4, 4, 1.4, 0.25);
  for (const [x, z, ry] of [[41, -60, 0], [51, -60, 0], [41, -68, Math.PI], [51, -68, Math.PI]]) {
    desk(x, z, ry, 3, 1, std({ color: 0xa08e6a }), 0.8); blockRot(x, z, ry, 3, 1);
    local(x, z, ry, () => { box(-1.1, 0.8, -0.47, 1.1, 0.85, -0.4, std({ color: 0x7a2119 }), false); });
    pneumaticPanel(x + Math.sin(ry) * -0.44, z + Math.cos(ry) * -0.44, ry);
    pneumaticPanel(x + Math.sin(ry) * -0.46, z + Math.cos(ry) * -0.46, ry + Math.PI);
  }
  cyl(54.5, 0, -53, 0.3, 0.6, MAT.red, 14); block(54.1, -53.4, 54.9, -52.6);
}

}
// oggetti che cambiano quando si risolve un enigma (lampadine che si accendono, schermi che si illuminano…)
const reactors = [];
const react = (puzzle, fn) => reactors.push({ puzzle, fn, done: false });
// texture da un disegno SVG (es. il disegno tecnico dell'enigma, così sul banco c'è lo stesso foglio)
function svgTex(svg, w, h, bg = "#ffffff", ink = "#1a237e") {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  let src = svg.replace(/currentColor/g, ink); if (!/xmlns=/.test(src)) src = src.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  src = src.replace(/<svg([^>]*)>/, (m, a) => `<svg${a.replace(/\s(width|height)="[^"]*"/g, "")} width="${w}" height="${h}">`);
  const img = new Image(); img.onload = () => { g.drawImage(img, 0, 0, w, h); t.needsUpdate = true; };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
  return t;
}
if (MAP.labs && window.ARREDI_LAB) window.ARREDI_LAB({ react, svgTex, GAME: (typeof GAME !== "undefined" ? GAME : null), R, THREE, MAT, box, cyl, sphere, quad, floorQuad, wallQuad, local, picture, photo, block, blockRot, column, chair, desk, planter, tree, bins, machineLathe, ceilingLights, wallPic, wallDoorAt, onWall, FACE, bench, extinguisher, radiator, vendingSnack, vendingCoffee, displayCase, greyCabinet, labCabinet, pneumaticPanel, instrumentBench, doorLabel, canvasTex, std, rnd, addGeo, bottleCols, prodCols, scene, lightsList });
// unisco le geometrie
for (const { mat, cast, geos } of batches.values()) {
  const merged = mergeGeometries(geos, false);
  if (!merged) { console.warn("merge fallito", mat); continue; }
  const m = new THREE.Mesh(merged, mat); m.castShadow = cast; m.receiveShadow = !mat.transparent; m.matrixAutoUpdate = false;
  scene.add(m);
}

// ---------- Robot ----------
let robot = null, mixer = null, actions = {}, current = null, emoting = false;
const pos = new THREE.Vector2(...MAP.start.pos);
let heading = MAP.start.heading;
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.36, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
function play(name, fade = 0.25) { const a = actions[name]; if (!a || a === current) return; a.reset().setLoop(THREE.LoopRepeat).fadeIn(fade).play(); if (current) current.fadeOut(fade); current = a; }
function emote(name, loops = 1) {
  const a = actions[name]; if (!a || !mixer) return;
  emoting = true; a.reset(); a.setLoop(loops > 1 ? THREE.LoopRepeat : THREE.LoopOnce, loops); a.clampWhenFinished = true;
  a.fadeIn(0.2).play(); if (current && current !== a) current.fadeOut(0.2); current = a;
  const back = () => { mixer.removeEventListener("finished", back); emoting = false; if (current === a) { current = null; play("Idle"); } };
  mixer.addEventListener("finished", back);
}
window.Avatar = { ready: true, emote, frameRobot() {}, place() {}, pos: () => ({ x: pos.x, z: pos.y }) };

// ---------- Comandi ----------
const keys = new Set();
const KM = { KeyW: "f", ArrowUp: "f", KeyS: "b", ArrowDown: "b", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r", ShiftLeft: "run", ShiftRight: "run", KeyQ: "sl", KeyE2: "sr" };
let uiBlocked = () => false;
function blocked() {
  if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) return true;
  if (ESCAPE) return G.modalOpen() || !G.started();
  return uiBlocked();
}
let firstPerson = false;
addEventListener("keydown", (e) => {
  if (KM[e.code] && !blocked()) { keys.add(KM[e.code]); e.preventDefault(); }
  if (e.code === "KeyE" && !blocked()) { e.preventDefault(); useNearest(); }
  if (e.code === "KeyV" && !blocked()) { firstPerson = !firstPerson; camInit = false; }
});
addEventListener("keyup", (e) => { const k = KM[e.code]; if (k) setTimeout(() => keys.delete(k), 90); });
addEventListener("blur", () => keys.clear());
document.querySelectorAll("#dpad [data-k]").forEach((b) => {
  const k = b.dataset.k, on = (e) => { e.preventDefault(); if (!blocked()) keys.add(k); }, off = () => keys.delete(k);
  b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
});
// trascinando con il mouse si gira la visuale; un clic sul pavimento manda il robot lì
let drag = null, camYawOff = 0, camPitch = 0.28;
canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
  if (!drag.moved) return;
  heading -= dx * 0.0055;
  camPitch = Math.max(-0.35, Math.min(0.9, camPitch + dy * 0.004));
});
canvas.addEventListener("pointerup", (e) => {
  const d = drag; drag = null;
  if (!d || d.moved || blocked()) return;
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
  const dir = ray.ray.direction; if (dir.y > -0.02) return;
  const hit = ray.ray.origin.clone().add(dir.clone().multiplyScalar(-ray.ray.origin.y / dir.y));
  const p = new THREE.Vector2(hit.x, hit.z);
  if (roomAt(p) || (inCampus(p) && !inFootprint(p))) walkTo(p);
});
canvas.addEventListener("wheel", (e) => { camDist = Math.max(1.6, Math.min(7, camDist + e.deltaY * 0.004)); e.preventDefault(); }, { passive: false });

// ---------- Percorsi: da stanza a stanza passando per le porte ----------
const ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 32), new THREE.MeshBasicMaterial({ color: 0xf0559a, transparent: true, opacity: 0, depthWrite: false }));
ring.rotation.x = -Math.PI / 2; scene.add(ring);
let target = null, waypoints = [], onArrive = null;
function doorSides(d) { // un punto per lato della porta
  const o = 0.9;
  return d.vertical ? [new THREE.Vector2(d.c[0] - o, d.c[1]), new THREE.Vector2(d.c[0] + o, d.c[1])] : [new THREE.Vector2(d.c[0], d.c[1] - o), new THREE.Vector2(d.c[0], d.c[1] + o)];
}
function roomOfSide(p) { return roomAt(p); }
function route(from, to) {
  const nearestOut = (p) => rooms.filter((o) => o.outdoor).sort((a, b) => Math.hypot(p.x - (a.x0 + a.x1) / 2, p.y - (a.z0 + a.z1) / 2) - Math.hypot(p.x - (b.x0 + b.x1) / 2, p.y - (b.z0 + b.z1) / 2))[0];
  const ra = roomAt(from) || (CAMPUS ? nearestOut(from) : null), rb = roomAt(to) || (CAMPUS ? nearestOut(to) : null);
  if (!ra || !rb) return [to];
  if (ra === rb) return [to];
  // ricerca in ampiezza sul grafo delle stanze
  const prev = new Map([[ra, null]]), q = [ra];
  while (q.length) {
    const r = q.shift(); if (r === rb) break;
    for (const d of doors) {
      if (isLocked(d) || !d.rooms.includes(r)) continue;
      for (const o of d.rooms) if (o !== r && !prev.has(o)) { prev.set(o, { r, d }); q.push(o); }
    }
    // stanze all'aperto confinanti senza muro
    for (const o of rooms) if (r.outdoor && o.outdoor && o !== r && !prev.has(o) && (touches(r, o) || CAMPUS)) { prev.set(o, { r, d: null, o }); q.push(o); }
  }
  if (!prev.has(rb)) return [to];
  const pts = [];
  for (let r = rb; prev.get(r); r = prev.get(r).r) {
    const { d, r: from_ } = prev.get(r);
    if (d) { const [s1, s2] = doorSides(d); const first = roomAt(s1) === from_ ? s1 : s2; pts.unshift(first, first === s1 ? s2 : s1); }
    else if (touches(from_, r)) pts.unshift(sharedPoint(from_, r));
  }
  return [...pts, to];
}
function touches(a, b) { return (Math.abs(a.x1 - b.x0) < 1e-6 || Math.abs(b.x1 - a.x0) < 1e-6) && a.z0 < b.z1 && b.z0 < a.z1 || (Math.abs(a.z1 - b.z0) < 1e-6 || Math.abs(b.z1 - a.z0) < 1e-6) && a.x0 < b.x1 && b.x0 < a.x1; }
function sharedPoint(a, b) {
  if (Math.abs(a.x1 - b.x0) < 1e-6 || Math.abs(b.x1 - a.x0) < 1e-6) { const x = Math.abs(a.x1 - b.x0) < 1e-6 ? a.x1 : a.x0; return new THREE.Vector2(x, (Math.max(a.z0, b.z0) + Math.min(a.z1, b.z1)) / 2); }
  const z = Math.abs(a.z1 - b.z0) < 1e-6 ? a.z1 : a.z0; return new THREE.Vector2((Math.max(a.x0, b.x0) + Math.min(a.x1, b.x1)) / 2, z);
}
function walkTo(p, cb) {
  waypoints = route(pos.clone(), p); target = waypoints.shift(); onArrive = cb || null;
  ring.position.set(p.x, 0.02, p.y); ring.material.opacity = cb ? 0 : 0.9;
}
function teleport(x, z, h) { pos.set(x, z); if (h !== undefined) heading = h; target = null; waypoints = []; camInit = false; }

// ---------- Oggetti degli enigmi (escape) e punti informativi (tour) ----------
const layer = $("#markers");
const markers = [];
const PINK = new THREE.Color(0xf25a8e), GOLD = new THREE.Color(0xf2c063);
const beamTex = canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
const ringTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.55, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
function addBeacon(m, color) {
  const rg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: ringTex, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  rg.rotation.x = -Math.PI / 2; rg.position.set(m.stand.x, 0.03, m.stand.y); scene.add(rg);
  const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 2.2, 24, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: GOLD, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  bm.position.set(m.stand.x, 1.1, m.stand.y); scene.add(bm);
  m.ring = rg; m.beam = bm;
}
if (ESCAPE) {
  for (const [puzzle, it] of Object.entries(MAP.items)) {
    if (!GAME.puzzles[puzzle]) continue;
    const el = document.createElement("button"); el.className = "hs item hidden";
    el.innerHTML = `<span class="dot">${it.icon}</span><span class="lbl"></span>`; el.querySelector(".lbl").textContent = it.label;
    layer.appendChild(el);
    const m = { el, p3: new THREE.Vector3(...it.p), stand: new THREE.Vector2(...it.stand), it: { ...it, puzzle }, room: R[it.room] };
    el.addEventListener("click", (e) => { e.stopPropagation(); if (blocked()) return; if (m === useTarget) useNearest(); else G.say("Avvicinati di più per esaminarlo!", "think"); });
    addBeacon(m, PINK);
    markers.push(m);
  }
  for (const d of doors.filter((x) => x.lockBox)) {
    const el = document.createElement("button"); el.className = "hs link locked";
    el.innerHTML = `<span class="dot"></span><span class="lbl">Chiuso</span>`; layer.appendChild(el);
    el.addEventListener("click", (ev) => { ev.stopPropagation(); lockedFeedback(d, true); });
    markers.push({ el, p3: new THREE.Vector3(d.c[0], 2.2, d.c[1]), door: d });
  }
} else {
  for (const inf of MAP.info) {
    const el = document.createElement("button"); el.className = "hs info";
    el.innerHTML = `<span class="dot">i</span><span class="lbl"></span>`; el.querySelector(".lbl").textContent = inf.title;
    layer.appendChild(el);
    const m = { el, p3: new THREE.Vector3(inf.pos[0], 1.9, inf.pos[1]), stand: new THREE.Vector2(...inf.pos), info: inf, room: R[inf.room] };
    el.addEventListener("click", (e) => { e.stopPropagation(); window.Tour && window.Tour.openInfo(inf); });
    addBeacon(m, new THREE.Color(0x4fc3f7));
    markers.push(m);
  }
}
// barriere luminose sulle porte chiuse
const barriers = [];
if (ESCAPE) {
  const tanit = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#fff"; const cx = w / 2, u = w / 128;
    g.beginPath(); g.arc(cx, 30 * u, 12 * u, 0, Math.PI * 2); g.fill();
    g.fillRect(cx - 36 * u, 48 * u, 72 * u, 9 * u); g.fillRect(cx - 36 * u, 36 * u, 8 * u, 21 * u); g.fillRect(cx + 28 * u, 36 * u, 8 * u, 21 * u);
    g.beginPath(); g.moveTo(cx - 12 * u, 57 * u); g.lineTo(cx + 12 * u, 57 * u); g.lineTo(cx + 26 * u, 104 * u); g.lineTo(cx - 26 * u, 104 * u); g.closePath(); g.fill();
  }, false);
  for (const d of doors.filter((x) => x.lockBox)) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { time: { value: 0 }, prog: { value: 0 }, tex: { value: tanit }, c1: { value: PINK }, c2: { value: GOLD } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform float time, prog; uniform sampler2D tex; uniform vec3 c1, c2;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
          float stripes = 0.5 + 0.5 * sin(vUv.y * 40.0 - time * 3.0);
          vec2 tu = (vUv - vec2(0.5, 0.55)) * vec2(2.6, 2.0) + 0.5;
          float sym = (tu.x > 0.0 && tu.x < 1.0 && tu.y > 0.0 && tu.y < 1.0) ? texture2D(tex, tu).a : 0.0;
          if (h(floor(vUv * vec2(60.0, 80.0))) < prog) discard;
          float a = (0.18 + 0.2 * stripes) * edge + sym * (0.9 + 0.1 * sin(time * 2.5));
          gl_FragColor = vec4(mix(c1, c2, sym) * a * (1.0 - prog * 0.6), a);
        }`
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.w - 0.1, 2.3), mat);
    mesh.position.set(d.c[0], 1.17, d.c[1]); mesh.rotation.y = d.vertical ? Math.PI / 2 : 0;
    scene.add(mesh); barriers.push({ d, mesh, prog: 0 });
  }
}
let lastLockMsg = 0;
function lockedFeedback(d, force) {
  const now = performance.now();
  if (!force && now - lastLockMsg < 6000) return;
  lastLockMsg = now; G.lockSound(); emote("No");
  G.say(d.lockedSay || "È chiuso! Forse un enigma qui vicino può aiutarci.", "think");
}

// ---------- Esamina (E) ----------
const USE_RANGE = 2.2;
let useTarget = null;
const useBtn = $("#useBtn3d");
if (useBtn) useBtn.addEventListener("click", () => { if (!blocked()) useNearest(); });
function findUseTarget() {
  let best = null, bd = USE_RANGE;
  for (const m of markers) {
    if (m.door) { if (!isLocked(m.door)) continue; const d = pos.distanceTo(new THREE.Vector2(...m.door.c)); if (d < bd) { bd = d; best = m; } continue; }
    if (ESCAPE && !G.isFound(m.it.puzzle)) continue;
    const d = Math.min(pos.distanceTo(m.stand), new THREE.Vector2(m.p3.x, m.p3.z).distanceTo(pos) - 0.6);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}
function useNearest() {
  const m = useTarget; if (!m) return;
  if (m.door) return lockedFeedback(m.door, true);
  target = null; waypoints = []; onArrive = null;
  heading = Math.atan2(m.p3.x - pos.x, m.p3.z - pos.y);
  if (m.info) return window.Tour && window.Tour.openInfo(m.info);
  setTimeout(() => G.openPuzzle(m.it.puzzle), 200);
}
const autoOpened = new Set();
function autoOpen() {
  if (blocked()) return;
  for (const m of markers) {
    if (!m.it || autoOpened.has(m.it.puzzle) || G.isDone(m.it.puzzle) || isBehindLock(m)) continue;
    const d = pos.distanceTo(m.stand);
    if (d > 1.7) m.wasFar = true;
    if (d > 1.3 || !m.wasFar) continue;
    autoOpened.add(m.it.puzzle); G.markFound(m.it.puzzle);
    target = null; waypoints = []; onArrive = null;
    heading = Math.atan2(m.p3.x - pos.x, m.p3.z - pos.y);
    setTimeout(() => { if (!blocked()) G.openPuzzle(m.it.puzzle); }, 250);
    return;
  }
}
// raggiungibilità: stanze collegate da porte aperte a partire dalla stanza del robot
function reachableRooms() {
  const start = roomAt(pos) || R.piazzale || rooms[0], seen = new Set([start]), q = [start];
  while (q.length) {
    const r = q.shift();
    for (const d of doors) if (!isLocked(d) && d.rooms.includes(r)) for (const o of d.rooms) if (!seen.has(o)) { seen.add(o); q.push(o); }
    for (const o of rooms) if (r.outdoor && o.outdoor && !seen.has(o) && (CAMPUS || touches(r, o))) { seen.add(o); q.push(o); }
  }
  return seen;
}
let reach = new Set(rooms);
const isBehindLock = (m) => !reach.has(m.room);

// ---------- Obiettivo (escape): prossimo enigma e scia di frecce ----------
const objText = $("#objText"), objArrow = $("#objArrow"), objBox = $("#objective");
const goalOrder = ESCAPE ? (MAP.goalOrder || ["targa", "postit", "binario", "cesare", "alfabeto", "pixel", "tanit", "circuito", "simon", "finale"]).map((p) => markers.find((m) => m.it && m.it.puzzle === p)).filter((m) => m && GAME.puzzles[m.it.puzzle].type !== "info") : [];
const chevronTex = canvasTex(128, 128, (g, w, h) => {
  const halo = g.createRadialGradient(64, 70, 4, 64, 70, 62); halo.addColorStop(0, "rgba(255,255,255,.55)"); halo.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = halo; g.fillRect(0, 0, w, h); g.strokeStyle = "#fff"; g.lineWidth = 22; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(22, 94); g.lineTo(64, 42); g.lineTo(106, 94); g.stroke();
}, false);
const trail = [];
for (let i = 0; i < 30; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshBasicMaterial({ map: chevronTex, color: 0xff4f8f, transparent: true, opacity: 0, depthWrite: false }));
  m.rotation.order = "YXZ"; m.visible = false; scene.add(m); trail.push(m);
}
let trailPts = null, objTick = 0, objGoal = null, objWay = null;
function updateObjective(camYaw) {
  if (!objBox || !ESCAPE) return;
  const goal = goalOrder.find((m) => !G.isSolved(m.it.puzzle));
  objGoal = goal || null;
  if (!goal) { objText.innerHTML = "Tutti gli enigmi risolti!"; objArrow.style.opacity = 0; trailPts = null; return; }
  if (objTick++ % 15 === 0) {
    const r = route(pos.clone(), goal.stand.clone());
    objWay = r[0]; trailPts = [pos.clone(), ...r];
    const label = G.isFound(goal.it.puzzle) ? goal.it.label : "Esplora";
    objText.innerHTML = `${label} <span>· ${goal.room.name}</span>`;
  }
  if (!objWay) return;
  const rel = Math.atan2(objWay.x - pos.x, objWay.y - pos.y) - camYaw;
  objArrow.style.opacity = pos.distanceTo(goal.stand) < 1.2 ? 0.3 : 1;
  objArrow.style.transform = `rotate(${-rel - Math.PI / 2}rad)`;
}
function updateTrail(t, show) {
  if (!trailPts || !show) { trail.forEach((m) => (m.visible = false)); return; }
  const segs = []; let total = 0;
  for (let i = 1; i < trailPts.length; i++) { const a = trailPts[i - 1], b = trailPts[i], l = a.distanceTo(b); if (l > 1e-3) { segs.push([a, b, l, total]); total += l; } }
  trail.forEach((m, i) => {
    const d = 1.1 + i * 0.8;
    if (!segs.length || d > total - 0.4) { m.visible = false; return; }
    const sg = segs.find((x) => d >= x[3] && d <= x[3] + x[2]) || segs[segs.length - 1];
    const p = sg[0].clone().lerp(sg[1], (d - sg[3]) / sg[2]);
    m.position.set(p.x, 0.03, p.y); m.rotation.set(-Math.PI / 2, 0, 0); m.rotation.y = Math.atan2(sg[1].x - sg[0].x, sg[1].y - sg[0].y) + Math.PI;
    m.material.opacity = (0.45 + 0.5 * (0.5 + 0.5 * Math.sin(t * 4 - i * 0.55))) * Math.min(1, (total - d) / 1.5);
    m.visible = true;
  });
}

// ---------- Minimappa ----------
const mini = $("#minimap");
const B = CAMPUS ? CAMPUS.perimeter.reduce((b, [x, z]) => [Math.min(b[0], x), Math.min(b[1], z), Math.max(b[2], x), Math.max(b[3], z)], [Infinity, Infinity, -Infinity, -Infinity])
  : rooms.reduce((b, r) => [Math.min(b[0], r.x0), Math.min(b[1], r.z0), Math.max(b[2], r.x1), Math.max(b[3], r.z1)], [Infinity, Infinity, -Infinity, -Infinity]);
const areaColor = { Ingresso: "#8d99ae", Atrio: "#f5739f", Andito: "#6fcf97", Palestra: "#f2c063", Portici: "#7cb342", "Edificio storico": "#c9a27e", Laboratori: "#c9a27e", "Aula magna": "#e57373", ZooMate: "#4fc3f7", Chimica: "#ba68c8", Officina: "#90a4ae", Pneumatica: "#ff8a65" };
function drawMap(cv, opts = {}) {
  if (!cv) return null;
  const g = cv.getContext("2d"), W = cv.width, H = cv.height, pad = 10 * (opts.scale || 1);
  const s = Math.min((W - pad * 2) / (B[2] - B[0]), (H - pad * 2) / (B[3] - B[1]));
  const ox = pad + ((W - pad * 2) - (B[2] - B[0]) * s) / 2, oz = pad + ((H - pad * 2) - (B[3] - B[1]) * s) / 2;
  const X = (x) => ox + (x - B[0]) * s, Z = (z) => oz + (z - B[1]) * s;
  g.clearRect(0, 0, W, H);
  const cur = roomAt(pos);
  if (CAMPUS) {
    const path = (P) => { g.beginPath(); P.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.closePath(); };
    path(CAMPUS.perimeter); g.fillStyle = "rgba(216,210,200,.18)"; g.fill(); g.strokeStyle = "rgba(100,180,255,.8)"; g.lineWidth = 1.5; g.stroke();
    path(CAMPUS.field); g.fillStyle = "rgba(181,85,62,.6)"; g.fill();
    path(CAMPUS.track); g.fillStyle = "rgba(180,67,47,.6)"; g.fill();
    for (const f of CAMPUS.footprints) { path(f.pts); g.fillStyle = "rgba(120,110,105,.55)"; g.fill(); }
  }
  for (const r of rooms) {
    const vis = !ESCAPE || reach.has(r);
    g.fillStyle = r.outdoor ? "rgba(124,179,66,.35)" : (areaColor[r.area] || "#999");
    g.globalAlpha = vis ? (r === cur ? 1 : 0.62) : 0.18;
    g.fillRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
    g.globalAlpha = 1; g.strokeStyle = r === cur ? "#fff" : "rgba(0,0,0,.35)"; g.lineWidth = r === cur ? 2 : 1;
    g.strokeRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
  }
  if (opts.labels) {
    g.fillStyle = "#fff"; g.font = `600 ${12 * (opts.scale || 1)}px Inter, sans-serif`; g.textAlign = "center"; g.shadowColor = "#000"; g.shadowBlur = 4;
    const done = new Set();
    for (const r of rooms) { if (r.outdoor && r.id !== "piazzale" && r.id !== "giardino") continue; const key = r.name.split(" · ")[0]; if (done.has(key)) continue; done.add(key); g.fillText(key, X((r.x0 + r.x1) / 2), Z((r.z0 + r.z1) / 2) + 4); }
    g.shadowBlur = 0;
  }
  if (ESCAPE) for (const d of doors) if (isLocked(d) && d.lock !== "chiuso") { g.fillStyle = "#ff4f8f"; g.beginPath(); g.arc(X(d.c[0]), Z(d.c[1]), 3 * (opts.scale || 1), 0, 7); g.fill(); }
  // robot
  g.save(); g.translate(X(pos.x), Z(pos.y)); g.rotate(-heading + Math.PI);
  g.fillStyle = "#f0559a"; g.strokeStyle = "#fff"; g.lineWidth = 2; const k = 7 * (opts.scale || 1);
  g.beginPath(); g.moveTo(0, -k); g.lineTo(k * 0.7, k * 0.7); g.lineTo(0, k * 0.3); g.lineTo(-k * 0.7, k * 0.7); g.closePath(); g.fill(); g.stroke(); g.restore();
  return { X, Z, s, ox, oz, inv: (px, py) => new THREE.Vector2((px - ox) / s + B[0], (py - oz) / s + B[1]) };
}

// ---------- Telecamera ----------
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let camInit = false, walkPhase = 0, camDist = 3.4;
function camOk(x, z, y) {
  const p = new THREE.Vector2(x, z), r = roomAt(p) || (inCampus(p) && !inFootprint(p) ? OUTSIDE : null);
  if (!r) return false;
  const rr = roomAt(pos) || OUTSIDE;
  if (r !== rr && !(r.outdoor && rr.outdoor)) return false; // la telecamera resta nella stanza del robot
  if (r.outdoor && inFootprint(p)) return false;
  if (!r.outdoor && y > r.h - 0.15) return false;
  for (const o of camBlock) if (x > o[0] - 0.15 && x < o[2] + 0.15 && z > o[1] - 0.15 && z < o[3] + 0.15) return false;
  return true;
}
let aerial = 0, aerialT = 0;
function updateCamera(dt, moving, speed) {
  if (moving) walkPhase += dt * speed * 3.2;
  updateCameraGround2(dt, moving, speed);
  scene.fog.near = 90 + aerialT * 700; scene.fog.far = 260 + aerialT * 900; camera.far = 600 + aerialT * 500;
  aerialT += ((aerial ? 1 : 0) - aerialT) * Math.min(1, dt * 2.5);
  if (aerialT > 0.002 && CAMPUS) { // vista dall'alto su tutta la scuola (passaggio morbido)
    if (robot) robot.visible = true;
    const cx = (B[0] + B[2]) / 2, cz = (B[1] + B[3]) / 2, k = aerialT * aerialT * (3 - 2 * aerialT);
    camera.position.copy(camPos.clone().lerp(new THREE.Vector3(cx + 20, 300, cz + 120), k));
    camera.lookAt(camLook.clone().lerp(new THREE.Vector3(cx, 0, cz - 5), k));
  }
}
function updateCameraGround2(dt, moving, speed) {
  const room = roomAt(pos);
  if (firstPerson) {
    const bob = moving ? Math.sin(walkPhase * 2) * 0.03 : 0;
    camPos.set(pos.x + Math.sin(heading) * 0.15, 1.45 + bob, pos.y + Math.cos(heading) * 0.15);
    camLook.set(pos.x + Math.sin(heading) * 5, 1.45 - camPitch * 4 + 1.1, pos.y + Math.cos(heading) * 5);
    camera.position.copy(camPos); camera.lookAt(camLook); camInit = true;
    if (robot) robot.visible = false;
    return;
  }
  if (robot) robot.visible = true;
  const maxH = room && !room.outdoor ? room.h - 0.25 : 30;
  const dist = camDist, h = Math.min(maxH, 1.1 + Math.sin(camPitch) * dist + 0.6);
  const back = new THREE.Vector2(-Math.sin(heading), -Math.cos(heading));
  const right = new THREE.Vector2(-Math.cos(heading), Math.sin(heading));
  let want = pos.clone().add(back.clone().multiplyScalar(Math.cos(camPitch) * dist)).add(right.multiplyScalar(0.35));
  // se dietro c'è un muro la telecamera si avvicina al robot
  for (let i = 0; i < 12 && !camOk(want.x, want.y, h); i++) want.lerp(pos, 0.22);
  const k = camInit ? Math.min(1, dt * 6) : 1; camInit = true;
  camPos.lerp(new THREE.Vector3(want.x, h, want.y), k);
  camLook.lerp(new THREE.Vector3(pos.x + Math.sin(heading) * 1.6, 1.05, pos.y + Math.cos(heading) * 1.6), Math.min(1, k * 1.4));
  camera.position.copy(camPos); camera.lookAt(camLook);
}

// ---------- Porte che portano in un altro laboratorio (dissolvenza in nero) ----------
let portalBusy = false;
const veil = document.createElement("div");
Object.assign(veil.style, { position: "fixed", inset: "0", background: "#000", opacity: "0", pointerEvents: "none", transition: "opacity .45s", zIndex: "15" });
document.body.appendChild(veil);
function portalGo(d) {
  portalBusy = true; target = null; waypoints = []; keys.clear(); veil.style.opacity = "1";
  setTimeout(() => { teleport(d.to[0], d.to[1], d.to[2]); setTimeout(() => { veil.style.opacity = "0"; setTimeout(() => (portalBusy = false), 600); }, 150); }, 480);
}

// ---------- Ciclo ----------
const clock = new THREE.Clock();
const v3 = new THREE.Vector3();
let lastRoom = null, fps = 60;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  fps += ((1 / Math.max(dt, 1e-3)) - fps) * 0.05;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  reach = ESCAPE ? reachableRooms() : reach;

  const run = keys.has("run"), speed = run ? 6.5 : 3.2;
  let moving = false, fwd = 0;
  if (blocked()) keys.clear();
  if (keys.has("l")) heading += dt * 2.3;
  if (keys.has("r")) heading -= dt * 2.3;
  if (keys.has("f")) fwd = 1; if (keys.has("b")) fwd = -0.6;
  if (fwd || keys.has("l") || keys.has("r")) { target = null; waypoints = []; onArrive = null; ring.material.opacity = 0; }
  if (target && !blocked()) {
    const d = target.clone().sub(pos);
    if (d.length() < (waypoints.length ? 0.5 : 0.15)) {
      if (waypoints.length) target = waypoints.shift();
      else { target = null; ring.material.opacity = 0; const cb = onArrive; onArrive = null; if (cb) cb(); }
    } else { heading = lerpAngle(heading, Math.atan2(d.x, d.y), Math.min(1, dt * 8)); fwd = 1; }
  }
  if (fwd && !emoting) {
    const step = new THREE.Vector2(Math.sin(heading), Math.cos(heading)).multiplyScalar(fwd * (target ? Math.min(speed, 4.2) : speed) * dt);
    const next = pos.clone().add(step);
    if (walkable(next)) pos.copy(next);
    else if (walkable(new THREE.Vector2(next.x, pos.y))) pos.x = next.x;
    else if (walkable(new THREE.Vector2(pos.x, next.y))) pos.y = next.y;
    else {
      if (ESCAPE) { const d = doors.find((x) => x.lockBox && isLocked(x) && Math.hypot(pos.x - x.c[0], pos.y - x.c[1]) < 1.8); if (d) lockedFeedback(d); }
      if (target && waypoints.length) target = waypoints.shift(); else { target = null; waypoints = []; ring.material.opacity = 0; }
    }
    moving = true;
  }
  if (robot) {
    if (!emoting) play(moving ? (run && !target ? "Running" : "Walking") : "Idle");
    robot.position.set(pos.x, 0, pos.y); robot.rotation.y = heading;
    mixer.update(dt);
  }
  shadow.position.set(pos.x, 0.012, pos.y);
  if (ring.material.opacity > 0) ring.scale.setScalar(1 + Math.sin(performance.now() / 180) * 0.12);
  updateDoors(dt, pos);
  if (ESCAPE) for (const r of reactors) if (!r.done && G.isSolved(r.puzzle)) { r.done = true; r.fn(); }
  if (!portalBusy) for (const d of doors) if (d.to && !isLocked(d) && Math.hypot(pos.x - d.c[0], pos.y - d.c[1]) < 1.15) { portalGo(d); break; }
  updateCamera(dt, moving, speed);
  // ombre che seguono il robot
  sun.position.set(pos.x + 18, 40, pos.y + 12); sun.target.position.set(pos.x, 0, pos.y);

  const tNow = performance.now() / 1000;
  for (const f of lightsList) f.rotation.y = Math.sin(tNow * 2 + f.userData.flag) * 0.25;
  const room = roomAt(pos) || OUTSIDE;
  if (room !== lastRoom) { lastRoom = room; onRoom(room); }
  const camYaw = Math.atan2(camLook.x - camPos.x, camLook.z - camPos.z);
  if (ESCAPE && G.started()) {
    useTarget = findUseTarget();
    if (useBtn) { useBtn.classList.toggle("on", !!useTarget); if (useTarget) useBtn.querySelector("b").textContent = useTarget.door ? "Porta chiusa" : "Esamina: " + useTarget.it.label; }
    autoOpen(); updateObjective(camYaw);
  } else if (!ESCAPE) {
    useTarget = findUseTarget();
    if (useBtn) { useBtn.classList.toggle("on", !!useTarget); if (useTarget) useBtn.querySelector("b").textContent = "Leggi: " + useTarget.info.title; }
  }
  updateTrail(tNow, ESCAPE && G.started() && !G.modalOpen() && !(objGoal && pos.distanceTo(objGoal.stand) < 1.6));
  for (const b of barriers) {
    b.mesh.material.uniforms.time.value = tNow;
    if (!isLocked(b.d)) b.prog = Math.min(1, b.prog + dt * 0.9);
    b.mesh.material.uniforms.prog.value = b.prog;
    b.mesh.visible = b.prog < 1 && Math.hypot(pos.x - b.d.c[0], pos.y - b.d.c[1]) < 14;
  }
  // segnaposto sullo schermo
  for (const m of markers) {
    let show;
    if (m.door) show = isLocked(m.door) && Math.hypot(pos.x - m.door.c[0], pos.y - m.door.c[1]) < 7;
    else if (m.it) {
      const near = !isBehindLock(m) && pos.distanceTo(m.stand) < 3;
      if (near && G.started()) G.markFound(m.it.puzzle);
      const found = G.isFound(m.it.puzzle), done = G.isDone(m.it.puzzle);
      m.el.classList.toggle("hidden", !found); m.el.classList.toggle("done", done); m.el.classList.toggle("inrange", m === useTarget);
      show = !isBehindLock(m) && pos.distanceTo(m.stand) < 4.2;
      const active = G.started() && found && !done && !isBehindLock(m) && pos.distanceTo(m.stand) < 9;
      m.ring.material.opacity += ((active ? 0.55 + 0.25 * Math.sin(tNow * 3) : 0) - m.ring.material.opacity) * 0.1;
      m.beam.material.opacity += ((active ? 0.22 : 0) - m.beam.material.opacity) * 0.1;
    } else {
      const d = pos.distanceTo(m.stand);
      show = d < 16 && roomAt(m.stand) === room;
      m.el.classList.toggle("inrange", m === useTarget);
      m.ring.material.opacity += ((d < 16 ? 0.45 + 0.2 * Math.sin(tNow * 3) : 0) - m.ring.material.opacity) * 0.1;
      m.beam.material.opacity += ((d < 16 ? 0.18 : 0) - m.beam.material.opacity) * 0.1;
    }
    if (m.ring) m.ring.scale.setScalar(1 + 0.08 * Math.sin(tNow * 3));
    v3.copy(m.p3).project(camera);
    if (!show || v3.z > 1 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1) { m.el.style.display = "none"; continue; }
    m.el.style.display = ""; m.el.style.left = ((v3.x + 1) / 2) * w + "px"; m.el.style.top = ((1 - v3.y) / 2) * h + "px";
  }
  if (objTick % 3 === 0 || !ESCAPE) drawMap(mini);
  if (!ESCAPE) objTick++;
  renderer.render(scene, camera);
}
const lerpAngle = (a, b, k) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

// cambio di stanza: nome in alto, Othy (escape) o scheda dell'area (tour)
const ESC_ZONE = MAP.escZone || { piazzale: "ingresso", piazzale2: "ingresso", vestibolo: "vestibolo", atrio: "atrio", andito: "andito", scale: "andito", anditoF: "anditoF", corrPal: "corrPal", corrPal2: "corrPal2", palestra: "palestra" };
function onRoom(r) {
  if (ESCAPE) { if (G.started() && ESC_ZONE[r.id]) G.setRoom(ESC_ZONE[r.id]); else if (!ESC_ZONE[r.id]) $("#roomName").textContent = r.name; }
  else if (window.Tour) window.Tour.onRoom(r);
}

// ---------- API ----------
window.Scuola3D = {
  rooms, teleport, walkTo, drawMap, roomAt, pos: () => pos.clone(), heading: () => heading,
  setBlocked(fn) { uiBlocked = fn; },
  toggleView() { firstPerson = !firstPerson; camInit = false; return firstPerson; },
  toggleAerial() { aerial = aerial ? 0 : 1; return !!aerial; },
  goRoom(id) { const r = R[id]; if (!r) return; const inf = MAP.info.find((i) => i.room === id); const p = inf ? [inf.pos[0], inf.pos[1] + 2.5] : [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2]; teleport(p[0], p[1], Math.PI); },
  reset() { teleport(...MAP.start.pos, MAP.start.heading); },
  fps: () => Math.round(fps),
  stato: () => ({ pos: pos.toArray().map((v) => +v.toFixed(2)), stanza: (roomAt(pos) || {}).id, vicino: useTarget ? (useTarget.it ? useTarget.it.label : useTarget.info ? useTarget.info.title : "porta") : null, fps: Math.round(fps) })
};
window.Percorso3D = { reset: () => window.Scuola3D.reset() };

// ---------- Avvio ----------
const splash = $("#splash"), splashBar = $("#splashBar"), splashText = $("#splashText");
function splashProgress(p, txt) { if (splashBar) splashBar.style.width = Math.round(p * 100) + "%"; if (txt && splashText) splashText.textContent = txt; }
let robotReady = false;
function closeSplash() { splashProgress(1, "Pronto!"); if (splash) setTimeout(() => { splash.classList.add("out"); setTimeout(() => splash.remove(), 700); }, 300); if (window.Tour) window.Tour.ready(); }
splashProgress(0.5, "Costruisco la scuola…");
$("#loading") && $("#loading").remove();
frame();
new GLTFLoader().load("lib/models/RobotExpressive.glb", (gltf) => {
  robot = gltf.scene;
  robot.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } });
  scene.add(robot);
  mixer = new THREE.AnimationMixer(robot);
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  play("Idle", 0); mixer.update(0.01); robot.updateMatrixWorld(true);
  let lo = Infinity, hi = -Infinity; const v = new THREE.Vector3();
  robot.traverse((o) => { if (o.isBone) { o.getWorldPosition(v); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); } });
  robot.scale.setScalar(ROBOT_H / ((hi - lo) * 1.42));
  const PALETTE = { Main: 0xf0559a, Grey: 0xf6eef2, Black: 0x2a1d26 };
  robot.traverse((o) => { if (!o.isMesh) return; o.material = o.material.clone(); if (PALETTE[o.material.name] !== undefined) o.material.color.setHex(PALETTE[o.material.name]); o.material.roughness = 0.45; o.material.metalness = 0.15; });
  const badge = document.createElement("canvas"); badge.width = badge.height = 256;
  const tex = new THREE.CanvasTexture(badge); tex.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => { const g = badge.getContext("2d"); g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 8; g.strokeStyle = "#c2185b"; g.stroke(); g.drawImage(img, 40, 40, 176, 176); tex.needsUpdate = true; };
  img.src = "lib/img/logoOthoca.png";
  robot.position.set(pos.x, 0, pos.y); robot.rotation.y = heading; robot.updateMatrixWorld(true);
  const head = robot.getObjectByName("Head"), hp = new THREE.Vector3(); head.getWorldPosition(hp);
  const backM = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5 }));
  const off = new THREE.Vector3(0, 0.14, -0.42).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading);
  backM.position.copy(hp).add(off); backM.rotation.y = heading + Math.PI; scene.add(backM); head.attach(backM);
  document.body.classList.add("has-avatar");
  robotReady = true; closeSplash();
}, undefined, () => { robotReady = true; closeSplash(); });
