// Motore 3D: renderer, materiali, oggetti di scena, personaggi, player, camera e collisioni.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export { THREE };
export const PAL = { pink: 0xf0559a, crimson: 0xe0245e, dark: 0x1a1a1a, white: 0xffffff };

// ---------- renderer ----------
export const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("game"), antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
export const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 200);
function fitCamera() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 1 ? 68 : 58; camera.updateProjectionMatrix(); }
fitCamera(); addEventListener("resize", fitCamera);

// ---------- texture disegnate su canvas ----------
const texCache = new Map();
export function canvasTex(key, w, h, draw, repeat = null) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  texCache.set(key, t);
  return t;
}
function noise(g, w, h, a = 0.05, n = 2500) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? "0,0,0" : "255,255,255"},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }
export const TEX = {
  tiles: (base = "#d9d4cc", line = "#b9b2a8", n = 4) => canvasTex("tiles" + base + n, 1024, 1024, (g, w, h) => {
    // piastrelle con leggere differenze di tono, venature e fughe in rilievo
    g.fillStyle = base; g.fillRect(0, 0, w, h); const s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = (Math.random() - 0.5) * 14; g.fillStyle = `rgba(${v > 0 ? "255,255,255" : "0,0,0"},${Math.abs(v) / 100})`; g.fillRect(i * s, j * s, s, s);
      for (let k = 0; k < 3; k++) { g.strokeStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.03})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); g.moveTo(i * s + Math.random() * s, j * s); g.bezierCurveTo(i * s + Math.random() * s, j * s + s / 3, i * s + Math.random() * s, j * s + s * 0.66, i * s + Math.random() * s, j * s + s); g.stroke(); }
    }
    noise(g, w, h, .05, 9000);
    g.strokeStyle = line; g.lineWidth = 5;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
    g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1.5;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s + 3.5, 0); g.lineTo(i * s + 3.5, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s + 3.5); g.lineTo(w, i * s + 3.5); g.stroke(); }
  }),
  plaster: () => canvasTex("plaster", 512, 512, (g, w, h) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); noise(g, w, h, .035, 14000); for (let i = 0; i < 40; i++) { const gr = g.createRadialGradient(Math.random() * w, Math.random() * h, 0, Math.random() * w, Math.random() * h, 120); gr.addColorStop(0, "rgba(0,0,0,.025)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); } }),
  woodLight: () => canvasTex("woodlight", 512, 256, (g, w, h) => {
    g.fillStyle = "#d8b07c"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { g.strokeStyle = `rgba(120,70,30,${0.04 + Math.random() * 0.08})`; g.lineWidth = 1 + Math.random() * 1.5; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + Math.random() * 6 - 3, w * .7, y + Math.random() * 6 - 3, w, y); g.stroke(); }
    noise(g, w, h, .04, 3000);
  }),
  // sfumatura scura per l'occlusione ambientale negli angoli
  ao: () => canvasTex("ao", 64, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(0,0,0,.42)"); gr.addColorStop(0.45, "rgba(0,0,0,.12)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
  parquet: () => canvasTex("parquet", 512, 512, (g, w, h) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 4; x++) {
      const l = 58 + Math.random() * 10; g.fillStyle = `hsl(36, 62%, ${l}%)`;
      const off = (y % 2) * 64; g.fillRect(x * 128 + off - 128, y * 32, 127, 31); g.fillRect(x * 128 + off, y * 32, 127, 31);
    }
    noise(g, w, h, .06, 4000);
  }),
  dots: () => canvasTex("dots", 256, 256, (g, w, h) => {
    g.fillStyle = "#34343a"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#26262b"; for (let y = 16; y < h; y += 32) for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
  }),
  terrazzo: () => canvasTex("terrazzo", 512, 512, (g, w, h) => {
    g.fillStyle = "#cfc9c2"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = Math.random(); g.fillStyle = v < .5 ? "#7d7570" : v < .8 ? "#f4f1ec" : "#4f4844"; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2 + Math.random() * 4); }
  }),
  carpet: (c = "#c8382e") => canvasTex("carpet" + c, 256, 256, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); noise(g, w, h, .12, 6000); }),
  vault: (c = "#e9e2cc") => canvasTex("vault" + c, 256, 256, (g, w, h) => {
    g.fillStyle = c; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(0,0,0,.08)"; g.lineWidth = 2;
    for (let x = 0; x < w; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  }),
  wood: () => canvasTex("wood", 256, 256, (g, w, h) => {
    g.fillStyle = "#a8743f"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(60,30,10,.25)";
    for (let y = 0; y < h; y += 6) { g.beginPath(); g.moveTo(0, y + Math.sin(y) * 2); g.bezierCurveTo(w / 3, y + 4, w * .66, y - 4, w, y); g.stroke(); }
  }),
};

// normal map ricavata dalla texture (le parti scure diventano incavi: fughe, venature, intonaco)
const nmCache = new Map();
export function normalFrom(tex, strength = 2) {
  const key = tex.uuid + strength; if (nmCache.has(key)) return nmCache.get(key);
  const src = tex.image, w = src.width, h = src.height;
  const g = src.getContext("2d"); const d = g.getImageData(0, 0, w, h).data;
  const L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  const c = document.createElement("canvas"); c.width = w; c.height = h; const o = c.getContext("2d"); const out = o.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = L[y * w + ((x - 1 + w) % w)], r = L[y * w + ((x + 1) % w)], u = L[((y - 1 + h) % h) * w + x], dn = L[((y + 1) % h) * w + x];
    let nx = (l - r) * strength, ny = (dn - u) * strength, nz = 1; const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
    const k = (y * w + x) * 4; out.data[k] = (nx * 0.5 + 0.5) * 255; out.data[k + 1] = (ny * 0.5 + 0.5) * 255; out.data[k + 2] = (nz * 0.5 + 0.5) * 255; out.data[k + 3] = 255;
  }
  o.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; nmCache.set(key, t); return t;
}

// ---------- foto vere (ritagli dalle foto 360°) ----------
export const IMG = {};
export function preloadImages(urls) {
  return Promise.all(urls.filter((u) => !IMG[u]).map((u) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[u] = im; res(); }; im.onerror = () => res(); im.src = u; })));
}
// texture da foto precaricata (disegnata su canvas, così si può ricavare anche il rilievo)
export function photoCanvasTex(url, repeat = null, mirror = true) {
  const im = IMG[url]; if (!im) return null;
  const t = canvasTex("img" + url, im.naturalWidth, im.naturalHeight, (g) => g.drawImage(im, 0, 0));
  if (repeat) { const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping; c.repeat.set(repeat[0], repeat[1]); return c; }
  return t;
}

// pannello con testo/disegno (cartelli, poster, schermi)
export function panelTex(key, w, h, draw) { return canvasTex(key, w, h, draw); }
export function textSign(key, text, { bg = "#1a237e", fg = "#fff", w = 512, h = 128, font = "bold 64px Inter, sans-serif" } = {}) {
  return canvasTex("sign" + key, w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 4); });
}

// ---------- materiali ----------
const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o, (k, v) => (v && v.isTexture ? v.uuid : v));
  if (!o.unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, map: o.map || null, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.opacity, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide });
  if (!o.unique) matCache.set(key, m);
  return m;
}
export const M = {};
// vista dalla finestra: cielo, nuvole, alberi e un edificio della scuola sullo sfondo
function windowMat() {
  const t = canvasTex("windowview", 512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#8ec5f0"); gr.addColorStop(0.6, "#d7ecfa"); gr.addColorStop(1, "#eef6fb"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) { g.fillStyle = "rgba(255,255,255,.75)"; const x = Math.random() * w, y = 20 + Math.random() * 60; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + k * 16, y + Math.sin(k) * 6, 14 + Math.random() * 8, 0, 7); g.fill(); } }
    g.fillStyle = "#e3b9b0"; g.fillRect(300, 150, 170, 70); g.fillStyle = "#c79a90"; for (let x = 310; x < 460; x += 28) g.fillRect(x, 165, 18, 14);
    for (let i = 0; i < 26; i++) { const x = i * 21 + Math.random() * 10, r = 18 + Math.random() * 16; g.fillStyle = ["#4c7a3c", "#5d8f45", "#3f6b33"][i % 3]; g.beginPath(); g.arc(x, 205 - Math.random() * 15, r, 0, 7); g.fill(); }
    g.fillStyle = "#9aa39a"; g.fillRect(0, 225, w, 31);
  });
  return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.85, roughness: 0.15 });
}
function initMats() {
  Object.assign(M, {
    white: mat(0xf4f2ee, { rough: .6 }), labTop: mat(0xf4f5f3, { rough: .22 }), mint: mat(0xc8e3cf), cream: mat(0xe8dfc4), creamDark: mat(0xd6caa6),
    glass: mat(0xbfe4f2, { opacity: .35, rough: .1, metal: .1 }), black: mat(0x1e1e22), darkgrey: mat(0x3a3a40), grey: mat(0x8a8d93, { metal: .3, rough: .5 }),
    steel: mat(0xc4c8ce, { metal: .9, rough: .28 }), lightwood: mat(0xffffff, { map: TEX.woodLight(), rough: .55 }), wood: mat(0xffffff, { map: TEX.wood() }), red: mat(0xd32f2f), orange: mat(0xef6c1a),
    yellow: mat(0xf2c21b), blue: mat(0x2f6fd6), navy: mat(0x1d2f6f), green: mat(0x2e8b57), machine: mat(0x76a594, { rough: .45, metal: .35 }), machineDark: mat(0x527a6d, { rough: .5, metal: .35 }),
    teal: mat(0x3d8c9a), screen: mat(0x0e1420, { rough: .3, emissive: 0x0a1a30 }), skin: mat(0xf0c6a0), pallet: mat(0xa0703c),
    lightPanel: mat(0xffffff, { emissive: 0xfffbf0, ei: 3.2 }), window: windowMat(),
    pink: mat(PAL.pink), crimson: mat(PAL.crimson), seatRed: mat(0xd8322d, { rough: .45 }), curtain: mat(0x1f3a32, { rough: 1 }),
  });
}
initMats();

