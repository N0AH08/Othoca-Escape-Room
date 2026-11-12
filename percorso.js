/*
 * PROTOTIPO: CAMMINATA CONTINUA NELLE FOTO 360°
 * ----------------------------------------------
 * Ogni foto 360° viene "proiettata" su un pavimento piatto e su una parete cilindrica attorno al
 * punto in cui è stata scattata. Così la telecamera può muoversi davvero nello spazio, dietro al robot.
 * Tra due punti di scatto le due foto si fondono gradualmente: nessuno stacco.
 * Le posizioni dei punti di scatto sono ricostruite dai collegamenti del tour Othoca360.
 * Enigmi, timer, frammenti e Othy sono quelli di game.js (modalità 3D).
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const G = window.OthocaGame;
const H = 1.5;          // altezza della fotocamera del tour (m)
const WALL_R = 7;       // raggio della "parete" su cui si proietta la foto (m)
const ROBOT_H = 1.2;
const REVEAL = 2.6;     // distanza a cui compaiono gli indizi (m)
const SHOW_NEAR = 3.4;  // oltre questa distanza l'oggetto non si vede proprio
const AUTO_OPEN = 1.3;  // così vicino l'enigma si apre da solo (solo la prima volta)
const FADE_TIME = 0.45; // durata della dissolvenza tra una foto e la successiva (s)
const SWITCH_GAP = 0.5; // la foto cambia solo quando l'altra è più vicina di almeno 0,5 m (niente sfarfallio)
const view = { cur: null, prev: null, fade: 1 };

// ---------- Ricostruzione della mappa dai collegamenti ----------
// Facoltativo (stanza singola, es. laboratorio.html):
//   room: { left, right, front, back } = distanze in metri dal punto di scatto alle pareti (stanza rettangolare)
//   walk: [[x0, x1, f0, f1], …] = rettangoli in cui il robot può camminare (al posto del cerchio di 2,6 m)
//   blocks: [[x0, x1, f0, f1, altezza, (base)], …] = mobili (tavoli, banchi): il robot non ci passa e la foto
//           viene proiettata anche sopra di loro, così da un altro punto non si "spalmano" sul pavimento;
//           base (facoltativa) = altezza del bordo inferiore, per i tavoli aperti sotto si proietta solo il piano
//   roomYaw = rotazione della stanza (rad): la parete "front" è verso questo yaw (per corridoi storti rispetto alla foto)
//   (x = metri a destra del punto di scatto, f = metri in avanti, verso yaw 0)
//   negli oggetti: dist = distanza orizzontale dell'oggetto (m), stand = [destra, avanti] dove si ferma il robot
const roomShape = (s) => s.room
  ? new THREE.Vector3(s.wall || WALL_R, (s.room.left + s.room.right) / 2, (s.room.front + s.room.back) / 2)
  : new THREE.Vector3(s.wall || WALL_R, s.box ? s.box[0] : 0, s.box ? s.box[1] : 0);
// centro della stanza rispetto al punto di scatto (coordinate locali della foto: x = destra, z = indietro)
const roomOffset = (s) => s.room ? new THREE.Vector2((s.room.right - s.room.left) / 2, (s.room.back - s.room.front) / 2) : new THREE.Vector2(0, 0);
const MAX_BLOCKS = 16;
const node = Object.fromEntries(GAME.scenes.map((s) => [s.id, { ...s, pos: null, rot: 0, tex: null, texHi: null,
  shape: roomShape(s), offset: roomOffset(s), roomYaw: s.roomYaw || 0, blocks: (s.blocks || []).slice(0, MAX_BLOCKS) }]));
const edges = []; // { A (lato aperto), B, lock, lockedSay }
{
  const first = node[GAME.scenes[0].id];
  first.pos = new THREE.Vector2(0, 0);
  const queue = [first];
  while (queue.length) {
    const A = queue.shift();
    for (const l of A.links) {
      const B = node[l.target];
      const back = B && B.links.find((x) => x.target === A.id);
      if (!B || !back) continue;
      if (!edges.some((e) => (e.A === A && e.B === B) || (e.A === B && e.B === A))) {
        if (back.lock && !l.lock) edges.push({ A: B, B: A, lock: back.lock, lockedSay: back.lockedSay });
        else edges.push({ A, B, lock: l.lock, lockedSay: l.lockedSay });
      }
      if (B.pos) continue;
      const wy = l.yaw + A.rot, d = l.dist || back.dist || 5;
      B.pos = new THREE.Vector2(A.pos.x + Math.sin(wy) * d, A.pos.y - Math.cos(wy) * d);
      B.rot = wy + Math.PI - back.yaw; // la foto B viene ruotata perché "guardi indietro" verso A
      queue.push(B);
    }
  }
}
const nodes = Object.values(node).filter((n) => n.pos);
const isOpen = (e) => !e.lock || G.isSolved(e.lock);

// Punti di scatto raggiungibili: quelli dietro una porta chiusa non lo sono finché non si apre
function reachable() {
  const seen = new Set([nodes[0]]), q = [nodes[0]];
  while (q.length) {
    const n = q.shift();
    for (const e of edges) {
      const other = e.A === n ? e.B : e.B === n ? e.A : null;
      if (!other || seen.has(other) || !isOpen(e)) continue;
      seen.add(other); q.push(other);
    }
  }
  return seen;
}

// ---------- Zone in cui si può camminare ----------
let reach = new Set(nodes);
// punto del mondo -> coordinate della foto del punto di scatto n (x = destra, f = avanti)
function toPhoto(n, p) {
  const dx = p.x - n.pos.x, dz = p.y - n.pos.y, cr = Math.cos(n.rot), sr = Math.sin(n.rot);
  return { x: dx * cr + dz * sr, f: -(dz * cr - dx * sr) };
}
function fromPhoto(n, x, f) {
  const cr = Math.cos(n.rot), sr = Math.sin(n.rot), lz = -f;
  return new THREE.Vector2(n.pos.x + x * cr - lz * sr, n.pos.y + lz * cr + x * sr);
}
function inside(p) {
  for (const n of reach) {
    if (n.walk) {
      const q = toPhoto(n, p), M = 0.28; // M = ingombro del robot
      if (n.walk.some(([x0, x1, f0, f1]) => q.x > x0 && q.x < x1 && q.f > f0 && q.f < f1) &&
          !n.blocks.some(([x0, x1, f0, f1]) => q.x > x0 - M && q.x < x1 + M && q.f > f0 - M && q.f < f1 + M)) return true;
    }
    else if (p.distanceTo(n.pos) < 2.6) return true;
  }
  for (const e of edges) {
    if (!reach.has(e.A) && !reach.has(e.B)) continue;
    const ab = e.B.pos.clone().sub(e.A.pos), t = Math.max(0, Math.min(1, p.clone().sub(e.A.pos).dot(ab) / ab.lengthSq()));
    if (!isOpen(e) && t > 0.42) continue; // porta chiusa: si arriva solo fino a poco prima di metà strada
    if (p.distanceTo(e.A.pos.clone().add(ab.multiplyScalar(t))) < 1.1) return true;
  }
  return false;
}

// ---------- Renderer ----------
const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 200);

const panoMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: {
    tA: { value: null }, tB: { value: null },
    cA: { value: new THREE.Vector2() }, cB: { value: new THREE.Vector2() },
    rA: { value: 0 }, rB: { value: 0 }, wB: { value: 0 },
    sA: { value: new THREE.Vector3(WALL_R, 0, 0) }, sB: { value: new THREE.Vector3(WALL_R, 0, 0) }, H: { value: H },
    oA: { value: new THREE.Vector2() }, oB: { value: new THREE.Vector2() }, yA: { value: 0 }, yB: { value: 0 },
    bN: { value: 0 }, bBox: { value: Array.from({ length: MAX_BLOCKS }, () => new THREE.Vector4()) }, bH: { value: new Array(MAX_BLOCKS).fill(0) }, bL: { value: new Array(MAX_BLOCKS).fill(0) },
    camPos: { value: new THREE.Vector3() }, invVP: { value: new THREE.Matrix4() }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tA, tB; uniform vec2 cA, cB; uniform float rA, rB, wB, H;
    uniform vec3 sA, sB, camPos; uniform vec2 oA, oB; uniform float yA, yB; uniform mat4 invVP;
    // mobili della foto A (coordinate locali: x0, z0, x1, z1 e altezza)
    uniform int bN; uniform vec4 bBox[${MAX_BLOCKS}]; uniform float bH[${MAX_BLOCKS}], bL[${MAX_BLOCKS}];
    // sh = (raggio parete, mezza larghezza box, mezza profondità box): box se sh.y > 0, altrimenti cilindro
    // off = centro della stanza rispetto al punto di scatto (0 = stanza centrata, come prima)
    vec3 pano(sampler2D t, vec2 c, float rot, vec3 sh, vec2 off, float ry, bool blocks, vec3 ro, vec3 rd) {
      float tF = rd.y < -1e-4 ? ro.y / -rd.y : 1e9;
      float cr = cos(rot), sr = sin(rot);
      vec2 o = ro.xz - c, d = rd.xz;
      float tC = 1e9;
      if (sh.y > 0.0) {
        float cq = cos(rot + ry), sq = sin(rot + ry); // la stanza può essere ruotata rispetto alla foto
        vec2 ol = vec2(o.x * cq + o.y * sq, o.y * cq - o.x * sq) - off, dl = vec2(d.x * cq + d.y * sq, d.y * cq - d.x * sq);
        float tx = abs(dl.x) > 1e-6 ? (sign(dl.x) * sh.y - ol.x) / dl.x : 1e9;
        float tz = abs(dl.y) > 1e-6 ? (sign(dl.y) * sh.z - ol.y) / dl.y : 1e9;
        tC = min(tx, tz); if (tC < 0.05) tC = 1e9;
      } else {
        float a = dot(d, d), b = dot(o, d), cc = dot(o, o) - sh.x * sh.x, disc = b * b - a * cc;
        tC = (disc > 0.0 && a > 1e-6) ? (-b + sqrt(disc)) / a : 1e9;
      }
      float tt = min(tF, tC);
      if (blocks) {
        vec2 bo = vec2(o.x * cr + o.y * sr, o.y * cr - o.x * sr), bd = vec2(d.x * cr + d.y * sr, d.y * cr - d.x * sr);
        vec3 O = vec3(bo.x, ro.y, bo.y), Dr = vec3(bd.x, rd.y, bd.y);
        vec3 inv = 1.0 / (abs(Dr) + 1e-6) * sign(Dr + 1e-9);
        for (int i = 0; i < ${MAX_BLOCKS}; i++) {
          if (i >= bN) break;
          vec3 lo = vec3(bBox[i].x, bL[i], bBox[i].y), hi = vec3(bBox[i].z, bH[i], bBox[i].w);
          vec3 t0 = (lo - O) * inv, t1 = (hi - O) * inv;
          vec3 tmn = min(t0, t1), tmx = max(t0, t1);
          float te = max(max(tmn.x, tmn.y), tmn.z), tx = min(min(tmx.x, tmx.y), tmx.z);
          if (te < tx && te > 0.02) tt = min(tt, te);
        }
      }
      if (tt > 1e8) tt = 60.0;
      vec3 w = normalize(ro + rd * tt - vec3(c.x, H, c.y));
      vec3 D = vec3(w.x * cr + w.z * sr, w.y, -(w.z * cr - w.x * sr));
      vec3 A = abs(D); vec2 uv; vec2 cell;
      if (A.z >= A.x && A.z >= A.y) { if (D.z > 0.0) { uv = vec2(D.x, -D.y) / A.z; cell = vec2(0.0, 0.0); } else { uv = vec2(-D.x, -D.y) / A.z; cell = vec2(2.0, 0.0); } }
      else if (A.x >= A.y) { if (D.x > 0.0) { uv = vec2(-D.z, -D.y) / A.x; cell = vec2(1.0, 0.0); } else { uv = vec2(D.z, -D.y) / A.x; cell = vec2(0.0, 1.0); } }
      else { if (D.y > 0.0) { uv = vec2(D.x, D.z) / A.y; cell = vec2(1.0, 1.0); } else { uv = vec2(D.x, -D.z) / A.y; cell = vec2(2.0, 1.0); } }
      uv = clamp((uv + 1.0) * 0.5, 0.0015, 0.9985);
      return texture2D(t, vec2((cell.x + uv.x) / 3.0, 1.0 - (cell.y + uv.y) / 2.0)).rgb;
    }
    void main() {
      vec4 p = invVP * vec4(vUv * 2.0 - 1.0, 1.0, 1.0); p /= p.w;
      vec3 rd = normalize(p.xyz - camPos);
      vec3 col = pano(tA, cA, rA, sA, oA, yA, bN > 0, camPos, rd);
      if (wB > 0.001) col = mix(col, pano(tB, cB, rB, sB, oB, yB, false, camPos, rd), wB);
      // colori: un po' più di contrasto e saturazione, toni caldi, vignettatura
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, 1.12);
      col = (col - 0.5) * 1.06 + 0.5;
      col *= vec3(1.03, 1.0, 0.96);
      vec2 q = vUv - 0.5; col *= 1.0 - dot(q, q) * 0.55;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`
});
const bgScene = new THREE.Scene(), bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), panoMat));

const scene = new THREE.Scene();
const hemi = new THREE.HemisphereLight(0xfff6ea, 0x6b5d50, 2.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(1.5, 5, 2); scene.add(sun);
const shadowTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, "rgba(0,0,0,.6)"); grd.addColorStop(0.55, "rgba(0,0,0,.26)"); grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
const marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 40), new THREE.MeshBasicMaterial({ color: 0xffb35c, transparent: true, opacity: 0, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; scene.add(marker);

// ---------- Foto ----------
const FACES = [["f", 0, 0], ["r", 1, 0], ["b", 2, 0], ["l", 0, 1], ["u", 1, 1], ["d", 2, 1]];
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
// level 2 = facce da 1024 px (sempre caricate), level 3 = facce da 2048 px (solo per le foto vicine)
async function buildAtlas(n, level) {
  const tilesPer = level === 3 ? 4 : 2, S = 512 * tilesPer, c = document.createElement("canvas"); c.width = S * 3; c.height = S * 2;
  const g = c.getContext("2d"), idx = [...Array(tilesPer).keys()];
  await Promise.all(FACES.flatMap(([f, cx, cy]) => idx.flatMap((y) => idx.map(async (x) => {
    const img = await loadImg(`tiles/${n.id}/${level}/${f}/${y}/${x}.jpg`);
    g.drawImage(img, cx * S + x * 512, cy * S + y * 512, 512, 512);
  }))));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
async function loadPano(n) {
  n.tex = await buildAtlas(n, 2);
  // luminosità media della foto: serve a illuminare il robot come l'ambiente
  try {
    const c = document.createElement("canvas"); c.width = 12; c.height = 8; const g = c.getContext("2d");
    g.drawImage(n.tex.image, 0, 0, 12, 8); const d = g.getImageData(0, 0, 12, 8).data; let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    n.lum = sum / (d.length / 4);
  } catch (e) { n.lum = 0.5; }
}
// foto in alta risoluzione solo per le due più vicine alla telecamera
let hiBusy = false;
function wantHi(list) {
  for (const n of nodes) if (n.texHi && !list.includes(n)) { n.texHi.dispose(); n.texHi = null; }
  const todo = list.find((n) => !n.texHi && n.tex);
  if (!todo || hiBusy) return;
  hiBusy = true;
  buildAtlas(todo, 3).then((t) => { todo.texHi = t; }).catch(() => {}).finally(() => { hiBusy = false; });
}

// ---------- Indizi e porte chiuse: segnaposto agganciati alla foto ----------
// Punto 3D dell'oggetto: stessa proiezione della foto (pavimento o parete), così resta sopra l'oggetto
function itemWorld(n, it) {
  const wy = it.yaw + n.rot;
  const dir = new THREE.Vector3(Math.sin(wy) * Math.cos(it.pitch), -Math.sin(it.pitch), -Math.cos(wy) * Math.cos(it.pitch));
  const cr = Math.cos(n.rot + n.roomYaw), sr = Math.sin(n.rot + n.roomYaw);
  const lx = dir.x * cr + dir.z * sr, lz = dir.z * cr - dir.x * sr;
  const ox = n.offset.x, oz = n.offset.y;
  let t = n.shape.y > 0 ? Math.min(Math.abs(lx) > 1e-6 ? (n.shape.y + Math.sign(lx) * ox) / Math.abs(lx) : 1e9, Math.abs(lz) > 1e-6 ? (n.shape.z + Math.sign(lz) * oz) / Math.abs(lz) : 1e9)
                        : n.shape.x / Math.hypot(dir.x, dir.z);
  if (dir.y < -1e-3) t = Math.min(t, H / -dir.y);
  if (it.dist) t = it.dist / Math.hypot(dir.x, dir.z); // distanza nota dell'oggetto (es. computer su un tavolo)
  return new THREE.Vector3(n.pos.x, H, n.pos.y).add(dir.multiplyScalar(t));
}
const layer = document.getElementById("markers");
const markers = [];
for (const n of nodes) for (const it of n.items || []) {
  const p3 = itemWorld(n, it);
  const toItem = new THREE.Vector2(p3.x - n.pos.x, p3.z - n.pos.y);
  const stand = it.stand ? fromPhoto(n, it.stand[0], it.stand[1])
    : n.pos.clone().add(toItem.clone().normalize().multiplyScalar(Math.max(0.8, Math.min(toItem.length() - 0.8, 2.2))));
  const el = document.createElement("button");
  el.className = "hs item hidden";
  el.innerHTML = `<span class="dot">${it.icon || "✨"}</span><span class="lbl"></span>`;
  el.querySelector(".lbl").textContent = it.label;
  layer.appendChild(el);
  const m = { el, p3, stand, it, node: n };
  el.addEventListener("click", (e) => {
    e.stopPropagation(); if (blocked()) return;
    if (m === useTarget) useNearest();          // l'enigma si apre solo da vicino
    else G.say("Avvicinati di più per esaminarlo!", "think");
  });
  markers.push(m);
}
for (const e of edges.filter((x) => x.lock)) {
  const p = e.A.pos.clone().lerp(e.B.pos, 0.48);
  const el = document.createElement("button");
  el.className = "hs link locked";
  el.innerHTML = `<span class="dot"></span><span class="lbl">Chiuso</span>`;
  layer.appendChild(el);
  el.addEventListener("click", (ev) => { ev.stopPropagation(); lockedFeedback(e, true); });
  markers.push({ el, p3: new THREE.Vector3(p.x, 2.55, p.y), edge: e });
}
// ---------- Effetti nel mondo 3D ----------
const PINK = new THREE.Color(0xf25a8e), GOLD = new THREE.Color(0xf2c063);
function canvasTex(draw, w = 128, h = 128) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
// segno di Tanit (usato su barriere e anelli)
function drawTanit(g, w, h, color) {
  g.fillStyle = color; const cx = w / 2, u = w / 128;
  g.beginPath(); g.arc(cx, 30 * u, 12 * u, 0, Math.PI * 2); g.fill();
  g.fillRect(cx - 36 * u, 48 * u, 72 * u, 9 * u); g.fillRect(cx - 36 * u, 36 * u, 8 * u, 21 * u); g.fillRect(cx + 28 * u, 36 * u, 8 * u, 21 * u);
  g.beginPath(); g.moveTo(cx - 12 * u, 57 * u); g.lineTo(cx + 12 * u, 57 * u); g.lineTo(cx + 26 * u, 104 * u); g.lineTo(cx - 26 * u, 104 * u); g.closePath(); g.fill();
}
const tanitTex = canvasTex((g, w, h) => drawTanit(g, w, h, "#ffffff"));

// a) scia di frecce luminose sul pavimento verso l'obiettivo
const chevronTex = canvasTex((g, w, h) => {
  const grd = g.createLinearGradient(0, h, 0, 0); grd.addColorStop(0, "rgba(255,255,255,0)"); grd.addColorStop(1, "rgba(255,255,255,1)");
  // alone morbido + freccia piena
  const halo = g.createRadialGradient(64, 70, 4, 64, 70, 62); halo.addColorStop(0, "rgba(255,255,255,.55)"); halo.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = halo; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#fff"; g.lineWidth = 22; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(22, 94); g.lineTo(64, 42); g.lineTo(106, 94); g.stroke();
});
const trail = [];
for (let i = 0; i < 26; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshBasicMaterial({ map: chevronTex, color: new THREE.Color(0xff4f8f), transparent: true, opacity: 0, depthWrite: false }));
  m.rotation.order = "YXZ"; m.visible = false; scene.add(m); trail.push(m);
}
let trailPts = null;
function layTrail(points) { trailPts = points; }
function updateTrail(t, show) {
  if (!trailPts || !show) { trail.forEach((m) => (m.visible = false)); return; }
  const segs = []; let total = 0;
  for (let i = 1; i < trailPts.length; i++) { const a = trailPts[i - 1], b = trailPts[i], l = a.distanceTo(b); segs.push([a, b, l, total]); total += l; }
  trail.forEach((m, i) => {
    const d = 1.1 + i * 0.7;
    if (d > total - 0.4) { m.visible = false; return; }
    const sg = segs.find((x) => d >= x[3] && d <= x[3] + x[2]) || segs[segs.length - 1];
    const k = (d - sg[3]) / sg[2], p = sg[0].clone().lerp(sg[1], k);
    m.position.set(p.x, 0.03, p.y);
    m.rotation.set(-Math.PI / 2, 0, 0); m.rotation.y = Math.atan2(sg[1].x - sg[0].x, sg[1].y - sg[0].y) + Math.PI;
    const wave = 0.5 + 0.5 * Math.sin(t * 4 - i * 0.55);
    m.material.opacity = (0.45 + 0.5 * wave) * Math.min(1, (total - d) / 1.5);
    m.visible = true;
  });
}

// b) barriere luminose con il segno di Tanit sui passaggi chiusi (si dissolvono quando si aprono)
const barrierMat = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  uniforms: { time: { value: 0 }, prog: { value: 0 }, tex: { value: tanitTex }, c1: { value: PINK }, c2: { value: GOLD } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vUv; uniform float time, prog; uniform sampler2D tex; uniform vec3 c1, c2;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x) * smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
      float stripes = 0.5 + 0.5 * sin(vUv.y * 40.0 - time * 3.0);
      float grid = step(0.92, fract(vUv.x * 10.0)) + step(0.94, fract(vUv.y * 14.0 + time * 0.2));
      vec2 tu = (vUv - vec2(0.5, 0.5)) * vec2(2.6, 2.2) + 0.5;
      float sym = (tu.x > 0.0 && tu.x < 1.0 && tu.y > 0.0 && tu.y < 1.0) ? texture2D(tex, tu).a : 0.0;
      if (h(floor(vUv * vec2(60.0, 80.0))) < prog) discard;
      float a = (0.22 + 0.22 * stripes + 0.45 * grid) * edge + sym * (0.9 + 0.1 * sin(time * 2.5));
      vec3 col = mix(c1, c2, sym);
      gl_FragColor = vec4(col * a * (1.0 - prog * 0.6), a);
    }`
});
const barriers = edges.filter((e) => e.lock).map((e) => {
  const p = e.A.pos.clone().lerp(e.B.pos, 0.45), dir = e.B.pos.clone().sub(e.A.pos);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.4), barrierMat());
  mesh.position.set(p.x, 1.2, p.y); mesh.rotation.y = Math.atan2(dir.x, dir.y);
  scene.add(mesh);
  return { e, mesh, prog: 0 };
});
function updateBarriers(t, dt) {
  for (const b of barriers) {
    b.mesh.material.uniforms.time.value = t;
    if (isOpen(b.e)) { b.prog = Math.min(1, b.prog + dt * 0.9); }
    b.mesh.material.uniforms.prog.value = b.prog;
    // si vede solo da vicino e dal lato raggiungibile (le foto non hanno profondità: da lontano "bucherebbe" i muri)
    const d = pos.distanceTo(new THREE.Vector2(b.mesh.position.x, b.mesh.position.z));
    b.mesh.visible = b.prog < 1 && reach.has(b.e.A) && d < 7;
  }
}

// c) anello di luce sul pavimento davanti agli indizi trovati e non ancora risolti
const ringTex = canvasTex((g, w, h) => {
  const grd = g.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w / 2);
  grd.addColorStop(0, "rgba(255,255,255,0)"); grd.addColorStop(0.55, "rgba(255,255,255,1)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
});
const beamTex = canvasTex((g, w, h) => { const grd = g.createLinearGradient(0, h, 0, 0); grd.addColorStop(0, "rgba(255,255,255,.9)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, w, h); }, 8, 128);
for (const m of markers) if (!m.edge) {
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: ringTex, color: PINK, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(m.stand.x, 0.025, m.stand.y); scene.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 2.2, 24, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: GOLD, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  beam.position.set(m.stand.x, 1.1, m.stand.y); scene.add(beam);
  m.ring = ring; m.beam = beam;
}
function updateRings(t) {
  for (const m of markers) if (m.ring) {
    const active = G.started() && G.isFound(m.it.puzzle) && !G.isDone(m.it.puzzle) && reach.has(m.node) && pos.distanceTo(m.stand) < 8;
    const target = active ? 1 : 0;
    m.ring.material.opacity += ((active ? 0.55 + 0.25 * Math.sin(t * 3) : 0) - m.ring.material.opacity) * 0.1;
    m.beam.material.opacity += ((active ? 0.22 : 0) - m.beam.material.opacity) * 0.1;
    m.ring.scale.setScalar(1 + 0.08 * Math.sin(t * 3));
    m.ring.visible = m.beam.visible = m.ring.material.opacity > 0.01 || target > 0;
  }
}

// d) pulviscolo nella luce, attorno alla telecamera
const DUST = 260, dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
for (let i = 0; i < DUST; i++) { dustPos[i * 3] = (Math.random() - 0.5) * 10; dustPos[i * 3 + 1] = Math.random() * 3; dustPos[i * 3 + 2] = (Math.random() - 0.5) * 10; dustSeed[i] = Math.random() * 10; }
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dustTex = canvasTex((g, w, h) => { const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, w, h); }, 32, 32);
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.035, map: dustTex, color: 0xfff1d6, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(dust);
function updateDust(t, dt) {
  const cx = camera.position.x, cz = camera.position.z;
  for (let i = 0; i < DUST; i++) {
    let x = dustPos[i * 3], y = dustPos[i * 3 + 1], z = dustPos[i * 3 + 2];
    x += Math.sin(t * 0.3 + dustSeed[i]) * dt * 0.08; y += Math.cos(t * 0.25 + dustSeed[i]) * dt * 0.05; z += Math.cos(t * 0.2 + dustSeed[i] * 2) * dt * 0.08;
    if (x - cx > 5) x -= 10; if (x - cx < -5) x += 10; if (z - cz > 5) z -= 10; if (z - cz < -5) z += 10; if (y > 3) y = 0; if (y < 0) y = 3;
    dustPos[i * 3] = x; dustPos[i * 3 + 1] = y; dustPos[i * 3 + 2] = z;
  }
  dustGeo.attributes.position.needsUpdate = true;
}

let lastLockMsg = 0;
function lockedFeedback(e, force) {
  const now = performance.now();
  if (!force && now - lastLockMsg < 6000) return;
  lastLockMsg = now;
  G.lockSound(); emote("No");
  G.say(e.lockedSay || "È chiuso! Forse un enigma qui vicino può aiutarci.", "think");
}

// ---------- Robot ----------
let robot = null, mixer = null, actions = {}, current = null, emoting = false;
const pos = nodes[0].pos.clone();
const startHeading = () => { const l = nodes[0].links[0]; const y = (l ? l.yaw : nodes[0].startYaw || 0) + nodes[0].rot; return Math.atan2(Math.sin(y), -Math.cos(y)); };
let heading = startHeading();
function play(name, fade = 0.25) { const a = actions[name]; if (!a || a === current) return; a.reset().setLoop(THREE.LoopRepeat).fadeIn(fade).play(); if (current) current.fadeOut(fade); current = a; }
function emote(name, loops = 1) {
  const a = actions[name]; if (!a || !mixer) return;
  emoting = true;
  a.reset(); a.setLoop(loops > 1 ? THREE.LoopRepeat : THREE.LoopOnce, loops); a.clampWhenFinished = true;
  a.fadeIn(0.2).play(); if (current && current !== a) current.fadeOut(0.2); current = a;
  const back = () => { mixer.removeEventListener("finished", back); emoting = false; if (current === a) { current = null; play("Idle"); } };
  mixer.addEventListener("finished", back);
}
// game.js lo usa per far reagire il robot (saluto, pollice su, ballo…)
window.Avatar = { ready: true, emote, frameRobot() {}, place() {}, pos: () => ({ x: pos.x, z: pos.y }) };

// ---------- Comandi ----------
const keys = new Set();
const KM = { KeyW: "f", ArrowUp: "f", KeyS: "b", ArrowDown: "b", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r", ShiftLeft: "run", ShiftRight: "run" };
function blocked() { return G.modalOpen() || !G.started() || /INPUT|TEXTAREA/.test(document.activeElement.tagName); }
addEventListener("keydown", (e) => {
  if (KM[e.code] && !blocked()) { keys.add(KM[e.code]); e.preventDefault(); }
  if (e.code === "KeyE" && !blocked()) { e.preventDefault(); useNearest(); }
});
addEventListener("keyup", (e) => { const k = KM[e.code]; if (k) setTimeout(() => keys.delete(k), 120); });
addEventListener("blur", () => keys.clear());
document.querySelectorAll("#dpad [data-k]").forEach((b) => {
  const k = b.dataset.k, on = (e) => { e.preventDefault(); if (!blocked()) keys.add(k); }, off = () => keys.delete(k);
  b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
});
let target = null, onArrive = null, downAt = null;
canvas.addEventListener("pointerdown", (e) => (downAt = [e.clientX, e.clientY]));
canvas.addEventListener("pointerup", (e) => {
  if (!downAt || blocked() || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
  const d = ray.ray.direction; if (d.y > -0.02) return;
  const hit = ray.ray.origin.clone().add(d.clone().multiplyScalar(-ray.ray.origin.y / d.y));
  walkTo(new THREE.Vector2(hit.x, hit.z));
});
// percorso a tappe: se la linea retta esce dalla zona camminabile, passa per i punti di scatto
let waypoints = [];
function segmentInside(a, b) {
  const n = Math.ceil(a.distanceTo(b) / 0.3);
  for (let i = 1; i <= n; i++) if (!inside(a.clone().lerp(b, i / n))) return false;
  return true;
}
function nearestNode(p) { let best = null, bd = Infinity; for (const n of reach) { const d = p.distanceTo(n.pos); if (d < bd) { bd = d; best = n; } } return best; }
// stanza con mobili (walk/blocks): percorso su una griglia da 25 cm che gira intorno ai tavoli
function gridRoute(from, to) {
  const n = nodes[0], S = 0.25;
  let x0 = Infinity, x1 = -Infinity, f0 = Infinity, f1 = -Infinity;
  for (const [a, b, c, d] of n.walk) { x0 = Math.min(x0, a); x1 = Math.max(x1, b); f0 = Math.min(f0, c); f1 = Math.max(f1, d); }
  const W = Math.ceil((x1 - x0) / S), Hc = Math.ceil((f1 - f0) / S);
  const cell = (p) => { const q = toPhoto(n, p); return [Math.floor((q.x - x0) / S), Math.floor((q.f - f0) / S)]; };
  const center = (i, j) => fromPhoto(n, x0 + (i + 0.5) * S, f0 + (j + 0.5) * S);
  const ok = (i, j) => i >= 0 && j >= 0 && i < W && j < Hc && inside(center(i, j));
  const [si, sj] = cell(from); let [ei, ej] = cell(to);
  if (!ok(ei, ej)) { // destinazione dentro un mobile: la cella libera più vicina
    let best = null, bd = Infinity;
    for (let i = 0; i < W; i++) for (let j = 0; j < Hc; j++) if (ok(i, j)) { const d = center(i, j).distanceTo(to); if (d < bd) { bd = d; best = [i, j]; } }
    if (!best) return null; [ei, ej] = best;
  }
  const prev = new Map(), key = (i, j) => i * 10000 + j, q = [[si, sj]];
  prev.set(key(si, sj), null);
  while (q.length) {
    const [i, j] = q.shift(); if (i === ei && j === ej) break;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const a = i + di, b = j + dj; if (prev.has(key(a, b)) || !ok(a, b)) continue;
      if (di && dj && (!ok(i + di, j) || !ok(i, j + dj))) continue;
      prev.set(key(a, b), [i, j]); q.push([a, b]);
    }
  }
  if (!prev.has(key(ei, ej))) return null;
  const cells = []; for (let c = [ei, ej]; c; c = prev.get(key(c[0], c[1]))) cells.unshift(center(c[0], c[1]));
  // semplifica: tiene solo i punti necessari per non attraversare i mobili
  const out = []; let cur = from;
  for (let k = 1; k < cells.length; k++) if (!segmentInside(cur, cells[k])) { out.push(cells[k - 1]); cur = cells[k - 1]; }
  out.push(inside(to) ? to : cells[cells.length - 1]);
  return out;
}
function route(from, to) {
  if (segmentInside(from, to)) return [to];
  if (nodes.length === 1 && nodes[0].walk) return gridRoute(from, to) || [to];
  const s = nearestNode(from), e = nearestNode(to);
  const prev = new Map([[s, null]]), q = [s];
  while (q.length) {
    const n = q.shift(); if (n === e) break;
    for (const ed of edges) {
      const o = ed.A === n ? ed.B : ed.B === n ? ed.A : null;
      if (!o || prev.has(o) || !isOpen(ed) || !reach.has(o)) continue;
      prev.set(o, n); q.push(o);
    }
  }
  const chain = []; for (let n = e; n; n = prev.get(n)) chain.unshift(n.pos.clone());
  if (!prev.has(e)) return [to];
  return [...chain, to];
}
function walkTo(p, cb) {
  waypoints = route(pos.clone(), p);
  target = waypoints.shift(); onArrive = cb || null;
  marker.position.set(p.x, 0.015, p.y); marker.material.opacity = cb ? 0 : 0.9;
}

// ---------- Tasto USA / E: esamina l'oggetto più vicino ----------
const USE_RANGE = 2.1;
let useTarget = null;
function findUseTarget() {
  let best = null, bd = USE_RANGE;
  for (const m of markers) {
    if (m.edge) {
      if (isOpen(m.edge) || !reach.has(m.edge.A)) continue;
      const d = pos.distanceTo(m.edge.A.pos.clone().lerp(m.edge.B.pos, 0.42));
      if (d < bd) { bd = d; best = m; }
      continue;
    }
    if (!reach.has(m.node) || !G.isFound(m.it.puzzle)) continue;
    const d = Math.min(pos.distanceTo(m.stand), new THREE.Vector2(m.p3.x, m.p3.z).distanceTo(pos) - 0.6);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}
function useNearest() {
  const m = useTarget; if (!m) return;
  if (m.edge) return lockedFeedback(m.edge, true);
  target = null; waypoints = []; onArrive = null;
  heading = Math.atan2(m.p3.x - pos.x, m.p3.z - pos.y);
  setTimeout(() => G.openPuzzle(m.it.puzzle), 200);
}
// la prima volta che il robot arriva davanti a un oggetto, l'enigma si apre da solo
const autoOpened = new Set();
let noAuto = false; // solo per le prove
function autoOpen() {
  if (blocked() || noAuto) return;
  for (const m of markers) {
    if (m.edge || autoOpened.has(m.it.puzzle) || !reach.has(m.node) || G.isDone(m.it.puzzle)) continue;
    const d = pos.distanceTo(m.stand);
    if (d > AUTO_OPEN + 0.4) m.wasFar = true;      // si apre solo quando il robot ci arriva, non se ci nasce accanto
    if (d > AUTO_OPEN || !m.wasFar) continue;
    autoOpened.add(m.it.puzzle); G.markFound(m.it.puzzle);
    target = null; waypoints = []; onArrive = null; marker.material.opacity = 0;
    heading = Math.atan2(m.p3.x - pos.x, m.p3.z - pos.y);
    setTimeout(() => { if (!blocked()) G.openPuzzle(m.it.puzzle); }, 250);
    return;
  }
}
const useBtn = document.getElementById("useBtn3d");
if (useBtn) useBtn.addEventListener("click", () => { if (!blocked()) useNearest(); });

// ---------- Obiettivo: prossimo enigma da risolvere e freccia che indica la strada ----------
const objText = document.getElementById("objText"), objArrow = document.getElementById("objArrow"), objBox = document.getElementById("objective");
const goalOrder = markers.filter((m) => !m.edge && GAME.puzzles[m.it.puzzle] && GAME.puzzles[m.it.puzzle].type !== "info");
let objTick = 0, objWay = null, objGoal = null;
function updateObjective(camYaw) {
  if (!objBox) return;
  const goal = goalOrder.find((m) => !G.isSolved(m.it.puzzle));
  objGoal = goal || null;
  if (!goal) { objText.innerHTML = "Tutti gli enigmi risolti!"; objArrow.style.opacity = 0; layTrail(null); return; }
  if (objTick++ % 15 === 0) {
    const r = route(pos.clone(), goal.stand.clone());
    objWay = r[0];
    layTrail([pos.clone(), ...r]);
    const label = G.isFound(goal.it.puzzle) ? goal.it.label : "Esplora";
    objText.innerHTML = `${label} <span>· ${goal.node.name}</span>`;
  }
  if (!objWay) return;
  const dx = objWay.x - pos.x, dz = objWay.y - pos.y, d = pos.distanceTo(goal.stand);
  const rel = Math.atan2(dx, dz) - camYaw;
  objArrow.style.opacity = d < 1.2 ? 0.3 : 1;
  objArrow.style.transform = `rotate(${-rel - Math.PI / 2}rad)`; // il simbolo ➤ punta a destra: lo giro verso l'alto
}

// ---------- Telecamera che cammina dietro al robot ----------
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let walkPhase = 0, camInit = false;
function updateCamera(dt, moving, speed) {
  // telecamera "sopra la spalla": dietro e un po' a destra del robot, così la strada davanti resta visibile
  const back = new THREE.Vector2(-Math.sin(heading), -Math.cos(heading));
  const right = new THREE.Vector2(-Math.cos(heading), Math.sin(heading));
  const want = pos.clone().add(back.multiplyScalar(2.5)).add(right.clone().multiplyScalar(0.55));
  // nella stanza con le misure (room) la telecamera può stare anche sopra i mobili, basta che resti tra le pareti
  const camOk = nodes[0].room ? (p) => { const q = toPhoto(nodes[0], p), r = nodes[0].room; return q.x > -r.left + 0.3 && q.x < r.right - 0.3 && q.f < r.front - 0.3 && q.f > -r.back + 0.3; } : inside;
  for (let i = 0; i < 10 && !camOk(want); i++) want.lerp(pos, 0.2);
  if (moving) walkPhase += dt * speed * 5.2;
  const bobY = moving ? Math.abs(Math.sin(walkPhase)) * 0.035 : 0;
  const wantPos = new THREE.Vector3(want.x, 1.55 + bobY, want.y); // vicino all'altezza della foto (1,5 m): meno deformazioni
  const wantLook = new THREE.Vector3(pos.x + Math.sin(heading) * 2.4 + right.x * 0.45, 0.85, pos.y + Math.cos(heading) * 2.4 + right.y * 0.45);
  const k = camInit ? Math.min(1, dt * 4) : 1, k2 = camInit ? Math.min(1, dt * 6) : 1; camInit = true;
  camPos.lerp(wantPos, k); camLook.lerp(wantLook, k2);
  camera.position.copy(camPos); camera.lookAt(camLook);
}

// ---------- Ciclo ----------
const clock = new THREE.Clock();
const v3 = new THREE.Vector3();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  reach = reachable();

  // movimento del robot
  const run = keys.has("run"), speed = run ? 3.0 : 1.5;
  let moving = false, fwd = 0;
  if (blocked()) keys.clear();
  if (keys.has("l")) heading += dt * 2.2;
  if (keys.has("r")) heading -= dt * 2.2;
  if (keys.has("f")) fwd = 1; if (keys.has("b")) fwd = -0.6;
  if (fwd || keys.has("l") || keys.has("r")) { target = null; waypoints = []; onArrive = null; marker.material.opacity = 0; }
  if (target && !blocked()) {
    const d = target.clone().sub(pos);
    if (d.length() < (waypoints.length ? 0.6 : 0.15)) {
      if (waypoints.length) target = waypoints.shift();
      else { target = null; marker.material.opacity = 0; const cb = onArrive; onArrive = null; if (cb) cb(); }
    }
    else { heading = lerpAngle(heading, Math.atan2(d.x, d.y), Math.min(1, dt * 8)); fwd = 1; }
  }
  if (fwd && !emoting) {
    const step = new THREE.Vector2(Math.sin(heading), Math.cos(heading)).multiplyScalar(fwd * speed * dt);
    const next = pos.clone().add(step);
    if (inside(next)) pos.copy(next);
    else if (inside(new THREE.Vector2(next.x, pos.y))) pos.x = next.x;
    else if (inside(new THREE.Vector2(pos.x, next.y))) pos.y = next.y;
    else {
      const e = edges.find((x) => !isOpen(x) && reach.has(x.A) && pos.distanceTo(x.A.pos.clone().lerp(x.B.pos, 0.42)) < 1.6);
      if (e) lockedFeedback(e);
      target = null; waypoints = []; onArrive = null; marker.material.opacity = 0;
    }
    moving = true;
  }
  if (robot) {
    if (!emoting) play(moving ? (run ? "Running" : "Walking") : "Idle");
    robot.position.set(pos.x, 0, pos.y); robot.rotation.y = heading;
    shadow.position.set(pos.x, 0.01, pos.y);
    mixer.update(dt);
    if (marker.material.opacity > 0) marker.scale.setScalar(1 + Math.sin(performance.now() / 180) * 0.12);
  }
  updateCamera(dt, moving, speed);
  if (G.started()) {
    useTarget = findUseTarget();
    if (useBtn) {
      useBtn.classList.toggle("on", !!useTarget);
      if (useTarget) useBtn.querySelector("b").textContent = useTarget.edge ? "Porta chiusa" : "Esamina: " + useTarget.it.label;
    }
    autoOpen();
    updateObjective(Math.atan2(camLook.x - camPos.x, camLook.z - camPos.z));
  }

  // effetti
  const tNow = performance.now() / 1000;
  const goalNear = !objGoal || pos.distanceTo(objGoal.stand) < 1.6;
  updateTrail(tNow, G.started() && !G.modalOpen() && !goalNear);
  updateBarriers(tNow, dt); updateRings(tNow); updateDust(tNow, dt);

  // stanza attuale = punto di scatto più vicino al robot (per Othy e la barra in alto)
  let nearest = nodes[0], nd = Infinity;
  for (const n of reach) { const d = pos.distanceTo(n.pos); if (d < nd) { nd = d; nearest = n; } }
  if (G.started()) G.setRoom(nearest.id);

  // una foto alla volta: quella più vicina alla telecamera. Quando cambia, la precedente sfuma via in mezzo secondo
  // (mescolarle per tutto il tragitto creava immagini doppie: porte e colonne sdoppiate)
  const cp = new THREE.Vector2(camera.position.x, camera.position.z);
  const near = nodes.filter((n) => n.tex).map((n) => [n, cp.distanceTo(n.pos)]).sort((a, b) => a[1] - b[1]);
  camera.updateMatrixWorld();
  if (near.length) {
    const [best, dBest] = near[0];
    if (!view.cur || !view.cur.tex) { view.cur = best; view.prev = null; view.fade = 1; }
    else if (best !== view.cur && dBest < cp.distanceTo(view.cur.pos) - SWITCH_GAP) { view.prev = view.cur; view.cur = best; view.fade = 0; }
    view.fade = Math.min(1, view.fade + dt / FADE_TIME);
    const A = view.cur, B = view.prev || A;
    const wB = 1 - smooth(0, 1, view.fade);
    const u = panoMat.uniforms;
    u.tA.value = A.texHi || A.tex; u.cA.value.copy(A.pos); u.rA.value = A.rot; u.sA.value.copy(A.shape); u.oA.value.copy(A.offset); u.yA.value = A.roomYaw;
    u.bN.value = A.blocks.length; A.blocks.forEach(([x0, x1, f0, f1, h, lo], i) => { u.bBox.value[i].set(x0, -f1, x1, -f0); u.bH.value[i] = h; u.bL.value[i] = lo || 0; });
    u.tB.value = B.texHi || B.tex; u.cB.value.copy(B.pos); u.rB.value = B.rot; u.sB.value.copy(B.shape); u.oB.value.copy(B.offset); u.yB.value = B.roomYaw; u.wB.value = B === A ? 0 : wB;
    wantHi(near.slice(0, 2).map((x) => x[0]));
    const lum = (A.lum ?? 0.5) * (1 - wB) + (B.lum ?? 0.5) * wB;
    hemi.intensity += ((1.0 + lum * 2.4) - hemi.intensity) * 0.05;
    sun.intensity += ((0.8 + lum * 2.6) - sun.intensity) * 0.05;
    u.camPos.value.copy(camera.position);
    u.invVP.value.multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse);
  }

  // segnaposto sullo schermo
  for (const m of markers) {
    let show;
    if (m.edge) show = !isOpen(m.edge) && reach.has(m.edge.A) && pos.distanceTo(m.edge.A.pos.clone().lerp(m.edge.B.pos, 0.48)) < 6;
    else {
      if (reach.has(m.node) && pos.distanceTo(m.stand) < REVEAL && G.started()) G.markFound(m.it.puzzle);
      const found = G.isFound(m.it.puzzle);
      m.el.classList.toggle("hidden", !found);   // da lontano: solo un luccichio
      m.el.classList.toggle("done", G.isDone(m.it.puzzle));
      m.el.classList.toggle("inrange", m === useTarget);
      show = reach.has(m.node) && pos.distanceTo(m.stand) < SHOW_NEAR;   // da lontano non si vede niente
    }
    v3.copy(m.p3).project(camera);
    if (!show || v3.z > 1 || Math.abs(v3.x) > 1.15 || Math.abs(v3.y) > 1.15) { m.el.style.display = "none"; continue; }
    m.el.style.display = "";
    m.el.style.left = ((v3.x + 1) / 2) * w + "px";
    m.el.style.top = ((1 - v3.y) / 2) * h + "px";
  }

  renderer.clear();
  renderer.render(bgScene, bgCam);
  renderer.clearDepth();
  renderer.render(scene, camera);
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function lerpAngle(a, b, k) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; }

// nuova partita: il robot torna all'ingresso
window.Percorso3D = { reset() { pos.copy(nodes[0].pos); heading = startHeading(); target = null; onArrive = null; camInit = false; } };
// comando di prova: Percorso.vaiA(i) porta il robot al punto di scatto i
window.Percorso = {
  // prova: mette il robot sul tratto dal punto i al successivo (t = 0…1), girato verso il punto successivo + gradi
  metti: (i, t = 0, gradi = 0) => { noAuto = true; const A = nodes[i], B = nodes[Math.min(i + 1, nodes.length - 1)]; target = null; waypoints = [];
    pos.copy(A.pos.clone().lerp(B.pos, t)); heading = Math.atan2(B.pos.x - A.pos.x, B.pos.y - A.pos.y) + gradi * Math.PI / 180; camInit = false; },
  nodi: () => nodes.map((n) => n.name), vaiA: (i) => walkTo(nodes[i].pos.clone()), pos: () => pos.clone(),
  vaiAOggetto: (label) => { const m = markers.find((x) => x.it && x.it.label === label); if (m) walkTo(m.stand.clone()); return !!m; },
  visibili: () => markers.filter((m) => !m.edge && m.el.style.display !== "none").map((m) => m.it.label),
  usa: () => useNearest(), vicino: () => (useTarget ? (useTarget.edge ? "porta" : useTarget.it.label) : null),
  scia: () => ({ punti: trailPts ? trailPts.length : 0, visibili: trail.filter((m) => m.visible).length, opac: trail.slice(0, 4).map((m) => +m.material.opacity.toFixed(2)), mappa: !!chevronTex.image, cam: camera.position.toArray().map((v) => +v.toFixed(2)), prima: trail[0].position.toArray().map((v) => +v.toFixed(2)), obiettivo: objGoal && objGoal.it.label })
};

// ---------- Avvio ----------
// schermata di caricamento: si chiude quando la prima foto e il robot sono pronti
const splash = document.getElementById("splash"), splashBar = document.getElementById("splashBar"), splashText = document.getElementById("splashText");
let firstReady = false, robotReady = false;
function splashProgress(p, txt) { if (splashBar) splashBar.style.width = Math.round(p * 100) + "%"; if (txt && splashText) splashText.textContent = txt; }
function maybeCloseSplash() {
  if (!firstReady || !robotReady || !splash) return;
  splashProgress(1, "Pronto!");
  setTimeout(() => { splash.classList.add("out"); setTimeout(() => splash.remove(), 700); }, 350);
}
(async () => {
  const bar = document.getElementById("loading");
  splashProgress(0.15, "Carico le foto della scuola…");
  await loadPano(nodes[0]);
  firstReady = true; splashProgress(0.7, "Accendo il robot…"); maybeCloseSplash();
  frame();
  let done = 1;
  for (const n of nodes.slice(1)) { await loadPano(n); done++; bar.textContent = `Caricamento foto ${done}/${nodes.length}…`; }
  bar.remove();
})();

new GLTFLoader().load("lib/models/RobotExpressive.glb", (gltf) => {
  robot = gltf.scene;
  robot.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
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
  robot.updateMatrixWorld(true);
  const head = robot.getObjectByName("Head"), hp = new THREE.Vector3(); head.getWorldPosition(hp);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5 }));
  back.position.set(hp.x, hp.y + 0.14, hp.z - 0.42); back.rotation.y = Math.PI; scene.add(back); head.attach(back);
  // segno di Tanit dorato sul petto
  const tc = document.createElement("canvas"); tc.width = tc.height = 128;
  const tg = tc.getContext("2d");
  tg.beginPath(); tg.arc(64, 64, 60, 0, Math.PI * 2); tg.fillStyle = "#a3124a"; tg.fill(); tg.lineWidth = 6; tg.strokeStyle = "#f2c063"; tg.stroke();
  tg.fillStyle = "#f2c063"; tg.beginPath(); tg.arc(64, 34, 11, 0, Math.PI * 2); tg.fill();
  tg.fillRect(30, 50, 68, 9); tg.fillRect(30, 40, 8, 19); tg.fillRect(90, 40, 8, 19);
  tg.beginPath(); tg.moveTo(52, 59); tg.lineTo(76, 59); tg.lineTo(88, 100); tg.lineTo(40, 100); tg.closePath(); tg.fill();
  const ttex = new THREE.CanvasTexture(tc); ttex.colorSpace = THREE.SRGBColorSpace;
  const torso = robot.getObjectByName("Torso") || robot.getObjectByName("Abdomen");
  if (torso) {
    const tp = new THREE.Vector3(); torso.getWorldPosition(tp);
    const chest = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), new THREE.MeshStandardMaterial({ map: ttex, transparent: true, roughness: 0.4, metalness: 0.2 }));
    chest.position.set(tp.x, tp.y + 0.05, tp.z + 0.2); scene.add(chest); torso.attach(chest);
  }
  document.body.classList.add("has-avatar");
  robotReady = true; maybeCloseSplash();
});
