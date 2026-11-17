// Dettagli delle stanze (presi dalle foto 360°): cartelli, orologi, condotte, vetreria, quadri veri, tribune…
// Ogni funzione riceve il contesto della stanza (c) dopo che arredi ed enigmi sono già stati costruiti.
import { THREE, B, C, M, mat, plane, canvasTex } from "./world.js";
import * as P from "./props.js";

const PI = Math.PI;
// oggetto appeso a una parete: lato n/s/e/w, posizione lungo la parete, altezza
function onWall(c, side, t, y, obj, inset = 0.03) {
  const { W, D } = c;
  const pos = { n: [t, -D / 2 + inset, 0], s: [t, D / 2 - inset, PI], w: [-W / 2 + inset, t, PI / 2], e: [W / 2 - inset, t, -PI / 2] }[side];
  return c.place(obj, pos[0], pos[1], pos[2], { y, solid: false });
}
// strisce gialle e nere sul pavimento attorno a una macchina
function floorFrame(c, x0, z0, x1, z1) {
  const t = canvasTex("hazard", 128, 32, (g, w, h) => { g.fillStyle = "#f2c21b"; g.fillRect(0, 0, w, h); g.fillStyle = "#111"; for (let x = -32; x < w; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 16, h); g.fill(); } });
  const m = (len) => { const tt = t.clone(); tt.needsUpdate = true; tt.wrapS = THREE.RepeatWrapping; tt.repeat.set(len / 0.4, 1); return new THREE.MeshStandardMaterial({ map: tt, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1 }); };
  const w = x1 - x0, d = z1 - z0, s = 0.1;
  plane(c.scene, (x0 + x1) / 2, 0.004, z0, w, s, m(w), 0, -PI / 2); plane(c.scene, (x0 + x1) / 2, 0.004, z1, w, s, m(w), 0, -PI / 2);
  const a = plane(c.scene, x0, 0.004, (z0 + z1) / 2, d, s, m(d), 0, -PI / 2); a.rotation.set(-PI / 2, 0, PI / 2);
  const b = plane(c.scene, x1, 0.004, (z0 + z1) / 2, d, s, m(d), 0, -PI / 2); b.rotation.set(-PI / 2, 0, PI / 2);
}
function floorLine(c, x, z, w, d, color = 0xffffff) { plane(c.scene, x, 0.006, z, w, d, new THREE.MeshBasicMaterial({ color, polygonOffset: true, polygonOffsetFactor: -2 }), 0, -PI / 2); }
function floorArc(c, x, z, r, a0, a1, color = 0xffffff) { const g = new THREE.RingGeometry(r - 0.04, r + 0.04, 48, 1, a0, a1 - a0); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -PI / 2; m.position.set(x, 0.006, z); c.scene.add(m); }