// ---------- costruzione geometrie ----------
// B: box con centro (x,y,z) e dimensioni; C: cilindro; tutto dentro un parent
const geoCache = new Map();
function boxGeo(w, h, d) {
  const mn = Math.min(w, h, d), mx = Math.max(w, h, d);
  if (mn < 0.025 || mx > 6) return new THREE.BoxGeometry(w, h, d);
  const key = `${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}`;
  if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(0.025, mn * 0.22)));
  return geoCache.get(key);
}
export function B(p, x, y, z, w, h, d, m, shadow = true) {
  const mesh = new THREE.Mesh(boxGeo(w, h, d), m); mesh.position.set(x, y, z);
  mesh.castShadow = shadow; mesh.receiveShadow = true; p.add(mesh); return mesh;
}
export function C(p, x, y, z, r, h, m, r2 = r, seg = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r2, h, seg), m); mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true; p.add(mesh); return mesh;
}
export function S(p, x, y, z, r, m) { const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); mesh.position.set(x, y, z); mesh.castShadow = true; p.add(mesh); return mesh; }
export function plane(p, x, y, z, w, h, m, ry = 0, rx = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, 0); mesh.receiveShadow = true; p.add(mesh); return mesh;
}

// ---------- stato del mondo ----------
export const world = {
  scene: null, colliders: [], camColliders: [], interactables: [], npcs: [], animated: [], bounds: null, floors: [],
};

let envTex = null;
function roomEnvironment() {
  if (envTex) return envTex;
  const pm = new THREE.PMREMGenerator(renderer); const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), new THREE.MeshBasicMaterial({ color: 0x7a746c, side: THREE.BackSide })));
  const panel = (x, y, z, w, h, d, i, c = [1, 1, 1]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0] * i, c[1] * i, c[2] * i) })); m.position.set(x, y, z); s.add(m); };
  panel(0, 2.95, 0, 7, 0.05, 1.2, 5); panel(0, 2.95, -3, 7, 0.05, 1.2, 5); panel(0, 2.95, 3, 7, 0.05, 1.2, 5);
  panel(-5.95, 1.8, 0, 0.05, 1.4, 8, 3.2, [0.85, 0.93, 1]); panel(5.95, 1.8, 0, 0.05, 1.4, 8, 2.4, [0.85, 0.93, 1]);
  panel(0, -2.9, 0, 12, 0.1, 12, 0.5, [0.95, 0.9, 0.85]);
  envTex = pm.fromScene(s, 0.035).texture; pm.dispose(); return envTex;
}
export function newScene({ bg = 0x1a1418, fog = null } = {}) {
  const scene = new THREE.Scene();
  scene.environment = roomEnvironment(); scene.environmentIntensity = 0.4;
  scene.background = new THREE.Color(bg);
  if (fog) scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
  world.scene = scene; world.floors = []; world.colliders = []; world.camColliders = []; world.interactables = []; world.npcs = []; world.animated = [];
  return scene;
}

// collisioni: rettangoli sul piano XZ
// zone calpestabili rialzate (scale, palco, pianerottoli): { x0, z0, x1, z1, y } oppure y(x, z)
export function addFloor(f) { world.floors.push(f); }
export function heightAt(x, z) { let h = 0; for (const f of world.floors) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) h = Math.max(h, typeof f.y === "function" ? f.y(x, z) : f.y); return h; }
export function addCollider(x0, z0, x1, z1) { world.colliders.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) }); }
export function colliderFromObject(obj, pad = 0.02) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj);
  addCollider(b.min.x - pad, b.min.z - pad, b.max.x + pad, b.max.z + pad);
}

// posiziona un oggetto di scena (gruppo) nel mondo
export function place(group, x, z, ry = 0, { solid = true, cam = false, y = 0 } = {}) {
  group.position.set(x, y, z); group.rotation.y = ry; world.scene.add(group);
  if (solid) colliderFromObject(group);
  if (cam) group.traverse((o) => { if (o.isMesh) world.camColliders.push(o); });
  return group;
}

