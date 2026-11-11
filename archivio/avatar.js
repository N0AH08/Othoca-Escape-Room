/*
 * PERSONAGGIO 3D IN TERZA PERSONA
 * --------------------------------
 * Un robot 3D cammina sul pavimento delle foto 360°.
 * La telecamera 3D è messa nello stesso punto e con la stessa inquadratura della foto,
 * quindi il robot appare in prospettiva corretta: più lontano va, più diventa piccolo.
 * La telecamera della foto ruota per seguirlo (stile "telecamera fissa" dei videogiochi classici).
 *
 * Modello: "RobotExpressive" di Tomás Laulhé (Quaternius), licenza CC0.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const G = window.OthocaGame;
const pano = document.getElementById("pano");

const ROBOT_H = 1.2;     // altezza del robot in metri
const MIN_R = 1.15;      // distanza minima dalla telecamera (più vicino sembrerebbe enorme)
const MAX_R = 6.5;       // distanza massima in cui può camminare
const WALK = 1.35, RUN = 2.9; // velocità in m/s

// posizione del logo sul robot (in metri, nella posa iniziale)
const LOGO = { headSize: 0.22, headUp: 0.14, headBack: 0.42, chestSize: 0.14, chestUp: 0.05, chestFront: 0.2 };
const camH = () => (G.scene().camHeight || 1.5); // altezza della telecamera della foto

// ---------- Renderer trasparente sopra la foto ----------
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.domElement.id = "avatar3d";
// sotto gli hotspot (che restano cliccabili) ma sopra la foto
const hotspotLayer = [...pano.children].find((c) => c.tagName !== "CANVAS");
pano.insertBefore(renderer.domElement, hotspotLayer || null);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 200);
camera.rotation.order = "YXZ";

scene.add(new THREE.HemisphereLight(0xfff6ea, 0x6b5d50, 2.1));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(1.5, 5, 2);
scene.add(sun);

// Ombra morbida sotto il robot: lo "appoggia" sul pavimento della foto
const shadowTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, "rgba(0,0,0,.62)"); grd.addColorStop(0.55, "rgba(0,0,0,.28)"); grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2;
scene.add(shadow);

// Indicatore del punto di arrivo (cerchio che pulsa)
const marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 40), new THREE.MeshBasicMaterial({ color: 0xffb35c, transparent: true, opacity: 0, depthWrite: false }));
marker.rotation.x = -Math.PI / 2;
scene.add(marker);

// ---------- Stato del robot ----------
let robot = null, mixer = null, actions = {}, current = null;
const pos = new THREE.Vector2(0, -2.4);   // x, z sul pavimento (la telecamera è in 0,0)
let heading = Math.PI;                    // direzione in cui guarda il robot
let path = [], speed = WALK, resolveWalk = null, following = 0, keyMove = false;
let stepTimer = 0;
let followOn = true;               // la telecamera segue il robot
let bob = { y: 0, p: 0 }, walkPhase = 0; // oscillazione della telecamera a ogni passo

const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const yawOf = (x, z) => Math.atan2(x, -z);
const pointAt = (yaw, d) => new THREE.Vector2(Math.sin(yaw) * d, -Math.cos(yaw) * d);
const clampR = (v) => { const r = v.length(); if (r > MAX_R) v.multiplyScalar(MAX_R / r); if (r < MIN_R) v.multiplyScalar(MIN_R / Math.max(r, 0.001)); return v; };

function play(name, fade = 0.25) {
  const a = actions[name];
  if (!a || current === a) return;
  a.reset().setEffectiveWeight(1).fadeIn(fade).play();
  if (current) current.fadeOut(fade);
  current = a;
}
function emote(name, loops = 1) {
  const a = actions[name];
  if (!a || !robot) return;
  path = []; finish();
  a.reset(); a.setLoop(loops > 1 ? THREE.LoopRepeat : THREE.LoopOnce, loops); a.clampWhenFinished = true;
  a.fadeIn(0.2).play();
  if (current && current !== a) current.fadeOut(0.2);
  current = a;
  const back = () => { mixer.removeEventListener("finished", back); if (current === a) play("Idle", 0.35); };
  mixer.addEventListener("finished", back);
}

// Percorso: se la linea retta passa troppo vicino alla telecamera, il robot gira intorno
function planPath(from, to) {
  const d = to.clone().sub(from), len2 = d.lengthSq();
  const t = len2 ? Math.max(0, Math.min(1, -from.dot(d) / len2)) : 0;
  const closest = from.clone().add(d.clone().multiplyScalar(t));
  if (t > 0.05 && t < 0.95 && closest.length() < MIN_R) {
    let side = closest.length() > 0.01 ? closest.clone().normalize() : new THREE.Vector2(-d.y, d.x).normalize();
    return [side.multiplyScalar(MIN_R + 0.35), to];
  }
  return [to];
}

function walkTo(target, opts = {}) {
  if (!robot) return Promise.resolve();
  if (resolveWalk) { const r = resolveWalk; resolveWalk = null; r(); }
  const to = opts.noClamp ? target.clone() : clampR(target.clone());
  path = planPath(pos, to);
  const dist = to.distanceTo(pos);
  speed = opts.run ?? dist > 3.2 ? RUN : WALK;
  play(speed === RUN ? "Running" : "Walking");
  following = 1;
  marker.position.set(to.x, 0.015, to.y);
  marker.material.opacity = opts.noMarker ? 0 : 0.9;
  return new Promise((res) => (resolveWalk = res));
}
function finish() {
  if (resolveWalk) { const r = resolveWalk; resolveWalk = null; r(); }
}

// ---------- Ciclo di animazione ----------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const view = G.view();
  if (!view) return;
  const w = pano.clientWidth, h = pano.clientHeight;
  if (renderer.domElement.width !== Math.floor(w * renderer.getPixelRatio())) renderer.setSize(w, h, false);

  if (robot) {
    // movimento lungo il percorso
    let moving = false;
    if (keyMove) moving = true;
    else if (path.length) {
      const target = path[0], d = target.clone().sub(pos), len = d.length();
      const stepLen = speed * dt;
      if (len <= stepLen) {
        pos.copy(target); path.shift();
        if (!path.length) { play("Idle"); marker.material.opacity = 0; finish(); following = 0.6; }
      } else {
        pos.add(d.multiplyScalar(stepLen / len));
        heading += angDiff(heading, Math.atan2(target.x - pos.x, target.y - pos.y)) * Math.min(1, dt * 10);
        moving = true;
      }
    }
    if (moving) {
      stepTimer -= dt;
      if (stepTimer <= 0) { G.step && G.step(); stepTimer = speed === RUN ? 0.3 : 0.45; }
    }
    robot.position.set(pos.x, 0, pos.y);
    robot.rotation.y = heading;
    shadow.position.set(pos.x, 0.01, pos.y);
    mixer.update(dt);
    if (marker.material.opacity > 0) marker.scale.setScalar(1 + Math.sin(performance.now() / 180) * 0.12);

    // oscillazione "a mano" della telecamera mentre il robot cammina
    const baseYaw = view.yaw() - bob.y, basePitch = view.pitch() - bob.p;
    if (moving) walkPhase += dt * (speed === RUN ? 9 : 6.5);
    const amp = moving && followOn ? (speed === RUN ? 1.6 : 1) : 0;
    const nb = { y: Math.sin(walkPhase * 0.5) * 0.004 * amp, p: Math.abs(Math.sin(walkPhase)) * 0.007 * amp };
    bob.y += (nb.y - bob.y) * Math.min(1, dt * 8); bob.p += (nb.p - bob.p) * Math.min(1, dt * 8);
    view.setParameters({ yaw: baseYaw + bob.y, pitch: basePitch + bob.p });

    // la telecamera segue il robot mentre si muove
    if (following > 0 && followOn && !G.modalOpen()) {
      const r = pos.length();
      const tYaw = yawOf(pos.x, pos.y);
      const tPitch = Math.max(0.08, Math.min(0.62, Math.atan2(camH() - ROBOT_H * 0.45, r) * 0.85));
      // più il robot si allontana, più l'inquadratura si stringe: sembra che la telecamera lo segua
      const tFov = (G.fovNormal || 1.45) * Math.pow(Math.max(0.42, Math.min(1, 2.6 / r)), 0.85);
      const k = Math.min(1, dt * (moving ? 4 : 2.5));
      view.setParameters({
        yaw: view.yaw() + angDiff(baseYaw, tYaw) * k,
        pitch: view.pitch() + (tPitch - basePitch) * k,
        fov: view.fov() + (tFov - view.fov()) * k * 0.6
      });
      if (!moving) { following -= dt; }
    }
  }

  // stessa inquadratura della foto
  camera.position.set(0, camH(), 0);
  camera.fov = THREE.MathUtils.radToDeg(view.fov());
  camera.aspect = w / h;
  camera.rotation.set(-view.pitch(), -view.yaw(), 0);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}

// ---------- Controlli: clic sul pavimento ----------
let downAt = null;
pano.addEventListener("pointerdown", (e) => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
pano.addEventListener("pointerup", (e) => {
  if (!downAt || !robot || G.editor || G.busy()) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  const quick = performance.now() - downAt.t < 500;
  downAt = null;
  if (moved > 6 || !quick || e.target.closest(".hs")) return;
  const r = pano.getBoundingClientRect();
  const c = G.view().screenToCoordinates({ x: e.clientX - r.left, y: e.clientY - r.top });
  if (!c || c.pitch < 0.06) return; // sopra l'orizzonte: non è pavimento
  const d = camH() / Math.tan(c.pitch);
  walkTo(pointAt(c.yaw, d));
});

// ---------- Controlli: tastiera (WASD / frecce) ----------
const keys = new Set();
const KEYMAP = { KeyW: "f", ArrowUp: "f", KeyS: "b", ArrowDown: "b", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r" };
window.addEventListener("keydown", (e) => {
  if (!KEYMAP[e.code] || G.modalOpen() || G.busy() || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  e.preventDefault(); keys.add(KEYMAP[e.code]);
});
// anche una pressione breve fa fare qualche passo
window.addEventListener("keyup", (e) => { const k = KEYMAP[e.code]; if (k) setTimeout(() => keys.delete(k), 140); });
window.addEventListener("blur", () => keys.clear());
// croce direzionale sullo schermo (tablet, LIM)
document.querySelectorAll("#dpad [data-k]").forEach((b) => {
  const k = b.dataset.k;
  const on = (e) => { e.preventDefault(); if (!G.modalOpen() && !G.busy()) keys.add(k); };
  const off = () => keys.delete(k);
  b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off);
  b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
});
setInterval(() => {
  if (!robot) return;
  if (!keys.size || G.modalOpen() || G.busy()) { if (keyMove) { keyMove = false; play("Idle"); following = 0.6; } return; }
  const yaw = G.view().yaw();
  const f = new THREE.Vector2(Math.sin(yaw), -Math.cos(yaw)), rt = new THREE.Vector2(Math.cos(yaw), Math.sin(yaw));
  const dir = new THREE.Vector2();
  if (keys.has("f")) dir.add(f); if (keys.has("b")) dir.sub(f);
  if (keys.has("r")) dir.add(rt); if (keys.has("l")) dir.sub(rt);
  if (!dir.lengthSq()) return;
  dir.normalize();
  path = []; finish(); marker.material.opacity = 0;
  const next = clampR(pos.clone().add(dir.clone().multiplyScalar(WALK * 0.033)));
  pos.copy(next);
  heading += angDiff(heading, Math.atan2(dir.x, dir.y)) * 0.25;
  speed = WALK;
  if (!keyMove) { keyMove = true; play("Walking"); }
  following = 1;
}, 33);

// ---------- API usata da game.js ----------
const floorDist = (pitch, fallback) => (pitch > 0.08 ? camH() / Math.tan(pitch) : fallback);
// punto davanti all'oggetto dove si ferma il robot
const itemDist = (it) => Math.max(1.4, Math.min(4.2, it.dist || (it.pitch > 0.12 ? floorDist(it.pitch) - 0.75 : 2.6)));
window.Avatar = {
  ready: false,
  // cammina verso una porta e si ferma lì davanti
  goToDoor(link) {
    const d = Math.max(2.2, Math.min(5.2, link.dist || floorDist(link.pitch, 4.5)));
    return walkTo(pointAt(link.yaw, d), { noMarker: false });
  },
  // fa ancora qualche passo "dentro" la porta mentre la scena sfuma
  exitStep() {
    const ahead = pos.clone().add(new THREE.Vector2(Math.sin(heading), Math.cos(heading)).multiplyScalar(1.2));
    walkTo(ahead, { noClamp: true, noMarker: true, run: false });
  },
  // si avvicina a un oggetto e lo guarda
  async approach(it) {
    const d = itemDist(it);
    await walkTo(pointAt(it.yaw, d));
    const target = pointAt(it.yaw, d + 1);
    heading = Math.atan2(target.x - pos.x, target.y - pos.y);
  },
  // entra nella stanza nuova camminando in avanti
  enter(yaw) {
    if (!robot) return Promise.resolve();
    path = []; finish();
    pos.copy(pointAt(yaw, MIN_R));
    heading = Math.atan2(Math.sin(yaw), -Math.cos(yaw));
    return walkTo(pointAt(yaw, 2.6), { noMarker: true, run: false });
  },
  place(yaw, d = 2.4) {
    path = []; finish();
    pos.copy(pointAt(yaw, d));
    heading = Math.atan2(Math.sin(yaw), -Math.cos(yaw));
    if (robot) play("Idle");
  },
  emote,
  frameRobot() { following = 0.8; },
  follow(on) { followOn = on; if (on) following = 1; },
  // continua a camminare dritto per "m" metri
  continueForward(m = 1.2) {
    const ahead = pos.clone().add(new THREE.Vector2(Math.sin(heading), Math.cos(heading)).multiplyScalar(m));
    return walkTo(ahead, { noMarker: true, run: false });
  },
  /*
   * Stacco invisibile tra due foto: il robot resta nello stesso punto dello schermo e con la stessa
   * grandezza, mentre la foto sotto cambia. Restituisce pitch e fov da dare alla nuova vista.
   */
  matchCut(ov, newYaw, fovTarget) {
    const h = camH(), r = Math.max(0.5, pos.length());
    const a = angDiff(ov.yaw, yawOf(pos.x, pos.y));
    const tf = Math.tan(ov.fov / 2);
    let r2 = Math.max(MIN_R + 0.3, Math.min(MAX_R, (r * tf) / Math.tan(fovTarget / 2)));
    const f2 = 2 * Math.atan((r * tf) / r2), tf2 = Math.tan(f2 / 2);
    const ys = Math.tan(Math.atan2(h, r) - ov.pitch) / tf;          // altezza dei piedi sullo schermo
    const pitch2 = Math.atan2(h, r2) - Math.atan(ys * tf2);
    const a2 = Math.atan((Math.tan(a) * tf2) / tf);                     // stessa posizione orizzontale
    const turn = (newYaw + a2) - (ov.yaw + a);
    pos.copy(pointAt(newYaw + a2, r2));
    heading -= turn;
    path = path.map((p) => { const yy = yawOf(p.x, p.y) + turn, rr = p.length() * (r2 / r); return pointAt(yy, rr); });
    marker.material.opacity = 0;
    bob = { y: 0, p: 0 };
    return { pitch: pitch2, fov: f2 };
  },
  pos: () => ({ x: pos.x, z: pos.y }),
  itemPoint: (it) => { const d = itemDist(it) + 0.75; const p = pointAt(it.yaw, d); return { x: p.x, z: p.y }; }
};