export const DECOR = {
  chimica(c) {
    const { W, D, H } = c;
    onWall(c, "e", 4.6, 1.8, P.poster(P.periodicTex(), 1.7, 1.0));
    onWall(c, "e", 2.4, 1.7, P.poster(P.ghsTex(), 0.6, 0.78));
    onWall(c, "s", -4.4, 3.1, P.wallClock(0.22));
    onWall(c, "n", -2.75, 2.25, P.safetySign("occhiali", 0.28)); onWall(c, "n", 3.25, 2.0, P.safetySign("camice", 0.28));
    onWall(c, "s", 2.0, 1.9, P.safetySign("doccia", 0.3)); onWall(c, "s", 2.6, 1.9, P.safetySign("vietato", 0.3));
    // canalina scura in alto lungo la parete del bancone (come nella foto)
    const duct = P.ductRun(9.6, 0.12, 0x50565c); c.place(duct, W / 2 - 0.2, -3.4, PI / 2, { y: 3.05, solid: false });
    // vetreria, microscopi e bilancia sulle isole
    for (const [x, z] of [[-3.0, -5.5], [-0.2, -4.9], [-2.6, -1.7], [2.1, -4.4], [2.5, -2.6]]) c.place(P.beakers(), x, z, Math.random() * 3, { y: 0.945, solid: false });
    c.place(P.microscope(), -3.2, -2.25, 0.3, { y: 0.945, solid: false }); c.place(P.microscope(), -0.3, -2.3, -0.2, { y: 0.945, solid: false });
    c.place(P.balance(), 2.3, -3.6, 0, { y: 0.945, solid: false });
    c.place(P.extinguisher(), -W / 2 + 0.3, -5.7, 0, { solid: false }); onWall(c, "w", -5.7, 1.5, P.safetySign("estintore", 0.26));
    void D; void H;
  },

  officina(c) {
    const { W, D, H } = c;
    for (const z of [-7, -3.6, -0.2, 3.2]) floorFrame(c, -5.05, z - 1.35, -3.2, z + 1.35);
    for (const z of [-6.2, -2.6]) floorFrame(c, W / 2 - 2.35, z - 0.85, W / 2 - 0.05, z + 0.85);
    onWall(c, "n", -2.6, 2.4, P.safetySign("occhiali", 0.34)); onWall(c, "n", -2.0, 2.4, P.safetySign("cuffie", 0.34));
    onWall(c, "n", 2.2, 2.4, P.safetySign("pericolo", 0.34)); onWall(c, "n", 2.8, 2.4, P.safetySign("fumo", 0.34));
    onWall(c, "n", 4.6, 2.9, P.wallClock(0.22));
    c.place(P.ductRun(D - 0.6, 0.2, 0x5a7d8c), -W / 2 + 0.35, 0, PI / 2, { y: H - 0.35, solid: false });
    c.place(P.extinguisher(), 1.9, -D / 2 + 0.3, 0, { solid: false }); onWall(c, "n", 1.9, 1.6, P.safetySign("estintore", 0.28));
    for (const z of [-7, -3.6, -0.2, 3.2]) { const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.03 + Math.random() * 0.02, 0.004, 4, 10, PI * 1.5), M.steel); t.position.set((Math.random() - 0.5) * 0.3, 0.01, (Math.random() - 0.5) * 0.5); t.rotation.set(Math.random() * 3, Math.random() * 3, 0); g.add(t); } c.place(g, -3.0, z, 0, { solid: false }); }
    for (const [x, z] of [[-1.4, 6.5], [1.0, 6.7]]) { const g = new THREE.Group(); C(g, 0, 0.04, 0, 0.03, 0.08, M.steel); C(g, 0.1, 0.035, 0.03, 0.022, 0.07, M.steel); c.place(g, x, z, 0, { y: 0.76, solid: false }); }
  },

  pneumatica(c) {
    const { W, D } = c;
    const ind = canvasTex("industria", 400, 560, (g, w, h) => { g.fillStyle = "#0d1b3e"; g.fillRect(0, 0, w, h); g.fillStyle = "#4fc3f7"; g.font = "900 64px Inter"; g.textAlign = "center"; g.fillText("INDUSTRIA", w / 2, 150); g.fillStyle = "#fff"; g.font = "900 120px Inter"; g.fillText("4.0", w / 2, 280); g.strokeStyle = "#4fc3f7"; g.lineWidth = 6; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w / 2, 420, 30 + i * 14, PI * 1.1, PI * 1.9); g.stroke(); } g.font = "600 26px Inter"; g.fillText("automazione · robot · sensori", w / 2, 530); });
    onWall(c, "s", -0.6, 1.6, P.poster(ind, 0.6, 0.84));
    const fis = canvasTex("fisicaaria", 400, 560, (g, w, h) => { g.fillStyle = "#e3f2fd"; g.fillRect(0, 0, w, h); g.fillStyle = "#0d47a1"; g.font = "900 40px Inter"; g.textAlign = "center"; g.fillText("LA FISICA", w / 2, 70); g.fillText("DELL'ARIA", w / 2, 116); g.fillText("COMPRESSA", w / 2, 162); g.fillStyle = "#1565c0"; g.font = "700 34px Inter"; g.fillText("p · V = costante", w / 2, 260); g.fillText("1 bar ≈ 1 kg/cm²", w / 2, 320); g.font = "500 24px Inter"; g.fillStyle = "#333"; g.fillText("Più comprimi l'aria,", w / 2, 420); g.fillText("più forte spinge!", w / 2, 452); });
    onWall(c, "w", 2.6, 1.6, P.poster(fis, 0.6, 0.84));
    onWall(c, "n", -4.2, 2.65, P.acUnit());
    onWall(c, "e", -3.0, 2.45, P.wallClock(0.18));
    c.place(P.monitor(true), -1.8, 0.55, 0, { y: 0.76, solid: false });
    // tubi blu arrotolati sui banchi
    for (const [x, z] of [[2.2, 0.3], [-2.4, 0.7]]) { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 20), mat(0x1e88e5)); t.rotation.x = PI / 2; t.position.y = 0.01 + i * 0.016; g.add(t); } c.place(g, x, z, 0, { y: 0.77, solid: false }); }
    c.place(P.extinguisher(), -W / 2 + 0.3, -1.4, 0, { solid: false }); onWall(c, "w", -1.4, 1.6, P.safetySign("estintore", 0.26));
    onWall(c, "n", -2.6, 1.9, P.safetySign("occhiali", 0.28));
    void D;
  },

  zoomate(c) {
    const { W, D } = c;
    // fascia azzurra a lamelle in alto su tutte le pareti, come nel museo vero
    const lam = canvasTex("lamelle", 256, 64, (g, w, h) => { g.fillStyle = "#2f8fa0"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(x, 0, 2, h); g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(x + 6, 0, 2, h); } });
    for (const [side, len] of [["n", W], ["s", W], ["w", D], ["e", D]]) { const t = lam.clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(len / 1.2, 1); const g = new THREE.Group(); B(g, 0, 0, 0.12, len, 0.62, 0.22, new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, metalness: 0.2 }), false); onWall(c, side, 0, c.H - 0.38, g, 0.0); }
    // cartello ZooMate sulla porta d'ingresso in legno
    const zp = canvasTex("zoomateposter", 300, 400, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#2e7d32"; g.font = "900 46px Inter"; g.textAlign = "center"; g.fillText("ZOOMATE", w / 2, 70); g.fillStyle = "#f48fb1"; g.beginPath(); g.ellipse(150, 210, 70, 40, 0, 0, 7); g.fill(); g.strokeStyle = "#f48fb1"; g.lineWidth = 12; g.beginPath(); g.moveTo(200, 195); g.quadraticCurveTo(250, 120, 215, 110); g.stroke(); g.fillStyle = "#333"; g.font = "600 22px Inter"; g.fillText("Museo interattivo", w / 2, 320); g.fillText("delle zone umide", w / 2, 350); });
    onWall(c, "s", -6.4, 1.45, P.poster(zp, 0.55, 0.73, false), 0.09);
    // i quadri veri del museo (ritagliati dalle foto 360°)
    onWall(c, "s", 1.5, 1.75, P.photoPanel("foto/quadri/zoo_fenicotteri.jpg", 2.5, 1.6, 0xd32f2f));
    onWall(c, "w", 1.9, 1.6, P.photoPanel("foto/quadri/zoo_fiore.jpg", 1.0, 0.72, 0x1e88e5));
    // schermo di proiezione con la laguna, proiettore e casse
    const lag = canvasTex("laguna", 800, 460, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#9cc9e8"); gr.addColorStop(0.45, "#dbeef8"); gr.addColorStop(0.5, "#5b8fb0"); gr.addColorStop(1, "#2f6a8c"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#c9b98a"; g.beginPath(); g.moveTo(0, 240); g.quadraticCurveTo(400, 200, 800, 250); g.lineTo(800, 270); g.quadraticCurveTo(400, 230, 0, 262); g.fill(); for (let i = 0; i < 40; i++) { g.fillStyle = "#f48fb1"; g.beginPath(); g.ellipse(80 + Math.random() * 640, 300 + Math.random() * 90, 6, 3, 0, 0, 7); g.fill(); } g.fillStyle = "#fff"; g.font = "800 34px Inter"; g.fillText("Stagno di Cabras · fenicotteri rosa", 40, 440); });
    onWall(c, "n", 5.0, 1.65, P.projectionScreen(2.2, 1.3, lag));
    c.place(P.projector(), 5.0, -2.4, 0, { y: c.H - 0.45, solid: false });
    onWall(c, "n", 3.4, 2.15, P.speakerBox(), 0.18); onWall(c, "n", 6.6, 2.15, P.speakerBox(), 0.18);
    const desk = P.table(1.6, 0.7, M.lightwood); c.place(desk, 5.0, -3.4, 0);
    onWall(c, "w", -0.6, 2.5, P.wallClock(0.18));
    // targhette colorate appese sotto ai quadri, come nel museo
    for (const [side, t, col] of [["w", -2.3, 0xe53935], ["e", 2.5, 0x43a047], ["s", 3.0, 0xfdd835]]) { const g = new THREE.Group(); B(g, 0, 0, 0, 0.09, 0.09, 0.005, mat(col), false); g.children[0].rotation.z = 0.5; onWall(c, side, t, 1.0, g, 0.04); }
    void W; void D;
  },

  informatica(c) {
    const { W, D } = c;
    // canaline bianche per i cavi lungo le pareti e discese verso le prese (come nella foto)
    for (const [side, len] of [["n", W], ["e", D], ["w", D]]) onWall(c, side, 0, 2.78, P.cableTray(len - 0.2), 0.0);
    for (const [side, t] of [["n", -2.0], ["n", 2.0], ["e", -3.6], ["w", -1.0]]) { const g = new THREE.Group(); B(g, 0, 0, 0.04, 0.07, 2.4, 0.06, mat(0xeef0f1), false); B(g, 0, -1.25, 0.05, 0.12, 0.12, 0.05, mat(0xeef0f1), false); onWall(c, side, t, 1.55, g, 0.0); }
    // attaccapanni, pannello grigio-blu accanto all'armadio arancione, carrello grigio
    B(c.scene, -4.5, 1.75, D / 2 - 0.03, 2.0, 0.08, 0.04, M.lightwood, false); for (let i = 0; i < 6; i++) B(c.scene, -5.3 + i * 0.32, 1.71, D / 2 - 0.07, 0.03, 0.05, 0.06, M.black, false);
    c.place(P.partition(0.7, 1.95), -W / 2 + 0.35, 1.45, PI / 2).children.forEach((m) => { if (m.material === M.white) m.material = mat(0x6d7f9e, { rough: .7 }); });
    { const cart = new THREE.Group(); B(cart, 0, 0.55, 0, 0.7, 0.9, 0.5, mat(0x9ea3a8, { metal: .4, rough: .5 })); for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) C(cart, x, 0.05, z, 0.04, 0.04, M.black).rotation.x = PI / 2; c.place(cart, 3.3, -D / 2 + 0.5, 0); }
    c.place(P.networkRack(), W / 2 - 0.45, D / 2 - 0.45, PI);
    onWall(c, "s", 0, 2.6, P.cableTray(W - 1.5), 0.0);
    onWall(c, "s", -2.2, 2.2, P.acUnit());
    onWall(c, "n", 0.2, 2.55, P.wallClock(0.18));
    c.place(P.radiator(1.2), -4.16, -D / 2 + 0.02, 0, { solid: false });
    c.place(P.robotKit(), 1.0, 1.7, 0.6, { y: 0.765, solid: false }); c.place(P.robotKit(), 1.8, 2.3, -1.2, { y: 0.765, solid: false });
    // oggetti stampati in 3D accanto alle stampanti
    for (let i = 0; i < 3; i++) { const g = new THREE.Group(); const m = mat([0xf0559a, 0x29b6f6, 0xffca28][i]); if (i === 0) { const k = new THREE.Mesh(new THREE.TorusKnotGeometry(0.035, 0.012, 48, 8), m); k.position.y = 0.05; g.add(k); } else C(g, 0, 0.03, 0, 0.03, 0.06, m, 0.015, 6); c.place(g, 4.45, 0.55 + i * 0.11, 0, { y: 0.77, solid: false }); }
    const code = canvasTex("codeposter", 400, 560, (g, w, h) => { g.fillStyle = "#1e1e2e"; g.fillRect(0, 0, w, h); g.font = "600 22px 'Courier New', monospace"; const lines = [["#c792ea", "def saluta(nome):"], ["#89ddff", "    print('Ciao', nome)"], ["#fff", ""], ["#c792ea", "for i in range(3):"], ["#89ddff", "    saluta('Othoca')"], ["#fff", ""], ["#546e7a", "# Benvenuto al B09!"]]; lines.forEach(([c2, t], i) => { g.fillStyle = c2; g.fillText(t, 24, 80 + i * 40); }); g.fillStyle = "#f0559a"; g.font = "900 46px Inter"; g.fillText("PYTHON", 24, 480); });
    onWall(c, "w", -1.6, 1.6, P.poster(code, 0.6, 0.84));
    onWall(c, "w", -0.9, 1.9, P.safetySign("vietato", 0.26));
  },

  aula(c) {
    const { W, D } = c;
    onWall(c, "s", 3.4, 1.6, P.noticeBoard(1.1, 0.8));
    onWall(c, "n", -3.4, 2.5, P.wallClock(0.17));
    c.place(P.radiator(1.2), -W / 2 + 0.02, -1.9, PI / 2, { solid: false }); c.place(P.radiator(1.2), -W / 2 + 0.02, 1.4, PI / 2, { solid: false });
    // libri, quaderni e zaini sui banchi
    const desks = []; for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) desks.push([-2.7 + k * 1.5, -0.6 + r * 1.35]);
    desks.forEach(([x, z], i) => {
      if (i % 3 !== 2 && !(Math.abs(x - 0.3) < 0.1 && Math.abs(z - 0.75) < 0.1)) c.place(P.bookStack(1 + (i % 3)), x - 0.15, z - 0.05, Math.random(), { y: 0.76, solid: false });
      if (i % 2 === 0) c.place(P.schoolBag([0x1565c0, 0xc62828, 0x2e7d32, 0x6a1b9a, 0xf9a825][i % 5]), x + 0.45, z + 0.45, Math.random() * 2, { solid: false });
    });
    void D;
  },

  palestra(c) {
    const { W, D, H } = c;
    // segnature del campo da basket: aree e linee da tre punti
    for (const sx of [-1, 1]) {
      const bx = sx * (W / 2 - 2.0);
      floorLine(c, bx - sx * 2.9, 0, 0.08, 3.6, 0xffffff);
      floorLine(c, bx - sx * 1.45, -1.8, 2.9, 0.08, 0xffffff); floorLine(c, bx - sx * 1.45, 1.8, 2.9, 0.08, 0xffffff);
      floorArc(c, bx - sx * 2.9, 0, 1.8, sx > 0 ? PI / 2 : -PI / 2, sx > 0 ? PI * 1.5 : PI / 2, 0xffffff);
      floorArc(c, bx, 0, 6.2, sx > 0 ? PI * 0.62 : -PI * 0.38, sx > 0 ? PI * 1.38 : PI * 0.38, 0xd32f2f);
    }
    c.place(P.netPost(), 0, -5.2, 0); c.place(P.netPost(), 0, 5.2, 0);
    onWall(c, "n", -9.5, 4.3, P.scoreboard());
    onWall(c, "n", 0, 4.6, P.wallClock(0.3));
    // tribuna sopraelevata lungo il lato lungo (come nel palazzetto vero)
    c.place(P.gallery(14, 1.8, 2.8), 4.5, D / 2 - 0.9, PI, { solid: false });
    for (let x = -0.8; x <= 11.3; x += 3) c.colliderBox(x - 0.13, D / 2 - 1.7, x + 0.13, D / 2 - 1.45);
    onWall(c, "w", 5.5, 2.0, P.safetySign("estintore", 0.32));
    c.place(P.extinguisher(), -W / 2 + 0.3, 5.5, 0, { solid: false });
    void H;
  },

  teatro(c) {
    const { W, D, H } = c;
    for (const side of ["w", "e"]) {
      for (const z of [-2.5, 1.5, 5.5]) onWall(c, side, z, 3.4, P.sconce());
      for (const z of [-0.5, 3.5]) onWall(c, side, z, 3.2, P.acousticPanel(1.3, 2.0), 0.05);
    }
    onWall(c, "n", -4.4, 4.3, P.speakerBox(), 0.2); onWall(c, "n", 4.4, 4.3, P.speakerBox(), 0.2);
    c.place(P.projector(), 0, 5.2, PI, { y: H - 0.45, solid: false });
    // luci segnapasso ai lati della scala centrale
    for (let i = 0; i < 12; i++) for (const sx of [-1, 1]) B(c.scene, sx * 0.96, (i + 1) * 0.15 + 0.03, -0.35 + (i + 0.5) * (6.85 / 12), 0.06, 0.03, 0.03, mat(0xffffff, { emissive: 0xffe0a0, ei: 2 }), false);
    onWall(c, "s", -1.6, 3.9, P.safetySign("estintore", 0.3));
    c.place(P.extinguisher(), -1.6, D / 2 - 0.3, 0, { solid: false, y: 1.8 });
    void W;
  },
};