// stanza: pavimento, pareti, soffitto, finestre, luci
export function buildShell(def) {
  const [W, D, H] = def.size; const scene = world.scene;
  world.bounds = { x0: -W / 2 + 0.3, x1: W / 2 - 0.3, z0: -D / 2 + 0.3, z1: D / 2 - 0.3 };
  const baseFloor = (def.floorPhoto && photoCanvasTex(def.floorPhoto)) || def.floorTex;
  const floorTex = baseFloor.clone(); floorTex.needsUpdate = true; floorTex.wrapS = floorTex.wrapT = def.floorPhoto ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
  floorTex.repeat.set(W / (def.floorScale || 2.4), D / (def.floorScale || 2.4));
  const floorN = normalFrom(baseFloor, def.floorBump ?? 3).clone(); floorN.wrapS = floorN.wrapT = floorTex.wrapS; floorN.needsUpdate = true; floorN.repeat.copy(floorTex.repeat);
  const floor = plane(scene, 0, 0, 0, W, D, new THREE.MeshStandardMaterial({ map: floorTex, normalMap: floorN, normalScale: new THREE.Vector2(0.6, 0.6), roughness: def.floorRough ?? .32, metalness: 0, envMapIntensity: 1.3 }), 0, -Math.PI / 2);
  floor.name = "floor";
  if (def.ceilPhoto && IMG[def.ceilPhoto]) { def.ceilTex = photoCanvasTex(def.ceilPhoto).clone(); def.ceilTex.needsUpdate = true; def.ceilTex.wrapS = def.ceilTex.wrapT = THREE.MirroredRepeatWrapping; }
  // il soffitto riceve poca luce diretta: un po' di emissione lo tiene chiaro come nelle foto
  const ceilMat = def.ceilTex ? new THREE.MeshStandardMaterial({ map: def.ceilTex, roughness: .9, emissive: 0xffffff, emissiveMap: def.ceilTex, emissiveIntensity: def.ceilGlow ?? 0.55 }) : mat(def.ceil || 0xefeee8, { emissive: def.ceil || 0xefeee8, ei: def.ceilGlow ?? 0.5 });
  if (def.ceilTex) { if (!def.ceilPhoto) def.ceilTex.wrapS = def.ceilTex.wrapT = THREE.RepeatWrapping; const cs = def.ceilScale || 3; def.ceilTex.repeat.set(W / cs, D / cs); }
  plane(scene, 0, H, 0, W, D, ceilMat, 0, Math.PI / 2);
  const plasterT = TEX.plaster(); plasterT.wrapS = plasterT.wrapT = THREE.RepeatWrapping; plasterT.repeat.set(3, 1.5);
  const plasterN = normalFrom(TEX.plaster(), 6).clone(); plasterN.needsUpdate = true; plasterN.repeat.copy(plasterT.repeat);
  const wallM = new THREE.MeshStandardMaterial({ color: def.wall || 0xf2efe8, roughness: .92, map: plasterT, normalMap: plasterN, normalScale: new THREE.Vector2(0.35, 0.35) });
  const bandM = def.band ? mat(def.band, { rough: .9 }) : null;
  const t = 0.2;
  const walls = [[0, -D / 2 - t / 2, W + 2 * t, t], [0, D / 2 + t / 2, W + 2 * t, t], [-W / 2 - t / 2, 0, t, D], [W / 2 + t / 2, 0, t, D]];
  for (const [x, z, w, d] of walls) {
    const m = B(scene, x, H / 2, z, w, H, d, wallM, false); world.camColliders.push(m);
    if (bandM) B(scene, x, 0.6, z, w + (d > w ? 0.02 : 0), 1.2, d + (w > d ? 0.02 : 0), bandM, false);
  }
  // occlusione ambientale finta: sfumature scure dove pareti, pavimento e soffitto si incontrano
  const aoM = new THREE.MeshBasicMaterial({ map: TEX.ao(), transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const aoW = 0.7, P2 = Math.PI / 2;
  for (const [y, flip] of [[0.006, 1], [H - 0.006, -1]]) {
    const rx = flip > 0 ? -P2 : P2;
    plane(scene, 0, y, -D / 2 + aoW / 2, W, aoW, aoM, 0, rx).rotation.set(rx, 0, flip > 0 ? 0 : Math.PI);
    plane(scene, 0, y, D / 2 - aoW / 2, W, aoW, aoM, 0, rx).rotation.set(rx, 0, flip > 0 ? Math.PI : 0);
    const a = plane(scene, -W / 2 + aoW / 2, y, 0, D, aoW, aoM, 0, rx); a.rotation.set(rx, 0, P2);
    const b = plane(scene, W / 2 - aoW / 2, y, 0, D, aoW, aoM, 0, rx); b.rotation.set(rx, 0, -P2);
  }
  for (const [x, z, ry] of [[0, -D / 2 + 0.005, 0], [0, D / 2 - 0.005, Math.PI], [-W / 2 + 0.005, 0, P2], [W / 2 - 0.005, 0, -P2]]) {
    const len = Math.abs(ry) === P2 ? D : W;
    const lo = plane(scene, x, aoW / 2, z, len, aoW, aoM, ry); lo.rotation.set(0, ry, Math.PI); lo.renderOrder = 1;
    const hi = plane(scene, x, H - aoW / 2, z, len, aoW, aoM, ry); hi.renderOrder = 1;
  }
  if (def.wallBand && IMG[def.wallBand.url]) {
    const { url, y, h } = def.wallBand;
    for (const [x, z, ry, len] of [[0, -D / 2 + 0.012, 0, W], [0, D / 2 - 0.012, Math.PI, W], [-W / 2 + 0.012, 0, Math.PI / 2, D], [W / 2 - 0.012, 0, -Math.PI / 2, D]]) {
      const t = photoCanvasTex(url, [len / (h * 5.3), 1]); plane(scene, x, y, z, len, h, new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), ry);
    }
  }
  // battiscopa
  const skirt = mat(0x6d6a66);
  B(scene, 0, 0.05, -D / 2 + 0.01, W, 0.1, 0.03, skirt, false); B(scene, 0, 0.05, D / 2 - 0.01, W, 0.1, 0.03, skirt, false);
  B(scene, -W / 2 + 0.01, 0.05, 0, 0.03, 0.1, D, skirt, false); B(scene, W / 2 - 0.01, 0.05, 0, 0.03, 0.1, D, skirt, false);
  // finestre a nastro
  const blindsT = def.windowBlinds ? canvasTex("blinds", 256, 256, (g, w, h) => { g.fillStyle = "#cfe6f5"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 10) { g.fillStyle = "#3f8fb0"; g.fillRect(0, y, w, 7); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(0, y, w, 2); } }) : null;
  const winM = blindsT ? new THREE.MeshStandardMaterial({ map: blindsT, emissive: 0xffffff, emissiveMap: blindsT, emissiveIntensity: 0.55, roughness: 0.6 }) : def.windowPhoto && IMG[def.windowPhoto] ? (() => { const t = photoCanvasTex(def.windowPhoto); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.75, roughness: 0.2 }); })() : M.window;
  for (const win of def.windows || []) {
    const { side, y = 2.2, h = 1.0, from = -0.4, to = 0.4, n = 4 } = win;
    const along = side === "n" || side === "s" ? W : D; const len = (to - from) * along; const cw = len / n;
    for (let i = 0; i < n; i++) {
      const c = (from * along) + cw * (i + 0.5);
      const g = new THREE.Group();
      B(g, 0, 0, 0, cw - 0.12, h, 0.04, winM, false);
      B(g, 0, -h / 2 - 0.04, 0.04, cw, 0.08, 0.12, mat(0x55585e), false);
      B(g, 0, h / 2 + 0.03, 0.02, cw, 0.06, 0.08, mat(0x55585e), false);
      if (side === "n") g.position.set(c, y, -D / 2 + 0.03);
      if (side === "s") { g.position.set(c, y, D / 2 - 0.03); g.rotation.y = Math.PI; }
      if (side === "w") { g.position.set(-W / 2 + 0.03, y, c); g.rotation.y = Math.PI / 2; }
      if (side === "e") { g.position.set(W / 2 - 0.03, y, c); g.rotation.y = -Math.PI / 2; }
      scene.add(g);
    }
  }
  // luci
  scene.add(new THREE.HemisphereLight(def.sky || 0xfdfbff, def.ground || 0x8a8070, (def.hemi ?? 1.1) * 0.7));
  const sun = new THREE.DirectionalLight(def.sun || 0xfff2e0, def.sunI ?? 1.6);
  sun.position.set(W * 0.3, H * 2.2, D * 0.35); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(gfx.quality === "alta" ? 4096 : 2048, gfx.quality === "alta" ? 4096 : 2048); sun.shadow.radius = 3;
  const s = Math.max(W, D) * 0.62; Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: H * 5 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  // pannelli luminosi a soffitto
  const lw = def.lightW || 1.3, ld = def.lightD || 0.28, sx = def.lightSX || 3, sz = def.lightSZ || 2.6;
  for (let x = -W / 2 + sx / 2 + 0.4; x < W / 2 - 0.4; x += sx) for (let z = -D / 2 + sz / 2 + 0.4; z < D / 2 - 0.4; z += sz)
    { B(scene, x, H - 0.04, z, lw + 0.06, 0.05, ld + 0.06, M.steel, false); B(scene, x, H - 0.07, z, lw, 0.02, ld, M.lightPanel, false); }
  addDust(W, D, H);
  return { W, D, H };
}

// porta (con cartello). Ritorna { group, leaf, open(t) }
export function door(x, z, ry, { color = 0x2f5f4a, label = null, labelBg = "#c62828", w = 1.1, h = 2.2, glass = false } = {}) {
  const g = new THREE.Group();
  const frameM = mat(0x8a5a2b);
  B(g, -w / 2 - 0.05, h / 2, 0, 0.1, h + 0.1, 0.16, frameM); B(g, w / 2 + 0.05, h / 2, 0, 0.1, h + 0.1, 0.16, frameM); B(g, 0, h + 0.05, 0, w + 0.2, 0.1, 0.16, frameM);
  const pivot = new THREE.Group(); pivot.position.set(-w / 2, 0, 0.02); g.add(pivot);
  const leafM = mat(color, { unique: true });
  const leaf = B(pivot, w / 2, h / 2, 0, w, h, 0.05, leafM);
  if (glass) B(pivot, w / 2, h * 0.62, 0.03, w * 0.6, h * 0.45, 0.01, M.glass, false);
  B(pivot, w - 0.12, 1.05, 0.06, 0.18, 0.04, 0.04, M.steel); // maniglia
  if (label) { const tex = textSign(label + labelBg, label, { bg: labelBg, w: 512, h: 128, font: "bold 70px Inter, sans-serif" }); plane(g, 0, h + 0.32, 0.09, 0.9, 0.22, new THREE.MeshBasicMaterial({ map: tex })); }
  place(g, x, z, ry, { solid: false });
  let openT = 0, target = 0;
  const api = { group: g, leaf, leafM, pivot, open() { target = 1; }, close() { target = 0; }, get isOpen() { return openT > 0.9; } };
  world.animated.push((dt) => { openT += (target - openT) * Math.min(1, dt * 3); pivot.rotation.y = -openT * 1.7; });
  return api;
}

// ---------- personaggi (low-poly procedurali, più curati) ----------
// logo vero dell'Othoca (PNG con trasparenza) usato sullo zaino e sulla divisa
export const LOGO = new THREE.TextureLoader().load("logo.png", (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; });
LOGO.colorSpace = THREE.SRGBColorSpace;
const logoMat = new THREE.MeshStandardMaterial({ map: LOGO, transparent: true, alphaTest: 0.05, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 });

