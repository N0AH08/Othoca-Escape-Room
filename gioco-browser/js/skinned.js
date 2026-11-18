// Personaggi con modello 3D animato vero (Xbot, dagli esempi ufficiali di Three.js, animazioni Mixamo).
// Su questa base: tuta gialla con maschera antigas per il giocatore, vestiti e foto del viso per i prof.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { mat, canvasTex, normalFrom, LOGO } from "./world.js";

let base = null;
export function loadCharacterModel() {
  return new GLTFLoader().loadAsync("lib/models/Soldier.glb").then((g) => { base = g; }).catch(() => { base = null; });
}
export const hasModel = () => !!base;

function fabric(color, rough = 0.7, bump = 4) {
  const t = canvasTex("fabricSk", 512, 512, (g, w, h) => {
    g.fillStyle = "#cfcfcf"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { const x = Math.random() * w, y = Math.random() * h, l = 30 + Math.random() * 100, a = (Math.random() - 0.5) * 1.2; const gr = g.createLinearGradient(x, y - 7, x, y + 7); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, `rgba(${Math.random() < .5 ? "0,0,0" : "255,255,255"},${0.1 + Math.random() * 0.16})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = gr; g.fillRect(-l / 2, -7, l, 14); g.restore(); }
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  }, [3, 3]);
  const m = new THREE.MeshStandardMaterial({ color, map: t, normalMap: normalFrom(t, bump), normalScale: new THREE.Vector2(1.1, 1.1), roughness: rough });
  m.normalMap.repeat.set(3, 3); return m;
}
// "veste" il modello per zone (coordinate della posa a T, in metri): testa/collo, mani, maglia, pantaloni, scarpe.
// Per la tuta gonfia anche il corpo lungo le normali, così sembra larga.
function dressMaterial(o) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: o.map || null, normalMap: o.normalMap || null, roughness: o.rough ?? 0.75 });
  if (m.normalMap) m.normalScale.set(1.1, 1.1);
  const C = (h) => new THREE.Color(h);
  const U = { cSkin: { value: C(o.skin) }, cTop: { value: C(o.top) }, cBottom: { value: C(o.bottom) }, cShoes: { value: C(o.shoes) }, cHands: { value: C(o.hands) }, cShirt: { value: C(o.shirt || o.top) }, cHair: { value: C(o.hair || 0x2a221c) },
    coat: { value: o.coat ? 1 : 0 }, shortSleeve: { value: o.shortSleeve ? 1 : 0 }, tie: { value: C(o.tie || o.shirt || o.top) }, hasTie: { value: o.tie ? 1 : 0 }, inflate: { value: o.inflate || 0 }, slim: { value: o.slim || 0 }, bindS: { value: 0.01 }, zUp: { value: 1 }, headCovered: { value: o.headCovered ? 1 : 0 }, pockets: { value: o.pockets ? 1 : 0 } };
  m.userData.U = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = "varying vec3 vBind;\nuniform float inflate, slim, bindS, zUp;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vec3 position = (zUp > 0.5 ? vec3(transformed.x, transformed.z, transformed.y) : transformed) * bindS;
      vBind = position;
      float handsZ = step(0.68, abs(position.x));
      float feetZ = 1.0 - step(0.09, position.y);
      float headZ = step(1.56, position.y);
      float puff = inflate * (1.0 - handsZ) * (1.0 - feetZ) * (1.0 - headZ) * (0.8 + 0.4 * sin(position.y * 23.0 + position.x * 17.0) * 0.5);
      float ax0 = abs(position.x);
      float torsoZ = step(0.98, position.y) * (1.0 - step(1.6, position.y)) * (1.0 - step(0.3, ax0));
      float armZ = step(1.25, position.y) * step(0.2, ax0) * (1.0 - handsZ);
      float thighZ = step(0.5, position.y) * (1.0 - step(0.98, position.y));
      puff -= slim * (torsoZ * 1.0 + armZ * 0.55 + thighZ * 0.35);
      transformed += normalize(objectNormal) * puff / bindS;`);
    sh.fragmentShader = "varying vec3 vBind;\nuniform vec3 cSkin, cTop, cBottom, cShoes, cHands, cShirt, tie, cHair;\nuniform float coat, shortSleeve, hasTie, headCovered, pockets;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      vec3 p = vBind; vec3 col = cTop;
      float ax = abs(p.x);
      if (p.y < 0.95) col = cBottom;
      if (p.y < 0.09) col = cShoes;
      if (p.y > 1.25 && ax > 0.2) { col = cTop; if (shortSleeve > 0.5 && ax > 0.42) col = cSkin; }
      if (ax > 0.68) col = cHands;
      if (coat > 0.5 && ax < 0.075 && p.z > 0.04 && p.y > 1.02 && p.y < 1.5) col = cShirt;
      if (hasTie > 0.5 && ax < 0.022 && p.z > 0.05 && p.y > 1.12 && p.y < 1.48) col = tie;
      if (headCovered < 0.5 && p.y > 0.93 && p.y < 0.98 && ax < 0.2) col = cBottom * 0.55;
      if (p.y > 1.5 && ax < 0.06 && headCovered < 0.5) col = cSkin;
      if (p.y > 1.58 && headCovered < 0.5) col = cHair;
      if (pockets > 0.5 && p.z > 0.04) { float px = p.x; if ((px > 0.05 && px < 0.15 && p.y > 1.28 && p.y < 1.38) || (ax > 0.07 && ax < 0.16 && p.y > 0.52 && p.y < 0.64) || false) col *= 0.22; if (ax < 0.012 && p.y > 1.0 && p.y < 1.5) col *= 0.45; }
      diffuseColor.rgb *= col;`);
  };
  m.customProgramCacheKey = () => "dress" + JSON.stringify([o.inflate || 0, o.slim || 0]);
  return m;
}
function bigFolds() {
  const t = canvasTex("bigfolds", 512, 512, (g, w, h) => {
    g.fillStyle = "#d4d4d4"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const x = Math.random() * w, y = Math.random() * h, l = 80 + Math.random() * 220, a = (Math.random() - 0.5) * 0.7; const gr = g.createLinearGradient(x, y - 18, x, y + 18); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.45, "rgba(0,0,0,.28)"); gr.addColorStop(0.55, "rgba(255,255,255,.22)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); g.fillStyle = gr; g.fillRect(-l / 2, -18, l, 36); g.restore(); }
    for (let i = 0; i < 8000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  }, [2, 2]);
  return { map: t, normalMap: normalFrom(t, 7) };
}
const sphere = (r, m, sx = 1, sy = 1, sz = 1, seg = 28) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), m); s.scale.set(sx, sy, sz); s.castShadow = true; return s; };

export function makeSkinned(look = {}) {
  const root = new THREE.Group();
  const model = SkeletonUtils.clone(base.scene); model.rotation.y = Math.PI; root.add(model); // il modello originale guarda verso -Z
  const bones = {}; let skinned = null;
  model.traverse((o) => { if (o.isBone) bones[o.name.replace("mixamorig", "")] = o; if (o.isMesh && /visor/i.test(o.name)) o.visible = false; if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; skinned = skinned || o; } });
  // materiali: corpo = tuta o vestiti, giunture = pantaloni/guanti
  const fab = look.hazmat ? bigFolds() : fabric(0xffffff, 0.7, 3);
  const dress = look.hazmat
    ? { skin: look.shirt, top: look.shirt, bottom: look.shirt, shoes: 0x2a2620, hands: 0x3b452c, inflate: 0.075, headCovered: true, pockets: true, rough: 0.72 }
    : { skin: look.skinTone || look.skin || 0xe8b896, top: look.coat || look.shirt, shirt: look.coat ? look.shirt : null, coat: !!look.coat, tie: look.tie || null, bottom: look.pants || 0x2b2f3a, shoes: look.shoes || 0x1c1c1c, hair: look.hair || 0x2a221c, hands: look.skinTone || look.skin || 0xe8b896, shortSleeve: look.sleeves === "short", inflate: 0.0, slim: 0.035, rough: 0.8 };
  const bodyM = dressMaterial(Object.assign({ map: fab.map, normalMap: fab.normalMap }, dress));
  const jointM = dressMaterial(Object.assign({ map: fab.map, normalMap: fab.normalMap }, dress));
  model.traverse((o) => { if (o.isMesh && !/visor/i.test(o.name)) o.material = /Joints/i.test(o.material.name) ? jointM : bodyM; });
  // la tuta è più larga: gonfio leggermente le ossa di braccia, gambe e busto (solo spessore)
  if (false) for (const [n, k] of [["Spine", 1.18], ["Spine1", 1.06], ["LeftArm", 1.32], ["RightArm", 1.32], ["LeftForeArm", 1.2], ["RightForeArm", 1.2], ["LeftUpLeg", 1.3], ["RightUpLeg", 1.3], ["LeftLeg", 1.18], ["RightLeg", 1.18]]) if (bones[n]) { bones[n].scale.x *= k; bones[n].scale.z *= k; }
  // oggetti agganciati alle ossa (scala compensata, unità in metri)
  const attach = (boneName, obj) => { const b = bones[boneName]; if (!b) return; root.updateMatrixWorld(true); const ws = new THREE.Vector3(); b.getWorldScale(ws); obj.scale.divide(ws); const qb = new THREE.Quaternion(); b.getWorldQuaternion(qb); const qr = new THREE.Quaternion(); root.getWorldQuaternion(qr); obj.quaternion.copy(qb.invert().multiply(qr)); b.add(obj); };
  const headG = new THREE.Group(); attach("Head", headG); if (!look.hazmat) headG.scale.multiplyScalar(1.32);
  if (look.hazmat) {
    // cappuccio grande e morbido con una visiera ovale scura che copre tutto il viso (come nella foto di riferimento)
    const suit = fabric(look.shirt, 0.72, 9);
    headG.scale.multiplyScalar(1.2);
    const hood = sphere(0.16, suit, 1.1, 1.25, 1.12, 40); hood.position.set(0, 0.09, -0.02); headG.add(hood);
    const drape = sphere(0.17, suit, 1.45, 0.75, 1.25, 32); drape.position.set(0, -0.06, -0.01); headG.add(drape); // stoffa che scende sulle spalle
    const visorM = new THREE.MeshPhysicalMaterial({ color: 0x0a0b0b, roughness: 0.12, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 });
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.16, 40, 32, Math.PI * 0.5 - 0.75, 1.5, Math.PI / 2 - 0.9, 1.65), visorM);
    visor.scale.set(1.1, 1.25, 1.12); visor.position.set(0, 0.085, -0.008); headG.add(visor);
    const rimG = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 10, 40), suit); rimG.scale.set(1.15, 1.45, 1); rimG.position.set(0, 0.09, 0.15); headG.add(rimG); // bordo del cappuccio attorno alla visiera
    // logo dell'Othoca sulla schiena
    const back = new THREE.Group(); attach("Spine2", back);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.1, 40), mat(0xffffff, { rough: .45 })); disc.position.set(0, 0.05, -0.16); disc.rotation.y = Math.PI; back.add(disc);
    const lg = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), new THREE.MeshStandardMaterial({ map: LOGO, transparent: true, alphaTest: 0.05, roughness: 0.5 })); lg.position.set(0, 0.05, -0.162); lg.rotation.y = Math.PI; back.add(lg);
  } else {
    const skin = new THREE.MeshStandardMaterial({ color: look.skinTone || look.skin || 0xf0c6a0, roughness: 0.55 });
    const headS = sphere(0.1, look.face ? new THREE.MeshStandardMaterial({ color: look.hair || 0x2a221c, roughness: 0.75 }) : skin, 0.93, 1.12, 0.98, 32); headS.position.set(0, 0.09, 0.005); headG.add(headS);
    if (look.face) {
      const ft = new THREE.TextureLoader().load(look.face, (t) => { t.colorSpace = THREE.SRGBColorSpace; }); ft.colorSpace = THREE.SRGBColorSpace;
      const fm = new THREE.Mesh(new THREE.SphereGeometry(0.1015, 48, 40, Math.PI * 0.5 - 0.78, 1.56, Math.PI / 2 - 0.86, 1.72), new THREE.MeshStandardMaterial({ map: ft, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
      fm.scale.set(0.96, 1.18, 1.06); fm.position.set(0, 0.075, 0.025); headG.add(fm);
    } else {
      const eye = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2 });
      for (const x of [-0.033, 0.033]) { const e = sphere(0.012, eye); e.position.set(x, 0.1, 0.112); headG.add(e); }
    }
    const hairM = new THREE.MeshStandardMaterial({ color: look.hair || 0x3b2a20, roughness: 0.7 });
    if (look.hairStyle === "curly") { for (let i = 0; i < 60; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 1.3 - 0.4; const r = 0.115 + Math.random() * 0.02; const x = Math.cos(a) * Math.cos(e) * r, y = Math.sin(e) * r + 0.11, z = Math.sin(a) * Math.cos(e) * r + 0.01; if (z > 0.0 && y < 0.17) continue; const c = sphere(0.035 + Math.random() * 0.015, hairM, 1, 1, 1, 10); c.position.set(x, y, z); headG.add(c); } }
    else { const hr = sphere(0.104, hairM, 0.98, 0.85, 1.07); hr.position.set(0, 0.125, 0.0); headG.add(hr); if (look.hairLong || look.hairStyle === "long") { const bk = sphere(0.1, hairM, 1.1, 1.5, 0.6); bk.position.set(0, 0.03, -0.06); headG.add(bk); } }
    if (look.beard && !look.face) { const bd = sphere(0.08, new THREE.MeshStandardMaterial({ color: look.beardColor || look.hair, roughness: 0.9 }), 1.1, 0.7, 0.8); bd.position.set(0, 0.02, 0.06); headG.add(bd); }
    if (look.whistle) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 12), mat(0xc0c4c8, { metal: .8, rough: .3 })); const sp = new THREE.Group(); attach("Spine2", sp); w.rotation.z = Math.PI / 2; w.position.set(0, -0.05, 0.14); sp.add(w); }
  }
  // dimensioni: altezza ~1.75 m (giocatore un po' più grande con la tuta)
  model.updateMatrixWorld(true);
  const tmp = new THREE.Vector3(); (bones.HeadTop_End || bones.Head).getWorldPosition(tmp);
  const h = bones.HeadTop_End ? tmp.y : tmp.y + 0.16; model.scale.multiplyScalar((look.hazmat ? 1.8 : 1.74) / h);
  // animazioni
  const mixer = new THREE.AnimationMixer(model);
  const clip = (n) => base.animations.find((a) => a.name.toLowerCase() === n);
  const A = { idle: mixer.clipAction(clip("idle")), walk: mixer.clipAction(clip("walk")), run: mixer.clipAction(clip("run")) };
  for (const a of Object.values(A)) { a.play(); a.setEffectiveWeight(0); }
  A.idle.setEffectiveWeight(1);
  let wIdle = 1, wWalk = 0, wRun = 0, talking = 0, waving = false, look2 = { x: 0, y: 0 };
  const api = {
    root, head: headG,
    animate(dt, speed) {
      const k = 1 - Math.exp(-dt * 8);
      const tw = speed < 0.15 ? [1, 0, 0] : speed < 3.2 ? [0, 1, 0] : [0, 0.3, 0.7];
      wIdle += (tw[0] - wIdle) * k; wWalk += (tw[1] - wWalk) * k; wRun += (tw[2] - wRun) * k;
      A.idle.setEffectiveWeight(wIdle); A.walk.setEffectiveWeight(wWalk); A.run.setEffectiveWeight(wRun);
      A.walk.timeScale = Math.max(0.6, speed / 1.6); A.run.timeScale = Math.max(0.8, speed / 4.4);
      mixer.update(dt);
      talking = Math.max(0, talking - dt * 2.5);
      const t = performance.now() / 1000;
      if (bones.Head) { bones.Head.rotation.y += look2.x; bones.Head.rotation.x += look2.y + (talking > 0.05 ? Math.sin(t * 5) * 0.06 * talking : 0); }
      if (talking > 0.05 && bones.RightForeArm && !waving) { bones.RightArm.rotation.x += (-0.6 + Math.sin(t * 3) * 0.2) * talking; bones.RightForeArm.rotation.z += (0.9 + Math.sin(t * 4.3) * 0.25) * talking; }
      if (waving && bones.RightArm) { bones.RightArm.rotation.z += -2.0; bones.RightArm.rotation.x += -0.3; bones.RightForeArm.rotation.z += 0.6 + Math.sin(t * 9) * 0.35; }
    },
    wave() { waving = true; }, rest() { waving = false; }, talk() { talking = 1; },
    lookAt(dx, dy) { look2.x += (Math.max(-0.6, Math.min(0.6, dx)) - look2.x) * 0.1; look2.y += (Math.max(-0.3, Math.min(0.3, -dy)) - look2.y) * 0.1; },
  };
  return api;
}

// ---------- prof con il modello umano Kenney (CC0): vestiti veri disegnati nella texture + foto sul viso ----------
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
let kBase = null, kClips = {};
export async function loadTeacherModel() {
  try {
    const L = new FBXLoader();
    const [m, idle, run] = await Promise.all(["characterMedium", "idle", "run"].map((f) => L.loadAsync(`lib/models/kenney/${f}.fbx`)));
    kBase = m; kClips.idle = idle.animations.find((a) => /Idle/.test(a.name)); kClips.run = run.animations.find((a) => /Run/.test(a.name));
    for (const cl of [kClips.idle, kClips.run]) cl.tracks = cl.tracks.filter((t) => !t.name.endsWith(".scale")); // le animazioni non devono toccare la scala delle ossa
    kBase.baseSkin = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = "lib/models/kenney/skaterMaleA.png"; });
  } catch (e) { kBase = null; }
}
export const hasTeacherModel = () => !!kBase;
const loadImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
const hex = (n) => "#" + new THREE.Color(n).getHexString();
// texture del prof: parte dalla pelle Kenney e ridipinge capelli, pelle, maglia/giacca, pantaloni, scarpe, poi incolla la foto del viso
async function teacherSkin(look) {
  const c = document.createElement("canvas"); c.width = c.height = 1024; const g = c.getContext("2d");
  g.drawImage(kBase.baseSkin, 0, 0);
  const id = g.getImageData(0, 0, 1024, 1024), d = id.data;
  // colori in sRGB (prima venivano letti in spazio lineare: pelle e capelli risultavano troppo scuri)
  const rgb = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const skinHex = look.skinTone || look.skin || 0xeab894, sk = rgb(skinHex), hr = rgb(look.hair || 0x2a221c);
  const skin = new THREE.Color(skinHex);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], gg = d[i + 1], b = d[i + 2];
    if (r > 200 && gg > 110 && gg < 175 && b > 80 && b < 145) { const k = Math.min(1.08, (r + gg + b) / (245 + 147 + 115)); d[i] = Math.min(255, sk[0] * k); d[i + 1] = Math.min(255, sk[1] * k); d[i + 2] = Math.min(255, sk[2] * k); } // pelle
    else if (r < 110 && r > 50 && gg < 45 && b < 40) { d[i] = hr[0]; d[i + 1] = hr[1]; d[i + 2] = hr[2]; } // capelli
  }
  g.putImageData(id, 0, 0);
  // maglia / giacca (riquadro del busto e delle maniche)
  const top = hex(look.coat || look.shirt);
  g.fillStyle = top; g.fillRect(0, 490, 611, 534);
  const sh = g.createLinearGradient(0, 490, 0, 1024); sh.addColorStop(0, "rgba(255,255,255,.08)"); sh.addColorStop(1, "rgba(0,0,0,.18)"); g.fillStyle = sh; g.fillRect(0, 490, 611, 534);
  if (look.coat) {
    // fronte del busto nel riquadro UV: collo a y≈800, vita a y=1024. Scollo a V con camicia, revers e bottoni
    const N = 800;
    g.fillStyle = hex(look.shirt); g.beginPath(); g.moveTo(262, N - 4); g.lineTo(378, N - 4); g.lineTo(320, N + 120); g.closePath(); g.fill();
    if (look.tie) { g.fillStyle = hex(look.tie); g.beginPath(); g.moveTo(312, N - 2); g.lineTo(328, N - 2); g.lineTo(332, N + 85); g.lineTo(320, N + 105); g.lineTo(308, N + 85); g.closePath(); g.fill(); }
    g.fillStyle = "rgba(0,0,0,.25)"; for (const sx of [1, -1]) { g.beginPath(); g.moveTo(320 - sx * 58, N - 4); g.lineTo(320 - sx * 88, N + 6); g.lineTo(320 - sx * 34, N + 80); g.lineTo(320, N + 120); g.closePath(); g.fill(); }
    g.strokeStyle = "rgba(0,0,0,.4)"; g.lineWidth = 4; g.beginPath(); g.moveTo(320, N + 120); g.lineTo(320, 1024); g.stroke();
    g.fillStyle = "rgba(0,0,0,.6)"; for (const y of [N + 150, N + 195]) { g.beginPath(); g.arc(330, y, 7, 0, 7); g.fill(); }
  }
  // maniche: strisce delle braccia (0-150 e 490-611), dalla spalla (in alto) alla mano; corte = pelle sotto il gomito
  if (look.sleeves === "short") { const sk = g.createLinearGradient(0, 640, 0, 680); g.fillStyle = hex(skin.getHex()); g.fillRect(0, 660, 150, 364); g.fillRect(490, 660, 121, 364); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, 652, 150, 8); g.fillRect(490, 652, 121, 8); void sk; }
  if (look.necklace) { g.strokeStyle = hex(look.necklace); g.lineWidth = 7; g.beginPath(); g.ellipse(320, 792, 50, 34, 0, 0, Math.PI); g.stroke(); g.fillStyle = hex(look.necklace); g.beginPath(); g.arc(320, 828, 8, 0, 7); g.fill(); }
  if (look.whistle) { g.strokeStyle = "#e0245e"; g.lineWidth = 6; g.beginPath(); g.moveTo(275, 798); g.lineTo(320, 900); g.lineTo(365, 798); g.stroke(); g.fillStyle = "#c0c4c8"; g.fillRect(305, 898, 32, 18); }
  // pantaloni e scarpe
  g.fillStyle = hex(look.pants || 0x2b2f3a); g.fillRect(611, 764, 413, 260); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(611, 895, 413, 8);
  g.fillStyle = hex(look.shoes || 0x1c1c1c); g.fillRect(639, 134, 185, 390); // scarpe
  g.fillStyle = hex(skin.getHex()); g.fillRect(824, 134, 200, 390); // mani
  g.fillStyle = hex(look.pants || 0x2b2f3a); g.fillRect(639, 524, 385, 240); // bacino
  if (look.beard && !look.face) { const bc = hex(look.beardColor || look.hair || 0x2a221c); g.fillStyle = bc; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(322, 300, 95, 60, 0, 0, Math.PI); g.fill(); g.beginPath(); g.ellipse(322, 285, 40, 10, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
  // foto del viso sul lato frontale della testa
  if (look.face) { const f = await loadImg(look.face); if (f) { g.fillStyle = hex(skin.getHex()); g.beginPath(); g.ellipse(322, 225, 92, 120, 0, 0, 7); g.fill(); g.drawImage(f, 322 - 100, 225 - 140, 200, 280); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = true;
  return t;
}
export function makeTeacher(look = {}) {
  const root = new THREE.Group();
  const model = SkeletonUtils.clone(kBase); root.add(model);
  const bones = {}; let mesh = null;
  model.traverse((o) => { if (o.isBone) bones[o.name] = o; if (o.isMesh) { mesh = o; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 }); mesh.material = m;
  teacherSkin(look).then((t) => { const cur = mesh.material; cur.map = t; cur.needsUpdate = true; m.map = t; });
  // altezza ~1.72 m
  const b = new THREE.Box3().setFromObject(model); const h = b.max.y - b.min.y || 376; model.scale.multiplyScalar(1.72 / h); model.position.y = -b.min.y * (1.72 / h);
  const mixer = new THREE.AnimationMixer(model);
  const A = { idle: mixer.clipAction(kClips.idle), run: mixer.clipAction(kClips.run) };
  A.idle.play(); A.run.play(); A.run.setEffectiveWeight(0);
  let wRun = 0, talking = 0, waving = false, look2 = { x: 0, y: 0 };
  if (bones.Head) bones.Head.scale.setScalar(0.74); // testa meno da cartone, proporzioni più reali
  const headG = new THREE.Group(); if (bones.Head) bones.Head.add(headG);
  addAccessories(root, bones, look);
  return {
    root, head: headG,
    animate(dt, speed) {
      wRun += ((speed > 0.15 ? 1 : 0) - wRun) * (1 - Math.exp(-dt * 8)); A.run.setEffectiveWeight(wRun); A.idle.setEffectiveWeight(1 - wRun); A.run.timeScale = Math.max(0.5, speed / 4);
      mixer.update(dt); talking = Math.max(0, talking - dt * 2.5); const t = performance.now() / 1000;
      if (bones.Head) { bones.Head.rotation.y += look2.x; bones.Head.rotation.x += look2.y + (talking > 0.05 ? Math.sin(t * 5) * 0.07 * talking : 0); }
      if (talking > 0.05 && bones.RightForeArm && !waving) { bones.RightArm.rotation.x += (-0.5 + Math.sin(t * 3) * 0.2) * talking; bones.RightForeArm.rotation.x += (-0.8 + Math.sin(t * 4.3) * 0.25) * talking; }
      if (waving && bones.RightArm) { bones.RightArm.rotation.z += 2.0; bones.RightForeArm.rotation.z += 0.5 + Math.sin(t * 9) * 0.35; }
    },
    wave() { waving = true; }, rest() { waving = false; }, talk() { talking = 1; },
    lookAt(dx, dy) { look2.x += (Math.max(-0.6, Math.min(0.6, dx)) - look2.x) * 0.1; look2.y += (Math.max(-0.3, Math.min(0.3, -dy)) - look2.y) * 0.1; },
  };
}

// ---------- accessori (capelli lunghi, occhiali, cappello, sciarpa, camice lungo) ----------
function boneGroup(root, bone) {
  // gruppo agganciato all'osso ma con unità in metri e assi del personaggio
  root.updateMatrixWorld(true);
  const g = new THREE.Group(); const ws = new THREE.Vector3(); bone.getWorldScale(ws); const rs = new THREE.Vector3(); root.getWorldScale(rs);
  g.scale.set(rs.x / ws.x, rs.y / ws.y, rs.z / ws.z);
  const qb = new THREE.Quaternion(); bone.getWorldQuaternion(qb); const qr = new THREE.Quaternion(); root.getWorldQuaternion(qr); g.quaternion.copy(qb.invert().multiply(qr));
  bone.add(g); return g;
}
function addAccessories(root, bones, look) {
  const H = bones.Head; if (!H) return;
  const std = (c, r = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  // misura la testa in metri, nello spazio del personaggio
  root.updateMatrixWorld(true);
  const hw = new THREE.Vector3(); H.getWorldPosition(hw); root.worldToLocal(hw);
  const g = boneGroup(root, H); g.updateMatrixWorld(true);
  const hairM = std(look.hair || 0x2a221c, 0.85);
  // centro testa ~0.13 m sopra l'osso del collo
  const C = new THREE.Vector3(0, 0.185, 0.0), R = 0.155;
  if (look.female || look.hairLong) {
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.95, 0.16, 8, 20), hairM); back.scale.set(1.12, 1, 0.6); back.position.set(C.x, C.y - 0.07, C.z - 0.07); back.castShadow = true; g.add(back);
    if (look.hairStyle === "curly") for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), hairM); b2.position.set(C.x + Math.cos(a) * R * 0.95, C.y + 0.02 + Math.sin(a) * R * 0.7, C.z - 0.03 - Math.abs(Math.sin(a)) * 0.02); if (b2.position.z > -0.02 && b2.position.y < C.y + 0.06 && Math.abs(b2.position.x) < 0.06) continue; g.add(b2); }
  }
  if (look.glasses && !look.face) {
    const fr = std(0x1a1a1a, 0.3);
    for (const sx of [-1, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.005, 8, 24), fr); ring.position.set(C.x + sx * 0.055, C.y - 0.018, C.z + R * 1.04); g.add(ring); const arm = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.15), fr); arm.position.set(C.x + sx * 0.098, C.y - 0.012, C.z + R * 0.55); g.add(arm); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.005, 0.005), fr); br.position.set(C.x, C.y - 0.01, C.z + R * 1.06); g.add(br);
  }
  if (look.goggles) { const gm = new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.35, roughness: 0.1 }); const gg = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.07, 6, 16), gm); gg.rotation.z = Math.PI / 2; gg.position.set(C.x, C.y + 0.085, C.z + R * 0.75); gg.rotation.x = -0.5; g.add(gg); }
  if (look.hat) { const hm = std(look.hat, 0.8); const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hm); cap.scale.set(1.05, 0.9, 1.12); cap.position.set(C.x, C.y + 0.06, C.z - 0.01); g.add(cap); const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.01, 24, 1, false, -Math.PI / 2, Math.PI), hm); visor.position.set(C.x, C.y + 0.065, C.z + R * 0.95); visor.rotation.x = 0.12; g.add(visor); }
  const chest = bones.Chest || bones.Spine2 || bones.Spine1 || bones.Spine;
  if (look.scarf && chest) { const cg = boneGroup(root, bones.Neck || chest); const sm = std(look.scarf, 0.9); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.03, 10, 24), sm); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.0, 0.0); cg.add(ring); const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.02), sm); tail.position.set(0.04, -0.1, 0.08); cg.add(tail); }
  if (look.longCoat && bones.Hips) { const cg = boneGroup(root, bones.Hips); const cm = std(look.coat || 0xf6f6f6, 0.8); cm.side = THREE.DoubleSide; const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.42, 24, 1, true, Math.PI * 0.12, Math.PI * 1.76), cm); skirt.position.set(0, -0.2, -0.005); skirt.castShadow = true; cg.add(skirt); }
}

// ---------- esploratore (personaggio principale) ricreato sul modello umano Kenney ----------
export function makeExplorer(look = {}) {
  const root = new THREE.Group();
  const model = SkeletonUtils.clone(kBase); root.add(model);
  const bones = {}; let mesh = null;
  model.traverse((o) => { if (o.isBone) bones[o.name] = o; if (o.isMesh) { mesh = o; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  // texture della tuta: giallo senape con pieghe, stivali scuri, guanti verde oliva
  const c = document.createElement("canvas"); c.width = c.height = 1024; const g = c.getContext("2d");
  const Y = look.suit || "#d4b12c";
  g.fillStyle = Y; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) { const x = Math.random() * 1024, y = Math.random() * 1024, l = 60 + Math.random() * 200, a = (Math.random() - 0.5) * 0.6 + Math.PI / 2; const gr = g.createLinearGradient(x, y - 14, x, y + 14); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.45, "rgba(60,40,0,.25)"); gr.addColorStop(0.55, "rgba(255,240,180,.18)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = gr; g.fillRect(-l / 2, -14, l, 28); g.restore(); }
  g.fillStyle = "#2a2620"; g.fillRect(639, 134, 185, 390);   // stivali
  g.fillStyle = "#3b452c"; g.fillRect(824, 134, 200, 390);   // guanti
  g.fillStyle = "rgba(30,25,10,.6)"; g.fillRect(316, 520, 8, 360); for (const [x, y] of [[230, 640], [380, 640], [700, 880], [900, 880]]) g.fillRect(x, y, 50, 10); // cerniera e tasche
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const fold = bigFolds();
  mesh.material = new THREE.MeshStandardMaterial({ map: tex, normalMap: fold.normalMap, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.75 });
  // proporzioni: testa normale, tuta larga su busto e arti
  for (const [n, k] of [["Spine", 1.15], ["Chest", 1.1], ["LeftArm", 1.3], ["RightArm", 1.3], ["LeftForeArm", 1.2], ["RightForeArm", 1.2], ["LeftUpLeg", 1.25], ["RightUpLeg", 1.25], ["LeftLeg", 1.15], ["RightLeg", 1.15]]) if (bones[n]) { const c2 = bones[n].children.find((ch) => ch.isBone); const ax = c2 ? (Math.abs(c2.position.x) > Math.abs(c2.position.y) ? "x" : "y") : "y"; for (const a of ["x", "y", "z"]) if (a !== ax) bones[n].scale[a] *= k; }
  const b0 = new THREE.Box3().setFromObject(model); const h = b0.max.y - b0.min.y || 376; const sc = 1.78 / h; model.scale.multiplyScalar(sc); model.position.y = -b0.min.y * sc;
  root.updateMatrixWorld(true);
  if (bones.Head) bones.Head.scale.setScalar(0.03); // la testa del modello sparisce: la testa è il cappuccio
  const attach = (b, obj) => { if (!b) return; root.updateMatrixWorld(true); const ws = new THREE.Vector3(); b.getWorldScale(ws); obj.scale.divide(ws); const qb = new THREE.Quaternion(); b.getWorldQuaternion(qb); const qr = new THREE.Quaternion(); root.getWorldQuaternion(qr); obj.quaternion.copy(qb.invert().multiply(qr)); b.add(obj); };
  // cappuccio con visiera ovale nera
  const suitM = new THREE.MeshStandardMaterial({ color: Y, map: fold.map, normalMap: fold.normalMap, normalScale: new THREE.Vector2(1.3, 1.3), roughness: 0.75 });
  const headG = new THREE.Group(); attach(bones.Head, headG);
  const hp = new THREE.Vector3(); bones.Head.getWorldPosition(hp); const top = new THREE.Vector3(); (bones.Head_end || bones.Head).getWorldPosition(top);
  const R = 0.135; void top;
  const hood = sphere(R, suitM, 1.08, 1.22, 1.1, 40); hood.position.set(0, R * 0.95, -0.01); headG.add(hood);
  const drape = sphere(R * 0.95, suitM, 1.3, 0.5, 1.15, 32); drape.position.set(0, -R * 0.05, -0.01); headG.add(drape);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 32, Math.PI * 0.5 - 0.72, 1.44, Math.PI / 2 - 0.85, 1.6), new THREE.MeshPhysicalMaterial({ color: 0x090a0a, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06 }));
  visor.scale.set(1.1, 1.24, 1.12); visor.position.set(0, R * 0.92, 0.004); headG.add(visor);
  // logo dell'Othoca sulla schiena
  const back = new THREE.Group(); attach(bones.Chest || bones.Spine, back);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.1, 40), mat(0xffffff, { rough: .45 })); disc.position.set(0, 0.05, -0.2); disc.rotation.y = Math.PI; back.add(disc);
  const lg = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), new THREE.MeshStandardMaterial({ map: LOGO, transparent: true, alphaTest: 0.05 })); lg.position.set(0, 0.05, -0.202); lg.rotation.y = Math.PI; back.add(lg);
  // animazioni
  const mixer = new THREE.AnimationMixer(model);
  const A = { idle: mixer.clipAction(kClips.idle), run: mixer.clipAction(kClips.run) }; A.idle.play(); A.run.play(); A.run.setEffectiveWeight(0);
  let wRun = 0;
  return { root, head: headG, animate(dt, speed) { wRun += ((speed > 0.15 ? 1 : 0) - wRun) * (1 - Math.exp(-dt * 8)); A.run.setEffectiveWeight(wRun); A.idle.setEffectiveWeight(1 - wRun); A.run.timeScale = Math.max(0.55, speed / 4.2); mixer.update(dt); }, wave() {}, rest() {}, talk() {}, lookAt() {} };
}

// ---------- personaggio principale: un ragazzo con lo zaino dell'Othoca ----------
export function makeBoy() {
  const api = makeTeacher({ shirt: 0x2f6fd6, sleeves: "short", pants: 0x3c5a85, shoes: 0xf2f2f2, hair: 0x3a2516, skinTone: 0xe8b48e });
  let chest = null; api.root.traverse((o) => { if (o.isBone && (o.name === "Chest" || o.name === "UpperChest") && !chest) chest = o; });
  if (chest) {
    api.root.updateMatrixWorld(true);
    const bag = new THREE.Group(); const ws = new THREE.Vector3(); chest.getWorldScale(ws); bag.scale.set(1 / ws.x, 1 / ws.y, 1 / ws.z);
    const qb = new THREE.Quaternion(); chest.getWorldQuaternion(qb); const qr = new THREE.Quaternion(); api.root.getWorldQuaternion(qr); bag.quaternion.copy(qb.invert().multiply(qr));
    const bm = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.75 }), pink = new THREE.MeshStandardMaterial({ color: 0xf0559a, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.18, 8, 20), bm); body.scale.set(1.15, 1, 0.6); body.position.set(0, -0.02, -0.19); body.castShadow = true; bag.add(body);
    const pocket = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.06, 6, 16), pink); pocket.rotation.z = Math.PI / 2; pocket.scale.set(1, 1.3, 0.5); pocket.position.set(0, -0.15, -0.26); bag.add(pocket);
    for (const x of [-0.09, 0.09]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.02), bm); st.position.set(x, 0.02, 0.0); bag.add(st); }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.085, 40), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 })); disc.position.set(0, 0.02, -0.272); disc.rotation.y = Math.PI; bag.add(disc);
    const lg = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), new THREE.MeshStandardMaterial({ map: LOGO, transparent: true, alphaTest: 0.05 })); lg.position.set(0, 0.02, -0.274); lg.rotation.y = Math.PI; bag.add(lg);
    chest.add(bag);
  }
  return api;
}