// ---------- Caricamento del modello ----------
new GLTFLoader().load("lib/models/RobotExpressive.glb", (gltf) => {
  robot = gltf.scene;
  robot.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; } });
  scene.add(robot);
  mixer = new THREE.AnimationMixer(robot);
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  for (const n of ["Walking", "Running", "Idle"]) if (actions[n]) actions[n].setLoop(THREE.LoopRepeat);
  play("Idle", 0);
  // Altezza misurata dalle ossa (il riquadro dei modelli animati non è affidabile):
  // l'osso della testa è a circa il 70% dell'altezza totale del robot
  mixer.update(0.01); robot.updateMatrixWorld(true);
  let lo = Infinity, hi = -Infinity; const v = new THREE.Vector3();
  robot.traverse((o) => { if (o.isBone) { o.getWorldPosition(v); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); } });
  robot.scale.setScalar(ROBOT_H / ((hi - lo) * 1.42));

  // Robot rosa Othoca
  const PALETTE = { Main: 0xf0559a, Grey: 0xf6eef2, Black: 0x2a1d26 };
  robot.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    if (PALETTE[o.material.name] !== undefined) o.material.color.setHex(PALETTE[o.material.name]);
    o.material.roughness = 0.45; o.material.metalness = 0.15;
  });

  // Logo Othoca sulla nuca e sul petto: messo nella posa iniziale e "incollato" alle ossa
  // il logo viene disegnato su un "adesivo" bianco rotondo, così si stacca dal rosa del robot
  const badge = document.createElement("canvas"); badge.width = badge.height = 256;
  const tex = new THREE.CanvasTexture(badge);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const logoImg = new Image();
  logoImg.onload = () => {
    const g = badge.getContext("2d");
    g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fillStyle = "#ffffff"; g.fill();
    g.lineWidth = 8; g.strokeStyle = "#c2185b"; g.stroke();
    g.drawImage(logoImg, 40, 40, 176, 176);
    tex.needsUpdate = true;
  };
  logoImg.src = "lib/img/logoOthoca.png";
  const decal = (size) => new THREE.Mesh(new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4 }));
  robot.position.set(0, 0, 0); robot.rotation.set(0, 0, 0); robot.updateMatrixWorld(true);
  const head = robot.getObjectByName("Head"), torso = robot.getObjectByName("Torso") || robot.getObjectByName("Torso_1") || robot.getObjectByName("Abdomen");
  const hp = new THREE.Vector3(); head.getWorldPosition(hp);
  const back = decal(LOGO.headSize); back.position.set(hp.x, hp.y + LOGO.headUp, hp.z - LOGO.headBack); back.rotation.y = Math.PI;
  scene.add(back); head.attach(back);
  if (torso) {
    const tp = new THREE.Vector3(); torso.getWorldPosition(tp);
    const chest = decal(LOGO.chestSize); chest.position.set(tp.x, tp.y + LOGO.chestUp, tp.z + LOGO.chestFront);
    scene.add(chest); torso.attach(chest);
  }
  window.Avatar.place(G.view().yaw());
  window.Avatar.ready = true;
  document.body.classList.add("has-avatar");
  frame();
}, undefined, (err) => console.warn("Robot 3D non caricato, si gioca senza personaggio:", err));