// tessuto della tuta: pieghe e grinze disegnate, con rilievo
function suitMat(color) {
  const t = canvasTex("suitfabric", 512, 512, (g, w, h) => {
    g.fillStyle = "#c8c8c8"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const x = Math.random() * w, y = Math.random() * h, l = 30 + Math.random() * 90, a = (Math.random() - 0.5) * 0.9 + (Math.random() < .5 ? 0 : Math.PI / 2); const gr = g.createLinearGradient(x, y - 6, x, y + 6); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(${Math.random() < .5 ? "0,0,0" : "255,255,255"},${0.12 + Math.random() * 0.15})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = gr; g.fillRect(-l / 2, -6, l, 12); g.restore(); }
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  }, [2, 2]);
  const m = new THREE.MeshStandardMaterial({ color, map: t, normalMap: normalFrom(t, 5), normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.62 });
  m.normalMap.repeat.set(2, 2); return m;
}
export function makeHuman(o = {}) {
  const look = Object.assign({ skin: 0xf0c6a0, hair: 0x3b2a20, hairStyle: "short", shirt: 0x2f6fd6, pants: 0x2b2f3a, shoes: 0x1c1c1c, sole: 0xf4f4f4, coat: null, sleeves: "long", backpack: false, hat: null, beard: false, beardColor: null, glasses: false, hairLong: false, scale: 1, logo: false, female: false, eyes: 0x4a3222 }, o);
  if (look.hairLong && look.hairStyle === "short") look.hairStyle = "long";
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const skin = mat(look.skin, { rough: .55 }), shirt = mat(look.shirt, { rough: .85 }), pants = look.hazmat ? suitMat(look.pants) : mat(look.pants, { rough: .9 }), shoes = mat(look.shoes, { rough: .55 }), hair = mat(look.hair, { rough: .7 });
  const top = look.hazmat ? suitMat(look.shirt) : look.coat ? mat(look.coat, { rough: .75 }) : shirt;
  const sleeveM = look.sleeves === "short" && !look.coat ? skin : top;
  const cap = (pr, x, y, z, r, h, m, seg = 16) => { const g = new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 8, seg), m); g.position.set(x, y, z); g.castShadow = true; g.receiveShadow = true; pr.add(g); return g; };
  const sph = (pr, x, y, z, r, m, sx = 1, sy = 1, sz = 1, seg = 22) => { const g = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), m); g.position.set(x, y, z); g.scale.set(sx, sy, sz); g.castShadow = true; g.receiveShadow = true; pr.add(g); return g; };
  const lathe = (pts, m, seg = 28) => { const g = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), m); g.castShadow = true; g.receiveShadow = true; return g; };

  // ---- gambe: coscia, ginocchio, polpaccio, scarpa ----
  const legs = [-0.095, 0.095].map((x) => {
    const hip = new THREE.Group(); hip.position.set(x, 0.94, 0); body.add(hip);
    cap(hip, 0, -0.22, 0, 0.088, 0.3, pants);
    const knee = new THREE.Group(); knee.position.y = -0.45; hip.add(knee);
    sph(knee, 0, 0, 0, 0.078, pants);
    cap(knee, 0, -0.2, 0, 0.072, 0.3, pants);
    const shoe = new THREE.Group(); shoe.position.set(0, -0.43, 0.04); knee.add(shoe);
    sph(shoe, 0, 0.02, 0.0, 0.075, shoes, 1, 0.62, 1.75);
    const so = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.078, 0.03, 20), mat(look.sole, { rough: .7 })); so.scale.set(1, 1, 1.75); so.position.y = -0.025; so.castShadow = true; shoe.add(so);
    if (look.shoes !== look.sole) B(shoe, 0, 0.045, 0.06, 0.08, 0.01, 0.07, mat(0xffffff), false); // lacci
    return { hip, knee };
  });
  // ---- bacino e busto modellato (spalle larghe, vita stretta) ----
  const pelvis = lathe([[0, 0.86], [0.13, 0.88], [0.165, 0.94], [0.165, 1.0], [0, 1.0]], pants); pelvis.scale.z = 0.72; body.add(pelvis);
  B(body, 0, 0.99, 0, 0.35, 0.045, 0.245, mat(0x2a2a2a, { rough: .4 }), false); // cintura
  B(body, 0, 0.99, 0.123, 0.05, 0.035, 0.01, M.steel, false); // fibbia
  const torsoPts = look.female
    ? [[0, 0.97], [0.15, 0.98], [0.14, 1.08], [0.13, 1.15], [0.17, 1.27], [0.18, 1.36], [0.185, 1.44], [0.15, 1.52], [0.07, 1.57], [0, 1.58]]
    : [[0, 0.97], [0.155, 0.98], [0.16, 1.08], [0.165, 1.2], [0.19, 1.33], [0.205, 1.43], [0.19, 1.5], [0.08, 1.57], [0, 1.58]];
  const torso = lathe(torsoPts, top); torso.scale.z = 0.68; body.add(torso);
  if (look.coat) {
    // giacca aperta: camicia al centro, risvolti e bottoni
    B(body, 0, 1.3, 0.122, 0.11, 0.42, 0.02, shirt, false);
    for (const sx of [-1, 1]) { const lap = B(body, sx * 0.07, 1.38, 0.125, 0.05, 0.22, 0.015, top, false); lap.rotation.z = sx * 0.35; }
    if (look.tie) B(body, 0, 1.34, 0.134, 0.035, 0.28, 0.01, mat(look.tie), false);
  } else {
    const col = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 22), top); col.position.set(0, 1.545, 0.01); col.rotation.x = Math.PI / 2; col.scale.y = 0.75; body.add(col);
    if (look.hood) B(body, 0, 1.25, 0.128, 0.008, 0.45, 0.008, mat(0x111111, { rough: .3, metal: .6 }), false); // zip della felpa
  }
  if (look.longCoat) { const sk = lathe([[0.165, 0.99], [0.19, 0.85], [0.215, 0.62], [0.205, 0.6]], top); sk.material = top.clone(); sk.material.side = THREE.DoubleSide; sk.scale.z = 0.75; body.add(sk); for (const sx of [-1, 1]) B(body, sx * 0.1, 0.92, 0.135, 0.07, 0.07, 0.01, top, false); }
  if (look.logo) plane(body, 0.085, 1.39, 0.137, 0.1, 0.1, logoMat).rotation.y = 0.12;
  if (look.whistle) { const lan = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.006, 6, 24, Math.PI * 1.15), mat(0xe0245e)); lan.position.set(0, 1.46, 0.08); lan.rotation.set(1.25, 0, Math.PI * 0.93); body.add(lan); const wh = C(body, 0, 1.33, 0.14, 0.018, 0.05, M.steel); wh.rotation.z = Math.PI / 2; }
  if (look.necklace) { const nk = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.006, 6, 24), mat(look.necklace, { metal: .8, rough: .3 })); nk.position.set(0, 1.5, 0.05); nk.rotation.x = 1.15; body.add(nk); sph(body, 0, 1.43, 0.13, 0.016, mat(look.necklace, { metal: .8, rough: .3 })); }
  if (look.scarf) { const sm = mat(look.scarf, { rough: .95 }); const sc = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.035, 10, 22), sm); sc.position.set(0, 1.56, 0.0); sc.rotation.x = Math.PI / 2; body.add(sc); cap(body, 0.06, 1.38, 0.13, 0.03, 0.2, sm, 10); }
  if (look.hood) { const hd = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 10, 24, Math.PI * 1.3), top); hd.position.set(0, 1.55, -0.07); hd.rotation.set(Math.PI / 2 + 0.3, 0, Math.PI * 0.85 + Math.PI / 2); hd.castShadow = true; body.add(hd); for (const sx of [-1, 1]) cap(body, sx * 0.04, 1.4, 0.135, 0.006, 0.12, mat(0xffffff), 6); }
  // ---- braccia: spalla, gomito, avambraccio, mano con pollice ----
  const arms = [-1, 1].map((sx) => {
    const sh = new THREE.Group(); sh.position.set(sx * 0.245, 1.47, 0); body.add(sh);
    sph(sh, 0, 0, 0, 0.078, top);
    cap(sh, 0, -0.15, 0, 0.063, 0.2, look.sleeves === "short" && !look.coat ? top : top);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    sph(el, 0, 0, 0, 0.056, sleeveM);
    cap(el, 0, -0.13, 0, 0.052, 0.18, sleeveM);
    if (look.sleeves !== "short" || look.coat) { const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.03, 16), look.coat ? shirt : top); cuff.position.y = -0.24; el.add(cuff); }
    const hand = new THREE.Group(); hand.position.y = -0.31; el.add(hand);
    sph(hand, 0, 0, 0, 0.052, look.gloves ? mat(look.gloves, { rough: .6 }) : skin, look.gloves ? 0.95 : 0.75, look.gloves ? 1.2 : 1.15, look.gloves ? 0.75 : 0.55);
    const th = cap(hand, sx * -0.03, 0.01, 0.025, 0.016, 0.04, skin, 8); th.rotation.z = sx * 0.6;
    return { sh, el };
  });
  // ---- collo e testa ----
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.12, 18), skin); neck.position.y = 1.61; neck.castShadow = true; body.add(neck);
  const head = new THREE.Group(); head.position.y = 1.82; head.scale.setScalar(look.hazmat ? 1.08 : 1.04); body.add(head);
  sph(head, 0, 0, 0, 0.16, skin, 1, 1.12, 1.05, 32);
  sph(head, 0, -0.09, 0.03, 0.12, skin, 1, 0.75, 1.0, 24); // mascella
  for (const sx of [-1, 1]) { sph(head, sx * 0.158, -0.005, 0, 0.032, skin, 0.55, 1, 0.9); }
  const faceStart = head.children.length;
  const eyeWhite = mat(0xffffff, { rough: .25 }), irisM = mat(look.eyes, { rough: .25 }), pupilM = mat(0x0c0c0c, { rough: .2 });
  const eyes = [];
  for (const x of [-0.056, 0.056]) {
    const eg = new THREE.Group(); eg.position.set(x, 0.022, 0.13); head.add(eg);
    sph(eg, 0, 0, 0, 0.036, eyeWhite, 1.05, 1.0, 0.55); sph(eg, 0, -0.002, 0.014, 0.022, irisM, 1, 1.05, 0.5); sph(eg, 0, -0.002, 0.022, 0.011, pupilM, 1, 1.05, 0.5); sph(eg, 0.008, 0.008, 0.026, 0.0055, eyeWhite);
    const lid = sph(eg, 0, 0.03, 0.002, 0.039, skin, 1.08, 0.22, 0.62); // palpebra
    eyes.push(lid);
  }
  const lidM = skin;
  for (const x of [-0.056, 0.056]) { const br = B(head, x, 0.082, 0.142, 0.07, 0.016, 0.02, look.beardColor && !look.female ? mat(look.beardColor) : hair, false); br.rotation.z = x < 0 ? 0.1 : -0.1; void lidM; }
  const nose = cap(head, 0, -0.022, 0.155, 0.018, 0.035, skin, 10); nose.rotation.x = 0.35;
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.0075, 8, 18, Math.PI), mat(0x9c3b3b, { rough: .5 })); smile.position.set(0, -0.072, 0.138); smile.rotation.z = Math.PI; smile.scale.y = 0.6; head.add(smile);
  const mouth = sph(head, 0, -0.078, 0.137, 0.022, mat(0x5a1f26, { rough: .6 }), 1.3, 0.15, 0.5); // bocca che si apre quando parla
  if (look.female) smile.material = mat(0xc2415a, { rough: .4 });
  const blush = mat(0xf29a96, { rough: .9, opacity: 0.35 });
  sph(head, -0.085, -0.035, 0.115, 0.03, blush, 1, 0.65, 0.4); sph(head, 0.085, -0.035, 0.115, 0.03, blush, 1, 0.65, 0.4);
  // foto vera del docente sul viso: calotta sferica frontale con la foto, al posto di occhi/naso/bocca disegnati
  if (look.face) {
    for (let i = faceStart; i < head.children.length; i++) head.children[i].visible = false;
    const ft = new THREE.TextureLoader().load(look.face, (t) => { t.colorSpace = THREE.SRGBColorSpace; }); ft.colorSpace = THREE.SRGBColorSpace;
    const fg = new THREE.SphereGeometry(0.168, 40, 32, Math.PI * 0.5 - 0.9, 1.8, Math.PI / 2 - 0.92, 1.84);
    const fm = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: ft, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
    fm.scale.set(1.03, 1.12, 1.1); fm.position.set(0, -0.012, 0.004); fm.rotation.y = -Math.PI / 2 + Math.PI / 2; head.add(fm);
  }
  // ---- tuta gialla da esploratore (come l'immagine di riferimento): cappuccio con visiera nera ----
  if (look.hazmat) {
    // tuta protettiva con maschera antigas (come nell'immagine di riferimento)
    for (let i = 0; i < head.children.length; i++) head.children[i].visible = false;
    const suit = suitMat(look.shirt);
    sph(head, 0, 0.0, -0.03, 0.235, suit, 1.06, 1.18, 1.08, 32); // cappuccio largo
    sph(head, 0, -0.17, -0.02, 0.2, suit, 1.15, 0.6, 1.0, 24); // collo morbido della tuta
    const rubber = mat(0x1b1b1d, { rough: .45 });
    const maskG = new THREE.Group(); maskG.position.set(0, -0.01, 0.175); maskG.scale.setScalar(1.25); head.add(maskG);
    sph(maskG, 0, 0, 0, 0.13, rubber, 1.0, 1.1, 0.72, 28); // facciale in gomma
    const rim = mat(0xb9bcc0, { metal: .9, rough: .25 }), lens = new THREE.MeshPhysicalMaterial({ color: 0x0c1412, roughness: 0.05, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
    for (const x of [-0.052, 0.052]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.009, 10, 28), rim); r.position.set(x, 0.035, 0.085); r.rotation.y = x * 2.2; maskG.add(r); const l = new THREE.Mesh(new THREE.CircleGeometry(0.035, 28), lens); l.position.set(x, 0.035, 0.088); l.rotation.y = x * 2.2; maskG.add(l); }
    const can = C(maskG, 0, -0.07, 0.09, 0.045, 0.06, mat(0x2a2a2c, { rough: .4, metal: .3 }), 0.05, 24); can.rotation.x = Math.PI / 2 - 0.35;
    const cap2 = C(maskG, 0, -0.085, 0.125, 0.048, 0.015, rim, 0.048, 24); cap2.rotation.x = Math.PI / 2 - 0.35;
    for (const sx of [-1, 1]) { const f = C(maskG, sx * 0.075, -0.045, 0.05, 0.028, 0.04, mat(0x2a2a2c), 0.03, 16); f.rotation.set(Math.PI / 2 - 0.3, 0, sx * 0.6); }
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.01, 6, 30, Math.PI), rubber); strap.position.set(0, 0.0, -0.01); strap.rotation.set(0, Math.PI / 2, Math.PI / 2); head.add(strap);
    // pieghe, cuciture, cerniera e chiusure della tuta
    B(body, 0, 1.22, 0.135, 0.02, 0.5, 0.012, mat(0x6b5a1a, { rough: .5 }), false);
    for (const y of [1.0, 1.48]) { const sm = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 6, 28), suit); sm.position.y = y; sm.rotation.x = Math.PI / 2; sm.scale.z = 0.7; body.add(sm); }
    for (const lg of legs) { const cuff = C(lg.knee, 0, -0.36, 0, 0.1, 0.06, rubber); void cuff; }
    for (const a of arms) { const cf = C(a.el, 0, -0.25, 0, 0.075, 0.05, rubber); void cf; }
  }
  // ---- capelli ----
  if (!look.hazmat) {
  if (look.hairStyle === "curly") {
    for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 1.35 - 0.45; const r = 0.18 + Math.random() * 0.035; const x = Math.cos(a) * Math.cos(e) * r, y = Math.sin(e) * r + 0.04, z = Math.sin(a) * Math.cos(e) * r; if (z > -0.02 && y < 0.11) continue; if (z > 0.08 && y < 0.15) continue; sph(head, x, y, z - 0.015, 0.05 + Math.random() * 0.025, hair, 1, 1, 1, 12); }
    for (let i = 0; i < 26; i++) { sph(head, (Math.random() - 0.5) * 0.34, -0.08 - Math.random() * 0.17, -0.06 - Math.random() * 0.1, 0.055, hair, 1, 1, 1, 12); }
  } else if (look.hairStyle !== "bald") {
    sph(head, 0, 0.055, -0.018, 0.168, hair, 1.05, 0.88, 1.08, 28);
    sph(head, 0.02, 0.115, 0.075, 0.1, hair, 1.45, 0.42, 0.85, 20); // ciuffo
    for (let i = 0; i < 14; i++) { const a = -0.2 - Math.random() * 2.7; sph(head, Math.cos(a) * 0.12, 0.13 + Math.random() * 0.04, Math.sin(a) * 0.12, 0.05, hair, 1, 0.6, 1, 10); }
    for (const sx of [-1, 1]) sph(head, sx * 0.15, 0.02, -0.02, 0.05, hair, 0.5, 1.3, 1.1, 12); // basette
    if (look.hairStyle === "long") { const back = cap(head, 0, -0.14, -0.085, 0.15, 0.24, hair, 18); back.scale.set(1.18, 1, 0.62); for (const sx of [-1, 1]) cap(head, sx * 0.14, -0.12, 0.02, 0.05, 0.2, hair, 10); }
  }
  }
  if (look.glasses && !look.face) { const gm = mat(0x1d1d1d, { rough: .25, metal: .6 }); B(head, 0, 0.026, 0.168, 0.05, 0.01, 0.01, gm, false); [-0.058, 0.058].forEach((x) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.006, 8, 20), gm); r.position.set(x, 0.022, 0.163); head.add(r); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.034, 20), M.glass); lens.position.set(x, 0.022, 0.164); head.add(lens); }); }
  if (look.beard && !look.face) {
    const bm = look.beardColor ? mat(look.beardColor, { rough: .95 }) : hair;
    for (let i = 0; i < 34; i++) { const a = Math.PI * (0.05 + Math.random() * 0.9); const r = 0.14 + Math.random() * 0.02; sph(head, Math.cos(a) * r * 0.95, -0.06 - Math.sin(a) * 0.08 - Math.random() * 0.02, 0.05 + Math.sin(a) * r * 0.55, 0.035, bm, 1, 0.8, 0.8, 10); }
    const mous = sph(head, 0, -0.048, 0.148, 0.04, bm, 1.5, 0.4, 0.5, 12); void mous; smile.position.z = 0.152;
  }
  if (look.goggles) { const gm = mat(0x7ec8e3, { opacity: 0.6, rough: .1 }); const band = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 28), mat(0x222222)); band.position.set(0, 0.11, 0); band.rotation.x = Math.PI / 2 - 0.25; head.add(band); for (const sx of [-1, 1]) sph(head, sx * 0.05, 0.15, 0.13, 0.035, gm, 1.1, 0.8, 0.6); }
  if (look.hat) { const hm = mat(look.hat, { rough: .7 }); sph(head, 0, 0.1, 0, 0.172, hm, 1.03, 0.62, 1.06); B(head, 0, 0.09, 0.16, 0.26, 0.018, 0.15, hm); }
  // ---- zaino con il logo dell'Othoca ----
  if (look.backpack) {
    const bp = mat(0x262a33, { rough: .7 });
    if (!look.hazmat) {
    const bag = cap(body, 0, 1.25, -0.2, 0.15, 0.22, bp, 20); bag.scale.set(1.15, 1, 0.6);
    const pocket = cap(body, 0, 1.08, -0.27, 0.1, 0.06, mat(PAL.pink, { rough: .6 }), 16); pocket.rotation.z = Math.PI / 2; pocket.scale.set(1, 1.4, 0.55);
    for (const x of [-0.11, 0.11]) { const st = B(body, x, 1.33, 0.0, 0.045, 0.38, 0.29, bp, false); st.scale.z = 1; }
    }
    const bz = look.hazmat ? -0.255 : -0.293;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.13, 40), mat(0xffffff, { rough: .45 })); disc.position.set(0, 1.29, bz); disc.rotation.y = Math.PI; body.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.142, 40), mat(PAL.pink)); ring.position.set(0, 1.29, bz - 0.001); ring.rotation.y = Math.PI; body.add(ring);
    const lg = plane(body, 0, 1.29, bz - 0.003, 0.23, 0.23, logoMat); lg.rotation.y = Math.PI;
    if (!look.hazmat) { const torch = C(body, 0.15, 1.42, 0.12, 0.026, 0.12, mat(0xffe08a, { emissive: 0xffcc55, ei: 1.2 })); torch.rotation.x = Math.PI / 2; }
  }
  if (look.hazmat) {
    for (const g of [...legs.flatMap((l) => [l.hip, l.knee]), ...arms.flatMap((a) => [a.sh, a.el])]) for (const m of g.children) if (m.isMesh && m.geometry.type !== "CylinderGeometry") { m.scale.x *= 1.62; m.scale.z *= 1.55; }
    torso.scale.x *= 1.28; torso.scale.z = 0.98; pelvis.scale.x *= 1.3; pelvis.scale.z = 1.0;
    const sm = suitMat(look.shirt);
    for (const l of legs) { sph(l.knee, 0, -0.02, 0.0, 0.12, sm, 1.1, 0.8, 1.05); sph(l.hip, 0, -0.12, 0.0, 0.14, sm, 1.0, 1.25, 1.0); sph(l.knee, 0, -0.3, 0, 0.12, sm, 1.0, 0.9, 1.0); }
    for (const a of arms) { sph(a.el, 0, 0, 0, 0.09, sm, 1.1, 0.9, 1.1); sph(a.sh, 0, -0.12, 0, 0.1, sm, 1.0, 1.4, 1.0); sph(a.el, 0, -0.18, 0, 0.085, sm, 1, 1.1, 1); }
    sph(body, 0, 1.12, 0.02, 0.24, sm, 1.0, 0.75, 0.82); sph(body, 0, 1.36, 0, 0.25, sm, 1.0, 0.7, 0.8);
    body.children.forEach((m) => { if (m.isMesh && m.material.color && m.material.color.getHex() === 0x2a2a2a) m.visible = false; });
  }
  root.scale.setScalar(look.scale);
  const outlineM = new THREE.MeshBasicMaterial({ color: 0x1a1218, side: THREE.BackSide });
  const toOutline = [];
  root.traverse((m) => { if (m.isMesh) { m.userData.character = true; if (m.castShadow && !m.material.transparent && m.material.side !== THREE.DoubleSide) toOutline.push(m); } });
  if (look.outline) for (const m of toOutline) {
    m.geometry.computeBoundingSphere(); const r = m.geometry.boundingSphere.radius * Math.max(m.scale.x, m.scale.y, m.scale.z);
    if (r < 0.02) continue;
    const o = new THREE.Mesh(m.geometry, outlineM); o.scale.setScalar(1 + 0.011 / r); o.position.copy(m.geometry.boundingSphere.center).multiplyScalar(-0.011 / r); m.add(o);
  }
  let phase = 0, blinkT = 2 + Math.random() * 3, waving = false, talking = 0, ampS = 0, lean = 0, lastYaw = 0;
  const api = {
    root, head,
    animate(dt, speed) {
      const k = 1 - Math.exp(-dt * 11), kk = 1 - Math.exp(-dt * 5);
      ampS += (Math.min(1, speed / 3) - ampS) * kk; const amp = ampS;
      phase += dt * (2.6 + speed * 2.3);
      const s1 = Math.sin(phase), c1 = Math.cos(phase);
      const to = (o, ax, v) => { o.rotation[ax] += (v - o.rotation[ax]) * k; };
      to(legs[0].hip, "x", -s1 * 0.7 * amp); to(legs[1].hip, "x", s1 * 0.7 * amp);
      to(legs[0].knee, "x", (Math.max(0, Math.sin(phase + 1.1)) * 1.15 + 0.05) * amp); to(legs[1].knee, "x", (Math.max(0, -Math.sin(phase + 1.1)) * 1.15 + 0.05) * amp);
      to(arms[0].sh, "x", s1 * 0.55 * amp); to(arms[0].el, "x", -0.2 - (0.25 + Math.max(0, s1) * 0.45) * amp); to(arms[0].sh, "z", -0.1 - 0.05 * amp);
      if (!waving && talking < 0.05) { to(arms[1].sh, "x", -s1 * 0.55 * amp); to(arms[1].el, "x", -0.2 - (0.25 + Math.max(0, -s1) * 0.45) * amp); to(arms[1].sh, "z", 0.1 + 0.05 * amp); }
      const idle = speed < 0.1, t = performance.now() / 1000;
      // peso che oscilla, bacino che ruota, busto inclinato in avanti e nelle curve
      const turnRate = (root.rotation.y - lastYaw) / Math.max(dt, 1e-3); lastYaw = root.rotation.y;
      lean += (Math.max(-0.25, Math.min(0.25, -turnRate * 0.06 * amp)) - lean) * kk;
      body.position.y += ((Math.abs(c1) * 0.045 - 0.02) * amp + (idle ? Math.sin(t * 1.6) * 0.006 : 0) - body.position.y) * k;
      body.position.x += (s1 * 0.025 * amp - body.position.x) * k;
      to(body, "y", s1 * 0.09 * amp); to(body, "x", 0.08 * amp + (idle ? Math.sin(t * 1.6) * 0.01 : 0)); to(body, "z", lean + (idle ? Math.sin(t * 0.5) * 0.02 : c1 * 0.025 * amp));
      to(head, "y", idle ? Math.sin(t * 0.6) * 0.2 : -s1 * 0.06 * amp); to(head, "z", -lean * 0.5);
      torso.scale.y = 1 + (idle ? Math.sin(t * 1.6) * 0.01 : 0);
      blinkT -= dt; const closed = blinkT < 0.13; for (const l of eyes) { l.scale.y = closed ? 0.95 : 0.22; l.position.y = closed ? 0.0 : 0.03; } if (blinkT < 0) blinkT = 2.5 + Math.random() * 3;
      // respiro e peso che si sposta quando è fermo
      // mentre parla: bocca che si muove, piccoli cenni della testa e gesti con le mani
      talking = Math.max(0, talking - dt * 3);
      mouth.scale.y = 0.15 + talking * (0.6 + Math.abs(Math.sin(t * 17)) * 1.3);
      if (talking > 0.05) { head.rotation.x = Math.sin(t * 5) * 0.05 * talking; if (!waving) { arms[1].sh.rotation.x = -0.5 - Math.sin(t * 3) * 0.25; arms[1].el.rotation.x = -1.1 + Math.sin(t * 4.3) * 0.25; arms[1].sh.rotation.z = 0.2; arms[0].el.rotation.x = -0.5 - Math.sin(t * 2.7) * 0.2; } }
      else head.rotation.x = 0;
    },
    wave(t) { waving = true; arms[1].sh.rotation.x = 0; arms[1].sh.rotation.z = 2.5 + Math.sin(t * 9) * 0.25; arms[1].el.rotation.x = -0.35; },
    rest() { waving = false; },
    lookAt(dx, dy) { head.rotation.y += (Math.max(-0.6, Math.min(0.6, dx)) - head.rotation.y) * 0.1; head.rotation.x += (Math.max(-0.3, Math.min(0.3, dy)) - head.rotation.x) * 0.1; },
    talk() { talking = 1; },
  };
  return api;
}

// etichetta con nome sopra la testa
export function nameTag(text, sub = "") {
  const tex = canvasTex("tag" + text + sub, 512, 160, (g, w, h) => {
    g.fillStyle = "rgba(20,14,22,.82)"; g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 40); g.fill();
    g.fillStyle = "#f0559a"; g.font = "800 58px 'Baloo 2', Inter, sans-serif"; g.textAlign = "center"; g.fillText(text, w / 2, 76);
    g.fillStyle = "#e6dce2"; g.font = "600 34px Inter, sans-serif"; g.fillText(sub, w / 2, 124);
  });
  // dimensione fissa sullo schermo (non diventa enorme da vicino)
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, sizeAttenuation: false, transparent: true }));
  sp.scale.set(0.15, 0.047, 1); sp.renderOrder = 10; return sp;
}

// ---------- player ----------
export const input = { lastLook: 0, keys: new Set(), yaw: Math.PI, pitch: 0.18, sens: 1, invertY: false, locked: false, touch: { x: 0, y: 0 }, enabled: true };
export const player = { pos: new THREE.Vector2(0, 0), facing: Math.PI, speed: 0, model: null, radius: 0.3, y: 0 };

export function spawnPlayer(x, z, facing, factory = null) {
  player.model = factory ? factory({ hazmat: true, shirt: 0xd8b52c, pants: 0xd8b52c }) : makeHuman({ hazmat: true, shirt: 0xe9b520, pants: 0xe9b520, shoes: 0x1e1e20, sole: 0x111111, gloves: 0x1c1c1e, backpack: true, logo: false });
  world.scene.add(player.model.root);
  player.pos.set(x, z); player.y = heightAt(x, z); camY = player.y; turnVel = 0; player.facing = facing; input.yaw = facing + Math.PI; input.pitch = 0.18; player.speed = 0;
  camDist = 3.4; camPos.set(0, 0, 0); camInit = false;
}

function collide(p) {
  const r = player.radius, b = world.bounds;
  if (b) { p.x = Math.max(b.x0 + r * 0.4, Math.min(b.x1 - r * 0.4, p.x)); p.y = Math.max(b.z0 + r * 0.4, Math.min(b.z1 - r * 0.4, p.y)); }
  for (const c of world.colliders) {
    const cx = Math.max(c.x0, Math.min(c.x1, p.x)), cz = Math.max(c.z0, Math.min(c.z1, p.y));
    const dx = p.x - cx, dz = p.y - cz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.y += dz * k; }
      else { // dentro il rettangolo: esci dal lato più vicino
        const opts = [[c.x0 - r - p.x, 0], [c.x1 + r - p.x, 0], [0, c.z0 - r - p.y], [0, c.z1 + r - p.y]];
        opts.sort((a, b2) => Math.abs(a[0] + a[1]) - Math.abs(b2[0] + b2[1])); p.x += opts[0][0]; p.y += opts[0][1];
      }
    }
  }
}

export const camFocus = { target: null, last: null, t: 0 };
const camPos = new THREE.Vector3(); let camDist = 3.0, camInit = false, camY = 0, turnVel = 0;
const ray = new THREE.Raycaster();
export function updatePlayer(dt) {
  const k = input.keys;
  // comandi semplici: W/S avanti e indietro, A/D girano il personaggio; la camera la segue da sola
  let turn = 0, fwd = 0;
  if (input.enabled) {
    if (k.has("KeyW") || k.has("ArrowUp")) fwd += 1;
    if (k.has("KeyS") || k.has("ArrowDown")) fwd -= 1;
    if (k.has("KeyA") || k.has("ArrowLeft")) turn += 1;
    if (k.has("KeyD") || k.has("ArrowRight")) turn -= 1;
    turn -= input.touch.x; fwd += input.touch.y;
  }
  turn = Math.max(-1, Math.min(1, turn)); fwd = Math.max(-1, Math.min(1, fwd));
  const run = k.has("ShiftLeft") || k.has("ShiftRight");
  const moving = Math.abs(fwd) > 0.05;
  const target = moving ? (fwd < 0 ? 1.6 : run ? 4.6 : 2.6) * Math.abs(fwd) : Math.abs(turn) > 0.05 ? 0.6 : 0;
  player.speed += (target - player.speed) * Math.min(1, dt * 10);
  // rotazione morbida (accelera e frena), più lenta: niente scatti che danno nausea
  turnVel += (turn * (moving ? 1.7 : 2.0) - turnVel) * Math.min(1, dt * 6);
  player.facing += turnVel * dt;
  if (moving) {
    const dir = Math.sign(fwd);
    player.pos.x += Math.sin(player.facing) * player.speed * dt * dir;
    player.pos.y += Math.cos(player.facing) * player.speed * dt * dir;
  }
  // la visuale resta agganciata dietro al personaggio (il mouse la sposta solo per un attimo)
  if (performance.now() - input.lastLook > 1200) {
    let d = player.facing + Math.PI - input.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    input.yaw += d * Math.min(1, dt * 6);
    input.pitch += (0.14 - input.pitch) * Math.min(1, dt * 2);
  }
  collide(player.pos);
  const m = player.model;
  player.y += (heightAt(player.pos.x, player.pos.y) - player.y) * Math.min(1, dt * 14);
  m.root.position.set(player.pos.x, player.y, player.pos.y); m.root.rotation.y = player.facing;
  m.animate(dt, player.speed);
  // camera in terza persona stabile: altezza smorzata (sulle scale non sobbalza), distanza che si accorcia contro i muri
  camY += (player.y - camY) * Math.min(1, dt * 4);
  const head = new THREE.Vector3(player.pos.x, 1.5 + camY, player.pos.y);
  const MAXD = 3.0, cp = Math.cos(input.pitch);
  const dirV = new THREE.Vector3(Math.sin(input.yaw) * cp, Math.sin(input.pitch), Math.cos(input.yaw) * cp);
  ray.set(head, dirV); ray.far = MAXD + 0.3;
  const hits = ray.intersectObjects(world.camColliders, false);
  const dist = hits.length ? Math.max(0.5, Math.min(MAXD, hits[0].distance - 0.3)) : MAXD;
  camDist += (dist - camDist) * Math.min(1, dt * (dist < camDist ? 20 : 2.5));
  camPos.copy(head).addScaledVector(dirV, camDist); camInit = true;
  camera.position.copy(camPos);
  camera.lookAt(head.x, head.y + 0.1, head.z);
  // durante i dialoghi con i prof la visuale passa in prima persona e guarda il prof in faccia
  const want = camFocus.target ? 1 : 0;
  camFocus.t += (want - camFocus.t) * Math.min(1, dt * 5);
  if (camFocus.t > 0.001) {
    const tg = camFocus.target || camFocus.last;
    if (camFocus.target) { camFocus.last = camFocus.target.clone(); let d = Math.atan2(tg.x - player.pos.x, tg.z - player.pos.y) - player.facing; d = Math.atan2(Math.sin(d), Math.cos(d)); player.facing += d * Math.min(1, dt * 6); }
    const eye = new THREE.Vector3(player.pos.x + Math.sin(player.facing) * 0.15, 1.68 + camY, player.pos.y + Math.cos(player.facing) * 0.15);
    const qThird = camera.quaternion.clone();
    camera.position.copy(eye); camera.lookAt(tg); const qFirst = camera.quaternion.clone();
    const e = camFocus.t * camFocus.t * (3 - 2 * camFocus.t);
    camera.position.lerpVectors(camPos, eye, e); camera.quaternion.slerpQuaternions(qThird, qFirst, e);
  }
  // il personaggio sparisce se la camera è troppo vicina
  m.root.visible = camDist > 0.9 && camFocus.t < 0.6;
}

export function look(dx, dy) {
  input.lastLook = performance.now();
  input.yaw -= dx * 0.0026 * input.sens;
  input.pitch += dy * 0.0022 * input.sens * (input.invertY ? -1 : 1);
  input.pitch = Math.max(-0.35, Math.min(1.1, input.pitch));
}

// ---------- interazione ----------
// oggetti interagibili: il più vicino davanti al personaggio entro 2.1 m
export function addInteractable(obj, opts) {
  const it = Object.assign({ obj, label: "Interagisci", range: 2.1, when: () => true, hl: [] }, opts);
  // materiali unici per poterli evidenziare
  obj.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial) { const src = o.material, nm = src.clone(); nm.onBeforeCompile = src.onBeforeCompile; nm.customProgramCacheKey = src.customProgramCacheKey; o.material = nm; it.hl.push(nm); } });
  world.interactables.push(it);
  return it;
}
const tmpV = new THREE.Vector3();
export function findInteractable() {
  let best = null, bestScore = Infinity;
  const fx = Math.sin(player.facing), fz = Math.cos(player.facing);
  for (const it of world.interactables) {
    if (it.removed || !it.when()) continue;
    it.obj.getWorldPosition(tmpV);
    const p = it.point ? it.point : tmpV;
    const dx = p.x - player.pos.x, dz = p.z - player.pos.y, d = Math.hypot(dx, dz);
    if (d > it.range) continue;
    const facing = d < 0.6 ? 1 : (dx * fx + dz * fz) / d;
    if (facing < 0.15) continue;
    const score = d - facing * 0.8;
    if (score < bestScore) { bestScore = score; best = it; }
  }
  return best;
}
let lastHl = null;
export function highlight(it, t) {
  if (lastHl && lastHl !== it) for (const m of lastHl.hl) m.emissive.setHex(0x000000);
  if (it) { const v = 0.25 + Math.sin(t * 6) * 0.12; for (const m of it.hl) { m.emissive.setRGB(v, v * 0.35, v * 0.6); } }
  lastHl = it;
}
export function removeInteractable(it) { it.removed = true; if (it.obj.parent) it.obj.parent.remove(it.obj); }

// freccia rosa che indica dove andare
export function beacon() {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: PAL.pink, transparent: true, opacity: 0.9, depthTest: false });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 16), m); cone.rotation.x = Math.PI; cone.renderOrder = 9; g.add(cone);
  world.scene.add(g); g.visible = false;
  return g;
}

// ---------- post-produzione: occlusione ambientale (GTAO) + bagliore delle luci + tone mapping ----------
export const gfx = { quality: "alta", composer: null, scene: null, fps: 60 };
function buildComposer() {
  const w = innerWidth, h = innerHeight, pr = renderer.getPixelRatio();
  const rt = new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType, samples: 4 });
  const c = new EffectComposer(renderer, rt); c.setPixelRatio(pr); c.setSize(w, h);
  c.addPass(new RenderPass(world.scene, camera));
  if (gfx.quality === "alta") {
    const ao = new GTAOPass(world.scene, camera, w, h);
    ao.output = GTAOPass.OUTPUT.Default; ao.blendIntensity = 1.0;
    ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    c.addPass(ao);
  }
  c.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.22, 0.4, 2.2));
  c.addPass(new OutputPass());
  c.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } }, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); } void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.299,0.587,0.114)); c.rgb = mix(vec3(l), c.rgb, 0.9); c.rgb = c.rgb * vec3(1.02, 1.0, 0.97); float v = smoothstep(0.95, 0.35, distance(vUv, vec2(0.5))); c.rgb *= mix(0.88, 1.0, v);  gl_FragColor = c; }" }));
  gfx.composer = c; gfx.scene = world.scene;
}
export function setQuality(q) { gfx.quality = q; if (gfx.composer) { gfx.composer.dispose?.(); gfx.composer = null; } }
addEventListener("resize", () => { if (gfx.composer) gfx.composer.setSize(innerWidth, innerHeight); });
// ---------- animazioni d'ambiente ----------
// schermi accesi: contenuto che scorre (codice, grafici, logo)
const scrCanvas = document.createElement("canvas"); scrCanvas.width = 256; scrCanvas.height = 144;
export const SCREEN_TEX = new THREE.CanvasTexture(scrCanvas); SCREEN_TEX.colorSpace = THREE.SRGBColorSpace;
let scrT = 0;
function drawScreen(t) {
  const g = scrCanvas.getContext("2d"), w = 256, h = 144;
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#0d2a4a"); gr.addColorStop(1, "#1d0f33"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.font = "600 9px monospace";
  for (let i = 0; i < 12; i++) { const y = ((i * 12 + t * 18) % (h + 12)) - 6; g.fillStyle = ["#7dff9b", "#89ddff", "#c792ea", "#ffcb6b"][i % 4]; g.fillText(["for i in range(3):", "  saluta('Othoca')", "pH = 7.0", "x = sensore.leggi()", "if x > 5: apri()", "print('Ciao!')"][i % 6], 8, y); }
  for (let i = 0; i < 6; i++) { const bh = 20 + Math.sin(t * 2 + i) * 15 + 15; g.fillStyle = "rgba(240,85,154,.8)"; g.fillRect(150 + i * 16, h - 14 - bh, 10, bh); }
  g.strokeStyle = "#4fc3f7"; g.lineWidth = 2; g.beginPath(); for (let x = 140; x < 250; x += 3) g.lineTo(x, 40 + Math.sin(x * 0.08 + t * 3) * 14); g.stroke();
  SCREEN_TEX.needsUpdate = true;
}
export function screenMat() { return new THREE.MeshStandardMaterial({ map: SCREEN_TEX, emissive: 0xffffff, emissiveMap: SCREEN_TEX, emissiveIntensity: 1.1, roughness: 0.25 }); }
// pulviscolo che fluttua nella luce
function addDust(W, D, H) {
  const n = Math.min(900, Math.round(W * D * 3)), pos = new Float32Array(n * 3), sp = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * W; pos[i * 3 + 1] = Math.random() * H; pos[i * 3 + 2] = (Math.random() - 0.5) * D; sp[i] = Math.random(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dot = canvasTex("dustdot", 32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,250,235,1)"); gr.addColorStop(1, "rgba(255,250,235,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.035, map: dot, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  world.scene.add(pts);
  world.animated.push((dt) => { const t = performance.now() / 1000; for (let i = 0; i < n; i++) { pos[i * 3 + 1] += dt * (0.03 + sp[i] * 0.05); pos[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.04; if (pos[i * 3 + 1] > H) pos[i * 3 + 1] = 0; } geo.attributes.position.needsUpdate = true; });
}
// coriandoli quando completi una sfida
export function confetti(x, y, z, n = 90) {
  const cols = [0xf0559a, 0xffd166, 0x4fc3f7, 0x81c784, 0xffffff];
  const parts = [];
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.08), new THREE.MeshBasicMaterial({ color: cols[i % 5], side: THREE.DoubleSide })); m.position.set(x, y, z); world.scene.add(m); parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3), r: new THREE.Vector3(Math.random() * 8, Math.random() * 8, 0), life: 2.5 }); }
  const f = (dt) => { for (const p of parts) { if (p.life <= 0) continue; p.life -= dt; p.v.y -= 4 * dt; p.v.multiplyScalar(1 - dt * 1.2); p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += p.r.x * dt; p.m.rotation.y += p.r.y * dt; if (p.life <= 0 && p.m.parent) p.m.parent.remove(p.m); } };
  world.animated.push(f);
}
export function render() {
  scrT += 1 / 60; if (Math.floor(scrT * 12) !== Math.floor((scrT - 1 / 60) * 12)) drawScreen(scrT);
  if (M.window.map) M.window.map.offset.x += 0.00004;
  if (gfx.quality === "bassa") { renderer.render(world.scene, camera); return; }
  if (!gfx.composer || gfx.scene !== world.scene) { if (gfx.composer) gfx.composer.dispose?.(); buildComposer(); }
  gfx.composer.render();
}
