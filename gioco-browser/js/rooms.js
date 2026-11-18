// Le 8 escape room. Ogni stanza: guscio (misure, materiali), arredi ricavati dalle foto 360°,
// professore NPC con dialoghi, 2 sfide con 3 livelli di aiuto, curiosità finale sull'indirizzo.
import { TEX, M, mat, PAL, THREE, B, C, S, plane, textSign, canvasTex } from "./world.js";
import * as P from "./props.js";
import { sfx } from "./audio.js";

const PI = Math.PI;

export const ROOMS = [
// =====================================================================================
{
  id: "chimica", name: "Laboratorio di Chimica", indirizzo: "Biennio · Liceo Scienze Applicate", difficulty: 1,
  photos: ["chemistry_09", "chemistry_07"], cardPhoto: "chemistry_09",
  size: [12, 18, 4.2],
  preload: ["foto/tex/chem_floor.jpg", "foto/tex/chem_ceiling.jpg", "foto/tex/chem_cabinets.jpg", "foto/tex/chem_posters.jpg", "foto/tex/chem_hood.jpg"],
  shell: () => ({ floorTex: TEX.tiles("#d7d3cc", "#bdb6ac", 4), floorPhoto: "foto/tex/chem_floor.jpg", floorScale: 1.5, floorBump: 4, ceilPhoto: "foto/tex/chem_ceiling.jpg", ceilScale: 2.4, ceilGlow: 0.5, wall: 0xf1ead8, windowBlinds: true, windows: [{ side: "w", y: 3.45, h: 0.95, from: -0.47, to: 0.47, n: 9 }, { side: "e", y: 3.45, h: 0.95, from: 0.12, to: 0.47, n: 3 }], lightSX: 2.4, lightSZ: 3.2, lightW: 0.25, lightD: 1.5 }),
  // pianta presa dalla foto 360°: cappa e armadio giallo a nord, armadi a vetri a ovest, cartelloni e bancone a est, aula con schermo a sud
  spawn: [4.6, 7.4, PI], exit: { side: "n", x: 4.3, color: 0x2a6fc0, glass: true }, entry: { side: "s", x: 4.6, color: 0x8a8f96 },
  teacher: { name: "Prof.ssa Ferri", role: "Chimica", at: [1.6, 1.0], look: { female: true, coat: 0xf6f6f6, longCoat: true, goggles: true, shirt: 0x6a8fbf, pants: 0x3c3f4a, hair: 0x7a4a2a, hairLong: true, glasses: true } },
  tasks: [
    { id: "sicurezza", title: "Sicurezza prima di tutto", step: (c) => c.has("camice") ? "Torna dalla prof per il quiz sulla sicurezza" : "Trova camice e occhiali nell'armadio delle protezioni",
      hints: ["Camice e occhiali di solito stanno negli armadi del laboratorio.", "L'armadio delle protezioni è in fondo alla parete degli armadi a vetri, vicino alla cappa.", "Prendi camice e occhiali dall'armadio vicino all'angolo con la cappa, poi parla con la Prof.ssa Ferri (E)."] },
    { id: "ph", title: "Le provette misteriose", step: (c) => `Fai l'esperimento sulle 3 provette del bancone (${c.tubesDone ? c.tubesDone() : 0}/3)`,
      hints: ["Le tre provette sono sul bancone bianco in fondo: avvicinati a ognuna e premi E.", "Il colore dice tutto: rosso o arancio = acido, verde = neutro, blu o viola = basico.", "Limone = acido · acqua = neutro · sapone = basico."] },
  ],
  intro: [
    "Benvenuto nel laboratorio di chimica! Io sono la professoressa Ferri.",
    "Oggi facciamo un vero esperimento… ma in laboratorio la prima regola è la sicurezza.",
    "Trova camice e occhiali nell'armadio delle protezioni, vicino alla cappa, poi torna da me: ti farò due domande veloci.",
  ],
  build(c) {
    const { W, D } = c;
    // --- parete nord: armadio giallo, cappa (foto vera), lavello ---
    c.place(P.safetyCabinet(), -3.7, -D / 2 + 0.35, 0);
    c.place(P.fumeHood(1.9, "foto/tex/chem_hood.jpg"), -1.4, -D / 2 + 0.45, 0, { cam: true });
    c.place(P.sinkCounter(1.6), 1.3, -D / 2 + 0.36, 0);
    for (const x of [-4.6, 2.6]) { const p = C(c.scene, x, 2.1, -D / 2 + 0.12, 0.05, 4.2, mat(0xe8662c, { rough: .5 })); p.castShadow = false; } // tubi arancioni del gas
    // --- parete ovest: armadio delle protezioni + fila di armadi a vetri (foto vera) ---
    const cab = c.place(P.glassCabinet(1.8, 2.3, 0.5, false), -W / 2 + 0.3, -D / 2 + 1.6, PI / 2);
    const coat = new THREE.Group(); B(coat, 0, 1.3, 0.05, 0.4, 0.8, 0.05, M.white); B(coat, 0, 1.75, 0.05, 0.12, 0.08, 0.06, M.grey); coat.position.set(0, 0, 0.15); cab.add(coat);
    c.interact(cab, { label: "Apri l'armadio delle protezioni", point: new THREE.Vector3(-W / 2 + 1.0, 0, -D / 2 + 1.6), range: 2.4, when: () => !c.has("camice"),
      use: () => { coat.visible = false; c.give({ id: "camice", name: "Camice", icon: "🥼", desc: "Protegge vestiti e pelle" }); c.give({ id: "occhiali", name: "Occhiali protettivi", icon: "🥽", desc: "Proteggono gli occhi dagli schizzi" }); c.toast("Hai preso camice e occhiali! Torna dalla Prof.ssa Ferri."); } });
    c.place(P.photoRun("foto/tex/chem_cabinets.jpg", 10.6, 2.45, 0.55, 3.6), -W / 2 + 0.3, 0.4, PI / 2, { cam: true });
    // --- parete est: bancone perimetrale, cartelloni di zoologia (foto vera), lavagna e TV su supporto ---
    c.place(P.wallBench(8.4), W / 2 - 0.38, -3.4, -PI / 2);
    const postT = P.photoTex("foto/tex/chem_posters.jpg").clone(); postT.needsUpdate = true; postT.wrapS = THREE.RepeatWrapping; postT.repeat.set(2.2, 1);
    plane(c.scene, W / 2 - 0.02, 2.45, -3.4, 9.6, 0.62, new THREE.MeshStandardMaterial({ map: postT, roughness: 0.8, emissive: 0xffffff, emissiveMap: postT, emissiveIntensity: 0.2 }), -PI / 2);
    B(c.scene, W / 2 - 0.05, 2.82, -3.4, 0.02, 0.02, 9.6, mat(0xb07040), false); // asta dei cartelloni
    for (const [z, col] of [[-6.4, 0xf4f4f4], [-5.6, 0xd0d0d0], [-1.6, 0xc62828]]) { const bx = B(c.scene, W / 2 - 0.4, 1.07, z, 0.4, 0.3, 0.45, mat(col)); bx.castShadow = true; } // stufa, centrifuga, strumenti
    const wbStand = new THREE.Group(); B(wbStand, 0, 1.0, 0, 0.05, 2.0, 0.05, M.black); B(wbStand, 0, 0.03, 0, 0.6, 0.05, 0.6, M.black);
    const wb = P.whiteboard(1.6, 1.0, P.boardTex("chim", [{ t: "Oggi: gli indicatori di pH", bold: true, underline: true, size: 52 }, { t: "acido  <  7  =  neutro  <  basico", gap: 10 }, { t: "H₂O → pH 7     aceto → pH 3", color: "#c62828" }, { t: "candeggina → pH 12", color: "#2e7d32" }, { t: "Regola n.1: camice + occhiali!", color: "#c62828", bold: true, gap: 10 }]));
    wb.position.set(0, 1.55, 0.05); wbStand.add(wb); c.place(wbStand, W / 2 - 1.5, -4.9, -PI / 2);
    c.place(P.tv(1.3), W / 2 - 1.5, -1.6, -PI / 2);
    // cartellone del pH (interagibile), sulla parete est vicino alla porta d'uscita
    const ph = P.phChartTex();
    const chart = c.place(P.poster(ph, 0.75, 1.0), W / 2 - 0.05, -D / 2 + 1.3, -PI / 2, { y: 1.6, solid: false });
    c.interact(chart, { label: "Leggi il cartellone del pH", point: new THREE.Vector3(W / 2 - 0.9, 0, -D / 2 + 1.3), range: 2.4, use: () => c.canvasDoc("Il cartellone del pH", ph.image, "Ogni colore dell'indicatore universale corrisponde a un valore di pH.") });
    // --- isole bianche con cassetti verde menta al centro della metà nord ---
    c.place(P.labBench(4.2, 1.3), -1.6, -5.2, 0); c.place(P.labBench(4.2, 1.3), -1.6, -2.0, 0); c.place(P.labBench(3.0, 1.3), 2.3, -3.6, PI / 2);
    for (const x of [-3.0, -1.6, -0.2]) { c.place(P.stool(), x, -4.2, 0); c.place(P.stool(), x, -1.0, 0); }
    // --- esperimento del pH: tre provette da provare una alla volta ---
    const rack = new THREE.Group(); B(rack, 0, 0.05, 0, 0.62, 0.1, 0.16, M.wood); B(rack, 0, 0.16, 0, 0.62, 0.02, 0.16, M.wood);
    c.place(rack, -0.6, -5.2, 0, { y: 0.95, solid: false });
    const TUBES = [
      { id: "limone", name: "Succo di limone", emoji: "🍋", col: 0xe53935, colName: "ROSSO", ans: 0, why: "Il limone contiene acido citrico: pH circa 2." },
      { id: "acqua", name: "Acqua del rubinetto", emoji: "💧", col: 0x43a047, colName: "VERDE", ans: 1, why: "L'acqua pura è neutra: pH 7." },
      { id: "sapone", name: "Acqua e sapone", emoji: "🧼", col: 0x1e88e5, colName: "BLU", ans: 2, why: "Il sapone è basico: pH circa 10." },
    ];
    c.state.tubes = c.state.tubes || {};
    c.tubesDone = () => Object.keys(c.state.tubes).length;
    TUBES.forEach((tb, i) => {
      const g = new THREE.Group();
      C(g, 0, 0.2, 0, 0.03, 0.32, M.glass, 0.03, 14);
      const lm = new THREE.MeshStandardMaterial({ color: 0xdfe9ee, emissive: 0x000000, roughness: 0.2, transparent: true, opacity: 0.88 });
      const liq = C(g, 0, 0.13, 0, 0.026, 0.15, lm, 0.026, 14); // il materiale viene clonato da c.interact: usa sempre liq.material
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.07), new THREE.MeshBasicMaterial({ map: textSign("tube" + i, tb.emoji + " " + tb.name, { bg: "#ffffff", fg: "#222", w: 512, h: 160, font: "bold 52px Inter, sans-serif" }) })); tag.position.set(0, 0.06, 0.09); g.add(tag);
      const dropper = new THREE.Group(); C(dropper, 0, 0.12, 0, 0.012, 0.2, M.glass, 0.006, 10); S(dropper, 0, 0.25, 0, 0.025, mat(0x222222)); dropper.position.set(0, 0.5, 0); dropper.visible = false; g.add(dropper);
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.075, 24), new THREE.MeshBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0, side: THREE.DoubleSide })); halo.rotation.x = -Math.PI / 2; halo.position.y = 0.11; g.add(halo);
      c.place(g, -0.6 + (i - 1) * 0.2, -5.2, 0, { y: 0.97, solid: false });
      const target = new THREE.Color(tb.col);
      const pour = () => new Promise((res) => { dropper.visible = true; let t = 0; const f = (dt) => { if (t > 1.6) return; t += dt; dropper.position.y = 0.5 - Math.sin(Math.min(1, t / 0.6) * Math.PI / 2) * 0.12; if (t > 0.6) { liq.material.color.lerp(target, 0.1); liq.material.emissive.copy(liq.material.color).multiplyScalar(0.3); } if (t > 1.6) { dropper.visible = false; liq.material.color.copy(target); liq.material.emissive.copy(target).multiplyScalar(0.3); res(); } }; c.anim(f); });
      let poured = false;
      c.interact(g, { label: `Provetta: ${tb.name}`, point: new THREE.Vector3(-0.6 + (i - 1) * 0.2, 0, -4.35), range: 1.8, when: () => !c.state.tubes[tb.id],
        use: async () => {
          if (!c.isDone("sicurezza")) { c.prof("Ehi! Prima camice e occhiali, e il quiz sulla sicurezza. Poi facciamo l'esperimento."); return; }
          if (!poured) { poured = true; c.toast(`Versi due gocce di indicatore nel ${tb.name.toLowerCase()}…`); sfx.pick(); await pour(); }
          const ok = await c.puzzle({ type: "quiz", kind: "Esperimento", title: `${tb.emoji} ${tb.name}`, body: `<div class="tube-show" style="--c:#${target.getHexString()}"><i></i><span>Con l'indicatore è diventato <b>${tb.colName}</b></span></div><p class="muted" style="margin:6px 0 0">Rosso/arancio = acido · verde = neutro · blu/viola = basico</p>`,
            questions: [{ q: `Allora il ${tb.name.toLowerCase()} è…`, options: ["🔴 Acido", "🟢 Neutro", "🔵 Basico"], correct: tb.ans, explain: tb.why }] });
          if (!ok) return;
          c.state.tubes[tb.id] = true; halo.material.opacity = 0.9; sfx.ok(); c.refresh();
          if (c.tubesDone() < TUBES.length) { c.toast(`Provette analizzate: ${c.tubesDone()}/${TUBES.length}`); return; }
          // tutte e tre: la cappa si apre da sola e la chiave salta fuori
          c.done("ph"); lid.visible = false; keyM.visible = true; let kt = 0; c.anim((dt) => { if (kt > 2) return; kt += dt; keyM.position.y = 1.1 + Math.min(1, kt * 2) * 0.35; keyM.rotation.y += dt * 6; });
          c.give({ id: "chiave", name: "Chiave del laboratorio", icon: "🗝️", desc: "Era nella cappa" });
          c.prof("Esperimento riuscito! Acido, neutro e basico: sei un vero chimico. La cappa si è aperta e c'era la chiave: puoi uscire!");
        } });
    });
    c.place(P.flask(0x66bb6a), -2.8, -5.2, 0, { y: 0.95, solid: false }); c.place(P.flask(0xab47bc), -1.0, -2.0, 0, { y: 0.95, solid: false });
    // la cappa chiusa con lucchetto: si apre quando l'esperimento è completo
    const lid = new THREE.Group(); B(lid, 0, 0, 0, 0.18, 0.22, 0.06, M.yellow); B(lid, 0, 0.16, 0, 0.12, 0.12, 0.03, M.steel);
    c.place(lid, -1.4, -D / 2 + 0.92, 0, { y: 1.1, solid: false });
    const keyM = new THREE.Group(); B(keyM, 0, 0, 0, 0.04, 0.16, 0.015, mat(0xf2c21b, { metal: 0.8, rough: 0.3 })); C(keyM, 0, 0.1, 0, 0.04, 0.015, mat(0xf2c21b, { metal: 0.8, rough: 0.3 }), 0.04, 16).rotation.x = Math.PI / 2;
    keyM.visible = false; c.place(keyM, -1.4, -D / 2 + 1.0, 0, { y: 1.1, solid: false });
    // --- metà sud: zona teoria con file di tavoli e schermo di proiezione ---
    for (let r = 0; r < 3; r++) for (const x of [-2.8, 1.0]) { c.place(P.table(3.0, 0.6, M.lightwood, M.darkgrey), x, 2.9 + r * 1.5, 0); for (const dx of [-1, 0, 1]) c.place(P.chair(M.black), x + dx * 0.95, 2.4 + r * 1.5, 0); }
    c.place(P.projectionScreen(2.6, 1.6), -0.9, D / 2 - 0.08, PI, { y: 2.1, solid: false });
    c.place(P.table(1.6, 0.7, M.lightwood), -0.9, D / 2 - 1.1, 0);
    c.place(P.locker(), W / 2 - 0.4, D / 2 - 1.8, -PI / 2); c.place(P.locker(), W / 2 - 0.4, D / 2 - 2.75, -PI / 2);
  },
  talk(c) {
    if (!c.isDone("sicurezza")) {
      if (!c.has("camice")) return ["Camice e occhiali sono negli armadi a vetri. Guarda bene sulla parete a sinistra!"];
      return [{ text: "Ottimo, sei protetto! Ora due domande sulla sicurezza.", then: async () => {
        if (await c.puzzle({ type: "quiz", kind: "Quiz della prof", title: "Sicurezza in laboratorio", questions: [
          { q: "Sull'armadio giallo c'è il simbolo della fiamma. Cosa vuol dire?", options: ["Che dentro fa caldo", "Che contiene sostanze infiammabili", "Che è un forno"], correct: 1, explain: "Le sostanze infiammabili prendono fuoco facilmente." },
          { q: "Se una goccia di reagente ti finisce sulla mano, cosa fai?", options: ["Niente, si asciuga", "La pulisco sui vestiti", "Lavo subito con tanta acqua e avviso il prof"], correct: 2, explain: "Acqua abbondante e avvisare subito l'insegnante." },
        ] })) { c.done("sicurezza"); c.prof("Bravissimo! Adesso l'esperimento: nel portaprovette ci sono tre soluzioni misteriose. Versa l'indicatore in ognuna e scopri se è acida, neutra o basica!"); }
      } }];
    }
    if (!c.isDone("ph")) return [`Hai analizzato ${c.tubesDone()} provette su 3. Rosso = acido, verde = neutro, blu = basico!`];
    return ["Ora sai usare un indicatore come un vero chimico. La porta USCITA è aperta!"];
  },
  curiosity: "Nel laboratorio di chimica dell'Othoca si lavora con cappe aspiranti, bilance di precisione e microscopi. Il pH si misura anche negli stagni intorno a Oristano per controllare la salute dell'acqua!",
},
// =====================================================================================
{
  id: "officina", name: "Officina meccanica", indirizzo: "Meccanica, Meccatronica ed Energia", difficulty: 2,
  photos: ["workshop_03", "workshop_09"], cardPhoto: "workshop_03",
  size: [13, 22, 4.6],
  preload: ["foto/tex/work_floor.jpg", "foto/tex/work_ceiling.jpg", "foto/tex/work_signs.jpg"],
  shell: () => ({ floorTex: TEX.tiles("#cfcad0", "#b2acb4", 4), floorPhoto: "foto/tex/work_floor.jpg", floorScale: 1.4, floorBump: 4, ceilPhoto: "foto/tex/work_ceiling.jpg", ceilScale: 2.6, wall: 0xf0e9d6, band: 0xe6dcc0, windows: [{ side: "w", y: 3.75, h: 0.9, from: -0.47, to: 0.47, n: 10 }, { side: "e", y: 3.75, h: 0.9, from: -0.47, to: 0.47, n: 10 }, { side: "s", y: 3.75, h: 0.9, from: -0.45, to: 0.45, n: 5 }, { side: "n", y: 3.75, h: 0.9, from: -0.45, to: 0.45, n: 5 }], lightSX: 3.2, lightSZ: 3.4 }),
  // pianta dalla foto 360°: capannone lungo, porta marrone in fondo, torni lungo la parete ovest, fresatrici e banco a est, CNC e tavoli verdi vicino alla porta a vetri
  spawn: [4.5, 9.2, PI], exit: { side: "n", x: 0, color: 0x6b3f22 }, entry: { side: "s", x: 4.5, color: 0x8a8f96, glass: true },
  teacher: { name: "Prof. Sanna", role: "Tecnologia meccanica", at: [1.8, 4.2], look: { shirt: 0x1d3f74, pants: 0x1d3f74, hair: 0x555555, beard: true, beardColor: 0x8d8d8d, glasses: true, hat: 0x1d3f74 } },
  tasks: [
    { id: "disegno", title: "Il disegno tecnico", step: () => "Calcola la lunghezza del perno dal disegno e impostala sulla CNC",
      hints: ["Sul banco da lavoro c'è un disegno tecnico con delle misure (quote).", "La lunghezza totale L è la somma dei tre tratti del pezzo.", "25 + 40 + 15 = 80 mm. Sulla CNC scrivi 080."] },
    { id: "tornio", title: "Il tornio in sicurezza", step: () => "Avvia il tornio n.1 seguendo le regole di sicurezza",
      hints: ["Prima di accendere una macchina ci si protegge e si controlla il pezzo.", "Le regole sono sul cartello giallo vicino al tornio.", "Ordine: occhiali → pezzo serrato → riparo chiuso → avvio."] },
  ],
  intro: [
    "Benvenuto in officina! Sono il professor Sanna. Qui si trasformano blocchi di metallo in pezzi precisissimi.",
    "Mi serve un perno per una macchina. Il disegno tecnico è sul banco da lavoro: calcola la lunghezza e impostala sulla fresatrice CNC.",
    "E poi avvia il tornio numero 1… ma in sicurezza! Le regole sono sul cartello giallo.",
  ],
  build(c) {
    const { W, D } = c;
    // torni lungo la parete ovest, su pedane di legno
    [-7, -3.6, -0.2, 3.2].forEach((z, i) => { c.place(P.pallet(1.0, 2.2), -3.75, z, 0, { solid: false }); const l = c.place(P.lathe(), -4.6, z, PI / 2); if (i === 0) c.lathe1 = l; });
    // fresatrici universali, trapano e banco a est
    c.place(P.mill(), W / 2 - 1.0, -6.2, -PI / 2); c.place(P.pallet(0.9, 1.4), W / 2 - 1.85, -6.2, 0, { solid: false });
    c.place(P.mill(), W / 2 - 1.0, -2.6, -PI / 2); c.place(P.pallet(0.9, 1.4), W / 2 - 1.85, -2.6, 0, { solid: false });
    c.place(P.drillPress(), W / 2 - 0.6, -9.2, -PI / 2);
    c.place(P.toolCabinet(mat(0xd8cdb4)), W / 2 - 0.45, 3.4, -PI / 2); c.place(P.toolCabinet(mat(0xd8cdb4)), W / 2 - 0.45, 4.3, -PI / 2);
    // CNC contro la parete sud e tavoli verdi della zona teoria
    const cncM = c.place(P.cnc(), 0.4, D / 2 - 0.7, PI);
    c.place(P.cnc(), -3.6, D / 2 - 0.7, PI);
    for (const [x, z] of [[-1.6, 6.6], [1.2, 6.6], [-1.6, 4.9]]) { c.place(P.table(2, 0.8, mat(0x3f9d6a)), x, z, 0); c.place(P.chair(M.lightwood), x - 0.5, z + 0.7, PI); c.place(P.chair(M.lightwood), x + 0.5, z + 0.7, PI); }
    c.place(P.shelfUnit(M.orange, 1.0, 2.0), -W / 2 + 0.3, 9.6, PI / 2); c.place(P.bin(M.black), -W / 2 + 0.4, 8.4, 0); c.place(P.bin(M.black), -W / 2 + 0.85, 8.4, 0);
    const wbS = new THREE.Group(); B(wbS, 0, 1.0, 0, 0.05, 2.0, 0.05, M.black); B(wbS, 0, 0.03, 0, 0.6, 0.05, 0.6, M.black);
    const wb = P.whiteboard(1.8, 1.1, P.boardTex("offi", [{ t: "TORNITURA", bold: true, underline: true, size: 56 }, { t: "Vc = π · D · n / 1000", gap: 8 }, { t: "tolleranza ± 0,1 mm", color: "#c62828" }, { t: "1. occhiali  2. pezzo  3. riparo  4. avvio", size: 36 }, { t: "Misura due volte, taglia una volta!", color: "#2e7d32", size: 38, gap: 8 }]));
    wb.position.set(0, 1.55, 0.05); wbS.add(wb); c.place(wbS, 3.6, 7.2, -PI / 2);
    // cartelli veri presi dalla foto sulla parete est
    const st = P.photoTex("foto/tex/work_signs.jpg"); plane(c.scene, W / 2 - 0.02, 2.4, -4.4, 2.2, 0.6, new THREE.MeshStandardMaterial({ map: st, roughness: 0.6, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 0.2 }), -PI / 2);
    // banco da lavoro con il disegno tecnico
    c.place(P.workbench(2.4), W / 2 - 0.45, 0.8, -PI / 2);
    const dr = P.drawingTex();
    const sheet = c.place(P.poster(dr, 0.5, 0.36, false), W / 2 - 0.7, 0.8, -PI / 2, { y: 0.93, solid: false }); sheet.children[0].rotation.x = -PI / 2.3;
    c.interact(sheet, { label: "Guarda il disegno tecnico", point: new THREE.Vector3(W / 2 - 1.5, 0, 0.8), range: 2.3, use: () => c.canvasDoc("Disegno tecnico del perno", dr.image, "Le quote sono in millimetri. Quanto è lungo il pezzo in tutto?") });
    c.interact(cncM, { label: "Pannello della CNC", point: new THREE.Vector3(0.4, 0, D / 2 - 1.9), range: 2.4, when: () => !c.isDone("disegno"),
      use: async () => { if (await c.puzzle({ type: "code", title: "Fresatrice CNC", body: `<p>Programma: <b>PERNO Ø30</b>. Inserisci la lunghezza totale <b>L</b> in millimetri (3 cifre).</p>`, answer: "080", okText: "Lunghezza impostata: la CNC lavora il pezzo!" })) { c.done("disegno"); c.give({ id: "perno", name: "Perno grezzo", icon: "🔩", desc: "Uscito dalla CNC" }); c.prof("80 millimetri, esatto! Una misura sbagliata e il pezzo andava buttato."); } } });
    const sign = canvasTex("regoletornio", 400, 520, (g, w, h) => { g.fillStyle = "#f2c21b"; g.fillRect(0, 0, w, h); g.fillStyle = "#111"; g.font = "800 34px Inter"; g.textAlign = "center"; g.fillText("⚠ TORNIO", w / 2, 56); g.font = "600 26px Inter"; g.textAlign = "left"; ["1. Indossa gli occhiali", "2. Serra bene il pezzo", "3. Chiudi il riparo", "4. Avvia il motore"].forEach((t, i) => g.fillText(t, 30, 130 + i * 90)); });
    const sg = c.place(P.poster(sign, 0.5, 0.65), -W / 2 + 0.05, -9.0, PI / 2, { y: 1.7, solid: false });
    c.interact(sg, { label: "Leggi il cartello di sicurezza", point: new THREE.Vector3(-W / 2 + 1.0, 0, -9.0), range: 2.6, use: () => c.canvasDoc("Regole del tornio", sign.image) });
    c.interact(c.lathe1, { label: "Tornio n.1", point: new THREE.Vector3(-3.5, 0, -7), range: 2, when: () => !c.isDone("tornio"),
      use: async () => {
        if (await c.puzzle({ type: "sequence", title: "Avvio del tornio n.1", body: `<p>Esegui le operazioni nell'ordine giusto.</p>`, items: [
          { label: "Avvia il motore", icon: "▶️", color: "#2e7d32" }, { label: "Chiudi il riparo", icon: "🛡️", color: "#1565c0" }, { label: "Indossa gli occhiali", icon: "🥽", color: "#6a1b9a" }, { label: "Serra il pezzo", icon: "🔧", color: "#ef6c00" }], answer: [2, 3, 1, 0], okText: "Il tornio gira in sicurezza!" })) {
          const piece = new THREE.Group(); const wp = C(piece, 0.22, 0, 0, 0.05, 0.45, mat(0xc9ccd0, { metal: 0.9, rough: 0.25 }), 0.05, 20); wp.rotation.z = Math.PI / 2; C(piece, 0, 0, 0, 0.14, 0.13, M.steel, 0.14, 20).rotation.z = Math.PI / 2;
          piece.position.set(-0.5, 1.28, 0); c.lathe1.add(piece);
          const sparks = []; for (let i = 0; i < 40; i++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 3), new THREE.MeshBasicMaterial({ color: 0xffb347 })); sp.visible = false; c.lathe1.add(sp); sparks.push({ sp, v: new THREE.Vector3(), life: 0 }); }
          let tt = 0; c.anim((dt) => { if (tt > 5) return; tt += dt; piece.rotation.x += dt * 40 * Math.min(1, tt) * (tt > 4 ? (5 - tt) : 1); for (const s2 of sparks) { if (s2.life <= 0 && tt < 4 && Math.random() < 0.3) { s2.life = 0.4; s2.sp.visible = true; s2.sp.position.set(-0.1 + Math.random() * 0.3, 1.28, 0.06); s2.v.set((Math.random() - 0.5) * 1.5, Math.random() * 1.5, 1 + Math.random() * 1.5); } if (s2.life > 0) { s2.life -= dt; s2.v.y -= 6 * dt; s2.sp.position.addScaledVector(s2.v, dt); if (s2.life <= 0) s2.sp.visible = false; } } });
          sfx.door();
          c.done("tornio"); c.prof("Senti come gira? Così si lavora: sicurezza prima, poi la macchina. Complimenti!");
        }
      } });
  },
  talk(c) {
    if (!c.isDone("disegno")) return ["Il disegno è sul banco da lavoro, sulla parete delle fresatrici. Somma le quote!"];
    if (!c.isDone("tornio")) return ["Ora il tornio n.1, il primo della fila verso la porta marrone. Leggi prima il cartello giallo."];
    return ["Ottimo lavoro, sei un piccolo tecnico meccanico! La porta è aperta."];
  },
  curiosity: "Nell'officina dell'Othoca ci sono torni, fresatrici e macchine CNC a controllo numerico: si impara a leggere il disegno tecnico e a programmare le macchine, come nelle industrie vere.",
},
// =====================================================================================
{
  id: "pneumatica", name: "Laboratorio di Pneumatica", indirizzo: "Meccatronica · Automazione", difficulty: 2,
  photos: ["pneumatics_03", "pneumatics_05"], cardPhoto: "pneumatics_05",
  size: [12, 9, 3.2],
  preload: ["foto/tex/pneu_floor.jpg", "foto/tex/pneu_window.jpg", "foto/tex/pneu_panel_red.jpg", "foto/tex/pneu_panel_white.jpg"],
  shell: () => ({ floorTex: TEX.tiles("#e2d3c8", "#cdbcb0", 3), floorPhoto: "foto/tex/pneu_floor.jpg", floorScale: 1.15, floorBump: 3, windowPhoto: "foto/tex/pneu_window.jpg", wall: 0xf7f5f1, ceil: 0xf4f2ee, windows: [{ side: "n", y: 1.7, h: 1.4, from: -0.15, to: 0.15, n: 2 }, { side: "e", y: 1.7, h: 1.4, from: -0.12, to: 0.12, n: 1 }], lightSX: 3, lightSZ: 2.6 }),
  spawn: [1.6, 2.9, PI], exit: { side: "s", x: 1.6, color: 0x2f4f3f, glass: true }, entry: null,
  teacher: { name: "Prof.ssa Pinna", role: "Sistemi e automazione", at: [2.8, 2.2], look: { female: true, shirt: 0x26806f, pants: 0x2b2f3a, hair: 0x1f1a17, hairLong: true, glasses: true, necklace: 0xc0c0c0 } },
  tasks: [
    { id: "schema", title: "Collega il circuito", step: () => "Collega i tubi del pannello seguendo lo schema",
      hints: ["Sulla lavagna bianca è appeso lo schema pneumatico.", "L'aria parte dal compressore e arriva al cilindro passando da filtro e valvola.", "Compressore → Filtro, Filtro → Valvola 5/2, Valvola 5/2 → Cilindro."] },
    { id: "ciclo", title: "Avvia il nastro", step: () => "Rispondi alla prof e avvia il ciclo del nastro trasportatore",
      hints: ["Il nastro trasportatore è vicino alla finestra.", "Un cilindro pneumatico si muove grazie all'aria compressa.", "Risposte: aria compressa · decide dove va l'aria."] },
  ],
  intro: [
    "Ciao! Sono la professoressa Pinna. Qui studiamo l'automazione: macchine che si muovono da sole con aria compressa e sensori.",
    "Il pannello didattico grande è scollegato. Lo schema è appeso alla lavagna: collega i tubi nell'ordine giusto.",
    "Poi avviamo il nastro trasportatore. Ti farò due domande prima di premere START!",
  ],
  build(c) {
    const { W, D } = c;
    const main = c.place(P.pneumaticPanel("foto/tex/pneu_panel_red.jpg"), -1.4, -D / 2 + 0.6, 0);
    c.place(P.pneumaticPanel("foto/tex/pneu_panel_white.jpg"), 2.0, -D / 2 + 0.6, 0);
    c.place(P.pneumaticPanel(), -W / 2 + 0.7, 0.8, PI / 2);
    c.place(P.table(1.8, 0.8, mat(0x8c8f62)), 1.6, 0.2, 0); c.place(P.monitor(true), 1.6, 0.1, 0, { y: 0.76, solid: false }); c.place(P.chair(M.orange), 1.6, 0.9, PI);
    c.place(P.table(1.8, 0.8, mat(0x8c8f62)), -1.8, 0.6, 0); c.place(P.chair(M.orange), -1.8, 1.3, PI);
    c.place(P.compressor(), 4.6, -3.6, 0);
    const conv = c.place(P.conveyor(), W / 2 - 0.6, 0.4, PI / 2);
    const box = new THREE.Group(); B(box, 0, 0, 0, 0.22, 0.18, 0.22, mat(0xc49a6c)); c.place(box, W / 2 - 0.6, -0.1, 0, { y: 0.88, solid: false }); c.boxOnBelt = box;
    c.place(P.toolCabinet(M.blue), -W / 2 + 0.5, 3.6, PI / 2);
    c.place(P.bin(M.black), 4.8, 3.6, 0);
    const sch = P.schemaTex();
    const wbd = c.place(P.whiteboard(1.6, 1.0, sch), -2.6, D / 2 - 0.05, PI, { y: 1.6, solid: false });
    c.interact(wbd, { label: "Guarda lo schema pneumatico", point: new THREE.Vector3(-2.6, 0, D / 2 - 1), range: 2.4, use: () => c.canvasDoc("Schema pneumatico", sch.image) });
    c.interact(main, { label: "Collega i tubi del pannello", point: new THREE.Vector3(-1.4, 0, -D / 2 + 1.5), range: 2.2, when: () => !c.isDone("schema"),
      use: async () => { if (await c.puzzle({ type: "wiring", title: "Pannello pneumatico", body: `<p>Da dove a dove va l'aria? Collega ogni componente al successivo.</p>`, left: ["Compressore", "Filtro", "Valvola 5/2"], right: ["Cilindro", "Filtro", "Valvola 5/2"], pairs: { 0: 1, 1: 2, 2: 0 }, okText: "Pssst! L'aria arriva al cilindro." })) { c.done("schema"); c.prof("Perfetto, il circuito è chiuso! Ora vieni al nastro trasportatore."); } } });
    c.interact(conv, { label: "Pulsante START del nastro", point: new THREE.Vector3(W / 2 - 1.5, 0, 0.4), range: 2.2, when: () => !c.isDone("ciclo"),
      use: async () => {
        if (!c.isDone("schema")) { c.toast("Il nastro non parte: il pannello pneumatico è ancora scollegato."); sfx.bad(); return; }
        if (await c.puzzle({ type: "quiz", kind: "Domande della prof", title: "Prima di avviare", questions: [
          { q: "Cosa fa muovere un cilindro pneumatico?", options: ["L'aria compressa", "Una molla di gomma", "L'acqua"], correct: 0, explain: "L'aria in pressione spinge il pistone." },
          { q: "A cosa serve la valvola 5/2?", options: ["A fare rumore", "A decidere dove va l'aria (fuori o dentro il cilindro)", "A raffreddare il motore"], correct: 1, explain: "Comanda l'uscita e il rientro del cilindro." },
        ] })) { c.done("ciclo"); c.beltOn = true; c.prof("Guarda il pacco che scorre! Hai appena automatizzato una linea di produzione."); }
      } });
    c.anim((dt) => { if (c.beltOn && c.boxOnBelt) { c.boxOnBelt.position.z += dt * 0.4; if (c.boxOnBelt.position.z > 0.9) c.boxOnBelt.position.z = -0.1; } });
  },
  talk(c) {
    if (!c.isDone("schema")) return ["Lo schema è sulla lavagna bianca. L'aria parte sempre dal compressore!"];
    if (!c.isDone("ciclo")) return ["Ora il pulsante START sul nastro trasportatore, vicino alla finestra."];
    return ["Benvenuto nel mondo della meccatronica! La porta verde è aperta."];
  },
  curiosity: "Con la pneumatica e i PLC si costruiscono linee automatiche: bracci che afferrano, nastri che smistano, robot che assemblano. È il cuore dell'Industria 4.0 che si studia in Meccatronica.",
},
// =====================================================================================
{
  id: "zoomate", name: "Museo ZooMate", indirizzo: "Scienze naturali · Liceo Scienze Applicate", difficulty: 1,
  photos: ["zoomate_03", "zoomate_08"], cardPhoto: "zoomate_03",
  size: [16, 11, 3.4],
  shell: () => ({ floorTex: TEX.tiles("#e6dcc4", "#ddd2b8", 2), floorScale: 3, floorRough: 0.35, wall: 0xf7f7f3, ceil: 0xf4f2ec, windows: [{ side: "n", y: 2.9, h: 0.5, from: 0.15, to: 0.45, n: 3 }], lightSX: 3.2, lightSZ: 2.8 }),
  spawn: [-6.0, 3.0, PI], exit: { side: "e", z: -3.2, color: 0x2d6fc4, glass: true }, entry: { side: "s", x: -6.4, color: 0x8a4b20 },
  teacher: { name: "Dott.ssa Serra", role: "Guida del museo", at: [0.5, 3], look: { female: true, shirt: 0x2e8b57, pants: 0x3a3a40, hair: 0xb07040, hairLong: true, scarf: 0xf2c21b } },
  tasks: [
    { id: "uccelli", title: "Riconosci gli uccelli", step: () => "Guarda le tre foto numerate e abbinale ai nomi sul tavolo touch",
      hints: ["Le foto numerate (1, 2, 3) sono appese alle pareti del museo.", "Il tavolo touch spiega come riconoscerli: il fenicottero è rosa, l'airone bianco col collo lungo, la folaga nera con il becco bianco.", "Foto 1 = Airone bianco, Foto 2 = Folaga, Foto 3 = Fenicottero rosa."] },
    { id: "catena", title: "La catena dello stagno", step: () => "Ricostruisci la catena alimentare sugli schermi interattivi",
      hints: ["Ogni essere vivente mangia quello che viene prima nella catena.", "Tutto parte dal Sole, che fa crescere le alghe.", "Sole → Alghe → Artemia (gamberetti) → Fenicottero."] },
  ],
  intro: [
    "Benvenuto al ZooMate, il museo interattivo sugli animali delle zone umide! Sono la dottoressa Serra.",
    "Negli stagni vicino a Oristano vivono migliaia di uccelli. Riesci a riconoscere quelli nelle tre foto numerate?",
    "Il tavolo touch ti aiuta. Quando li hai riconosciuti, usa gli schermi per ricostruire la catena alimentare dello stagno.",
  ],
  build(c) {
    const { W, D } = c;
    // fascia azzurra alta come nelle foto
    for (const [x, z, w, d] of [[0, -D / 2 + 0.02, W, 0.04], [-W / 2 + 0.02, 0, 0.04, D]]) B(c.scene, x, 3.05, z, w, 0.5, d, M.teal, false);
    c.place(P.partition(3, 2.6), -2, -0.8, 0, { cam: true }); c.place(P.partition(2.4, 2.6), 3.6, -1.6, PI / 2, { cam: true });
    const s1 = c.place(P.museumScreen(M.orange), -5, -D / 2 + 0.15, 0);
    const s2 = c.place(P.museumScreen(mat(0x1f8a4c)), 1.2, -D / 2 + 0.15, 0); void s1;
    for (const [x, z] of [[-3.2, -D / 2 + 0.4], [-0.6, -D / 2 + 0.4], [4.6, 4.8]]) c.place(P.reeds(), x, z, 0);
    for (let i = 0; i < 4; i++) c.place(P.chair(), -6.4 + i * 0.6, 1.0, 0);
    for (let i = 0; i < 3; i++) c.place(P.chair(), 5.6 + i * 0.6, -4.8, 0);
    const tt = c.place(P.touchTable(), -2, 1.6, 0);
    // foto numerate
    const birds = [["airone", -W / 2 + 0.05, -2.6, PI / 2], ["folaga", -2, -0.74, 0], ["fenicottero", W / 2 - 0.05, 2.2, -PI / 2]];
    const realPhoto = { airone: ["foto/quadri/zoo_airone.jpg", 0.62, 0.9], fenicottero: ["foto/quadri/zoo_fenicottero.jpg", 1.15, 0.8] };
    birds.forEach(([k, x, z, ry], i) => {
      const rp = realPhoto[k];
      const t = rp ? P.photoTex(rp[0]) : P.birdTex(k);
      const g = c.place(rp ? P.photoPanel(rp[0], rp[1], rp[2]) : P.poster(t, 1.1, 0.8), x, k === "folaga" ? z + 0.07 : z, ry, { y: 1.6, solid: false });
      const lbl = textSign("foto" + (i + 1), "FOTO " + (i + 1), { bg: "#f0559a", w: 256, h: 96, font: "bold 52px Inter" });
      plane(g, 0, -(rp ? rp[2] : 0.8) / 2 - 0.15, 0.01, 0.4, 0.15, new THREE.MeshBasicMaterial({ map: lbl }));
      const off = new THREE.Vector3(0, 0, 1.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      c.interact(g, { label: "Guarda la foto " + (i + 1), point: new THREE.Vector3(x + off.x, 0, z + off.z), range: 2.2, use: () => c.canvasDoc("Foto " + (i + 1), t.image, "Che uccello è? Il tavolo touch ti aiuta a riconoscerlo.") });
    });
    // altri quadri decorativi
    c.place(P.photoPanel("foto/quadri/zoo_cavaliere.jpg", 0.95, 0.98, 0xf2c21b), 3.73, -1.6, PI / 2, { y: 1.6, solid: false });
    c.interact(tt, { label: "Usa il tavolo touch", range: 2.2, use: () => c.doc("Guida agli uccelli degli stagni", `<p>🦩 <b>Fenicottero rosa</b>: piume rosa, zampe lunghissime, collo a S. È rosa perché mangia piccoli gamberetti (artemia).</p><p>🤍 <b>Airone bianco</b>: tutto bianco, collo lungo e becco giallo appuntito. Pesca nell'acqua bassa.</p><p>🖤 <b>Folaga</b>: nera, nuota come un'anatra e ha il becco e la fronte <b>bianchi</b>.</p>`) });
    // abbinamento sul tavolo touch e catena sugli schermi
    const pad = new THREE.Group(); B(pad, 0, 0, 0, 0.3, 0.22, 0.04, M.black); plane(pad, 0, 0, 0.021, 0.26, 0.18, mat(0x2f80c0, { emissive: 0x2f80c0, ei: 0.8 }));
    c.place(pad, -1.4, 1.75, -0.6, { y: 0.95, solid: false }); pad.rotation.x = -0.9;
    c.interact(pad, { label: "Abbina foto e nomi", point: new THREE.Vector3(-1.4, 0, 2.4), range: 2, when: () => !c.isDone("uccelli"),
      use: async () => { if (await c.puzzle({ type: "wiring", title: "Chi è chi?", body: `<p>Abbina ogni foto numerata al suo nome.</p>`, left: ["Foto 1", "Foto 2", "Foto 3"], right: ["Fenicottero rosa", "Airone bianco", "Folaga"], pairs: { 0: 1, 1: 2, 2: 0 } })) { c.done("uccelli"); c.prof("Occhio da naturalista! Ora gli schermi: chi mangia chi nello stagno?"); } } });
    c.interact(s2, { label: "Schermo interattivo: catena alimentare", point: new THREE.Vector3(1.2, 0, -D / 2 + 1.2), range: 2.2, when: () => !c.isDone("catena"),
      use: async () => {
        if (!c.isDone("uccelli")) { c.toast("Lo schermo dice: prima riconosci gli uccelli delle foto!"); return; }
        if (await c.puzzle({ type: "sequence", title: "La catena dello stagno", body: `<p>Tocca gli elementi dal primo all'ultimo della catena alimentare.</p>`, items: [
          { label: "Fenicottero", icon: "🦩", color: "#d81b60" }, { label: "Alghe", icon: "🌿", color: "#2e7d32" }, { label: "Sole", icon: "☀️", color: "#f9a825" }, { label: "Artemia", icon: "🦐", color: "#ef6c00" }], answer: [2, 1, 3, 0], sound: (i) => sfx.note(i) })) {
          c.done("catena"); c.prof("Esatto! Ecco perché i fenicotteri sono rosa: mangiano l'artemia, che è piena di pigmenti rossi.");
        }
      } });
  },
  talk(c) {
    if (!c.isDone("uccelli")) return ["Le tre foto numerate sono sulle pareti. Il tavolo touch ti dice come riconoscerli; poi abbinali sul tablet accanto."];
    if (!c.isDone("catena")) return ["Lo schermo verde sulla parete in fondo ti aspetta: chi mangia chi?"];
    return ["Grazie per la visita! La porta azzurra è aperta."];
  },
  curiosity: "ZooMate è un museo interattivo ospitato all'Othoca, dedicato alla fauna delle zone umide dell'Oristanese: gli stagni di Cabras e Santa Giusta ospitano migliaia di fenicotteri rosa.",
},
// =====================================================================================
{
  id: "informatica", name: "Laboratorio di Informatica", indirizzo: "Informatica e Telecomunicazioni", difficulty: 2,
  photos: ["informatics_02", "informatics_01"], cardPhoto: "informatics_02",
  size: [13, 10, 3.1],
  preload: ["foto/tex/info_window.jpg", "foto/tex/info_cabinet.jpg", "foto/tex/info_shelves.jpg"],
  shell: () => ({ floorTex: TEX.tiles("#e0d4c6", "#ccbfb0", 3), floorScale: 1.8, windowPhoto: "foto/tex/info_window.jpg", wall: 0xc9dedd, ceil: 0xf2f0ea, windows: [{ side: "n", y: 1.75, h: 1.3, from: -0.42, to: -0.22, n: 1 }, { side: "n", y: 1.75, h: 1.3, from: 0.25, to: 0.45, n: 1 }, { side: "e", y: 1.75, h: 1.3, from: -0.3, to: 0.3, n: 2 }] }),
  spawn: [-5, 2.8, PI], exit: { side: "w", z: -3, color: 0x2f5f4a }, entry: { side: "s", x: -5, color: 0x2f5f4a },
  teacher: { name: "Prof. Mocci", role: "Informatica", photo: "foto/prof/mocci.jpg", face: "foto/prof/face_mocci.png", at: [3.4, 3.2], look: { shirt: 0xf4f6fa, coat: 0x262c3d, tie: 0x8a1c2e, pants: 0x262c3d, hair: 0x2a221c, shoes: 0x15151a, sole: 0x15151a, skinTone: 0xcf977f } },
  tasks: [
    { id: "password", title: "Il PC bloccato", step: () => "Trova la password e sblocca il PC del prof",
      hints: ["Chi dimentica la password la scrive su un post-it… guarda vicino ai portatili.", "Il post-it giallo è sul tavolo esagonale più vicino alla porta. Leggi bene: al contrario!", "OTHOCA al contrario è ACOHTO. Scrivila nel terminale del PC del prof."] },
    { id: "stampa", title: "Stampa la chiave in 3D", step: (c) => c.isDone("password") ? "Programma la stampante 3D e ritira la chiave" : "Prima sblocca il PC del prof",
      hints: ["Una stampante 3D prima riceve il file, poi si scalda, poi stampa.", "Il pezzo va raffreddato prima di staccarlo dal piatto.", "Ordine: Carica il file → Scalda l'ugello → Stampa strato per strato → Raffredda e stacca."] },
  ],
  intro: [
    "Ehi, benvenuto nel laboratorio B09! Sono il professor Mocci.",
    "Ho un problema: ho chiuso la porta e la chiave… è un file! Va stampata con la stampante 3D, ma il mio PC è bloccato e non ricordo la password.",
    "Di solito me la scrivo da qualche parte. Aiutami a sbloccare il PC e poi a programmare la stampante!",
  ],
  build(c) {
    const { W, D } = c;
    B(c.scene, W / 2 - 0.02, 1.55, 0, 0.04, 3.1, D, mat(0xb9d7d6), false); // parete azzurra
    c.place(P.hexTable(), -3, -1.2, 0); c.place(P.hexTable(), 1.2, -1.6, 0.3); c.place(P.hexTable(), 1.4, 2.0, 0);
    c.place(P.tv(1.2, null, false), -1.2, -D / 2 + 0.06, 0, { y: 1.7, solid: false }); c.place(P.tv(1.2, null, false), 2.6, D / 2 - 0.06, PI, { y: 1.7, solid: false });
    c.place(P.photoBox("foto/tex/info_cabinet.jpg", 0.78, 2.05, 0.5, M.orange), -W / 2 + 0.3, 0.6, PI / 2); c.place(P.photoBox("foto/tex/info_shelves.jpg", 1.6, 0.86, 0.45, M.white), 4.55, -D / 2 + 0.28, 0);
    c.place(P.locker(), 2.6, -D / 2 + 0.3, 0);
    c.place(P.sofa(), W / 2 - 0.5, 3.2, -PI / 2);
    c.place(P.whiteboard(1.6, 1.0, P.boardTex("info", [{ t: "ALGORITMO", bold: true, underline: true, size: 54 }, { t: "= passi giusti nell'ordine giusto", size: 38 }, { t: "if (password == ok) {", color: "#2e7d32", gap: 12, size: 40 }, { t: "    apri();", color: "#2e7d32", size: 40 }, { t: "}", color: "#2e7d32", size: 40 }, { t: "Stampa 3D: file → calore → strati", color: "#c62828", size: 36 }])), -W / 2 + 0.05, 3.0, PI / 2, { y: 1.6, solid: false });
    // banco del prof con PC
    c.place(P.table(1.6, 0.75, M.lightwood, M.darkgrey), -1.8, 3.8, 0);
    const pc = c.place(P.monitor(true), -1.8, 3.7, PI, { y: 0.76, solid: false }); c.place(P.chair(M.blue), -1.8, 3.1, 0);
    // stampanti 3D
    c.place(P.table(1.8, 0.7, M.lightwood), 4.6, 0.6, -PI / 2);
    const pr = c.place(P.printer3D(), 4.7, 0.2, -PI / 2, { y: 0.76, solid: false }); c.place(P.printer3D(), 4.7, 1.1, -PI / 2, { y: 0.76, solid: false });
    // post-it
    const pi = c.place(P.postIt("password:\nOTHOCA\nal contrario!"), -3, -0.55, 0, { y: 0.78, solid: false }); pi.rotation.x = -PI / 2;
    c.interact(pi, { label: "Leggi il post-it", point: new THREE.Vector3(-3, 0, 0.3), range: 1.9, use: () => c.doc("Post-it giallo", `<p style="font:600 26px 'Baloo 2';text-align:center">password:<br><b>OTHOCA</b><br>al contrario!</p>`) });
    c.interact(pc, { label: "PC del prof", point: new THREE.Vector3(-1.8, 0, 3.0), range: 1.8, when: () => !c.isDone("password"),
      use: async () => { if (await c.puzzle({ type: "terminal", title: "PC del prof · login", intro: ["OthocaOS 4.2 — accesso riservato", "Utente: prof.deiana", "Digita la password e premi Invio. (digita 'aiuto' se serve)"],
        run: (v, print) => { if (v === "acohto") { print("Accesso consentito. Benvenuto, prof!", "#7dff9b"); return true; } if (v === "aiuto" || v === "help") { print("Promemoria: la password è scritta su un post-it giallo."); return false; } if (v === "othoca") { print("Quasi! Leggi bene il post-it…", "#ffd54f"); return false; } print("Password errata.", "#ff8a8a"); return false; } })) {
        c.done("password"); c.prof("Sei un hacker buono! Ora sulla stampante 3D c'è il file della chiave: programmala tu.");
      } } });
    c.interact(pr, { label: "Stampante 3D", point: new THREE.Vector3(3.8, 0, 0.2), range: 1.9, when: () => !c.has("chiave3d"),
      use: async () => {
        if (!c.isDone("password")) { c.toast("La stampante dice: 'In attesa di un file dal PC del prof'."); return; }
        if (await c.puzzle({ type: "blocks", title: "Programma la stampante 3D", body: `<p>Metti i comandi in ordine per stampare <b>chiave.stl</b>.</p>`, blocks: [
          { t: "Scalda l'ugello a 200 °C", color: "#e53935" }, { t: "Carica il file chiave.stl", color: "#1e88e5" }, { t: "Stampa strato per strato", color: "#43a047" }, { t: "Raffredda e stacca il pezzo", color: "#8e24aa" }], answer: [1, 0, 2, 3] })) {
          c.give({ id: "chiave3d", name: "Chiave stampata in 3D", icon: "🔑", desc: "Rosa Othoca, ancora tiepida" }); c.done("stampa"); c.prof("Ecco la chiave! Con un programma ben ordinato si costruisce di tutto.");
        }
      } });
  },
  talk(c) {
    if (!c.isDone("password")) return ["Mi sa che ho lasciato un post-it su uno dei tavoli esagonali… cercalo!"];
    if (!c.isDone("stampa")) return ["La stampante 3D è sul tavolo vicino alla parete azzurra. Pensa all'ordine dei comandi!"];
    return ["Grande! In informatica un algoritmo è proprio questo: passi giusti, nell'ordine giusto. Vai pure!"];
  },
  curiosity: "Nell'indirizzo Informatica e Telecomunicazioni si impara a programmare, a costruire reti e siti, e a usare stampanti 3D e robot. Il laboratorio B09 ha i tavoli a esagono per lavorare in squadra.",
},
// =====================================================================================
{
  id: "aula", name: "Aula classica", indirizzo: "Materie comuni", difficulty: 1,
  photos: ["classroom_01"], cardPhoto: "classroom_01",
  size: [9, 7.5, 3.1],
  preload: ["foto/tex/class_window.jpg"],
  shell: () => ({ floorTex: TEX.tiles("#e2d6c8", "#cdbfb0", 3), floorScale: 1.8, windowPhoto: "foto/tex/class_window.jpg", wall: 0xf7f5f0, ceil: 0xf3f1eb, windows: [{ side: "w", y: 1.7, h: 1.6, from: -0.42, to: -0.08, n: 1 }, { side: "w", y: 1.7, h: 1.6, from: 0.02, to: 0.36, n: 1 }] }),
  spawn: [3.3, -2.5, -PI / 2], exit: { side: "e", z: -2.6, color: 0x2f5f4a, glass: true }, entry: null,
  teacher: { name: "Prof.ssa Martini", role: "Lettere e Matematica", photo: "foto/prof/martini.jpg", face: "foto/prof/face_martini.png", at: [-3.9, -2.2], look: { female: true, shirt: 0xf3e9dc, coat: 0x1c1c1f, pants: 0x2b2f3a, hair: 0xc98a4e, hairStyle: "curly", skinTone: 0xd6a08a, necklace: 0xd4a017 } },
  tasks: [
    { id: "verifica", title: "La verifica a sorpresa", step: (c) => `Trova le 2 domande nascoste nell'aula (${c.digits()}/2)`,
      hints: ["Le domande sono sulla lavagna e su un libro.", "La lavagna è accanto alla LIM, il libro rosso è su un banco in mezzo all'aula.", "Le cifre sono: Matematica 6 · Italiano 3."] },
    { id: "cassetto", title: "Il cassetto della cattedra", step: () => "Apri il cassetto della cattedra con le 2 cifre",
      hints: ["Sul registro c'è scritto l'ordine delle materie.", "Ordine: prima Matematica, poi Italiano.", "Il codice è 63."] },
  ],
  intro: [
    "Buongiorno! Sono la professoressa Martini. Oggi… verifica a sorpresa!",
    "Non preoccuparti, è facile: in quest'aula ho nascosto due domande, una di matematica e una di italiano. Ogni risposta giusta ti dà una cifra.",
    "Con le due cifre apri il cassetto della cattedra: dentro c'è la chiave dell'aula. L'ordine delle materie è scritto sul registro.",
  ],
  build(c) {
    const { W, D } = c;
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) c.place(P.schoolDesk(), -2.7 + k * 1.5, -0.6 + r * 1.35, 0);
    const desk = c.place(P.teacherDesk(), -2.5, -2.9, PI);
    c.place(P.chair(M.black), -2.5, -3.4, 0);
    c.place(P.lim(P.boardTex("lim", [{ t: "Benvenuti in 1ª A!", bold: true, size: 64, color: "#c2185b" }, { t: "Oggi: VERIFICA A SORPRESA", bold: true, underline: true, gap: 10 }, { t: "Matematica · Italiano", size: 38 }, { t: "Niente panico: 4 domande, 4 cifre :)", color: "#2e7d32", size: 40, gap: 10 }], { bg: "#ffffff" })), -1.0, -D / 2 + 0.05, 0, { y: 1.55, solid: false });
    c.place(P.locker(), -W / 2 + 0.3, 3.2, PI / 2);
    c.place(P.bin(M.blue), W / 2 - 0.35, D / 2 - 0.4, 0); c.place(P.bin(M.yellow), W / 2 - 0.75, D / 2 - 0.4, 0);
    // attaccapanni in legno lungo la parete est e sud, come nella foto
    B(c.scene, W / 2 - 0.03, 1.8, 1.4, 0.04, 0.09, 3.4, M.lightwood, false); for (let i = 0; i < 9; i++) B(c.scene, W / 2 - 0.07, 1.76, -0.1 + i * 0.38, 0.06, 0.05, 0.03, M.black, false);
    B(c.scene, -1.6, 2.15, D / 2 - 0.03, 4.4, 0.09, 0.04, M.lightwood, false); for (let i = 0; i < 11; i++) B(c.scene, -3.6 + i * 0.4, 2.11, D / 2 - 0.07, 0.03, 0.05, 0.06, M.black, false);
    const digits = c.state.digits = c.state.digits || {};
    const found = (subj, d) => { if (digits[subj]) return; digits[subj] = d; c.toast(`Cifra trovata · ${subj}: ${d}`); c.refresh(); if (Object.keys(digits).length === 2) { c.done("verifica"); c.prof("Hai tutte e due le cifre! Ora apri il cassetto della cattedra."); } };
    c.digits = () => Object.keys(digits).length;
    const quizAt = (obj, point, subj, q, options, correct, d, label) => c.interact(obj, { label, point, range: 2.2, when: () => !digits[subj],
      use: async () => { if (await c.puzzle({ type: "quiz", kind: subj, title: "Domanda di " + subj, questions: [{ q, options, correct }] })) found(subj, d); } });
    const wbTex = canvasTex("lavagnaMat", 600, 360, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#1a237e"; g.font = "700 48px 'Comic Sans MS', cursive"; g.fillText("7 × 8 − 50 = ?", 70, 150); g.font = "500 28px Inter"; g.fillText("MATEMATICA", 70, 60); });
    const wb = c.place(P.whiteboard(1.6, 1.0, wbTex), 1.4, -D / 2 + 0.05, 0, { y: 1.5, solid: false });
    quizAt(wb, new THREE.Vector3(1.4, 0, -D / 2 + 1.1), "Matematica", "Quanto fa 7 × 8 − 50?", ["4", "6", "16"], 1, 6, "Domanda sulla lavagna");
    const mp = P.mapTex();
    const map = c.place(P.poster(mp, 1.2, 0.85), -1.2, D / 2 - 0.05, PI, { y: 1.45, solid: false });
    void map; if (false) quizAt(map, new THREE.Vector3(-1.2, 0, D / 2 - 1.1), "Storia", "Othoca, la città antica che dà il nome alla scuola, fu fondata dai Fenici. In che secolo, circa?", ["VIII secolo a.C.", "XV secolo d.C.", "Nel 1990"], 0, 8, "Domanda sulla cartina");
    const book = new THREE.Group(); B(book, 0, 0, 0, 0.3, 0.05, 0.22, mat(0xc62828)); B(book, 0.005, 0, 0, 0.28, 0.045, 0.21, M.white);
    c.place(book, 0.3, 0.75, 0.3, { y: 0.79, solid: false });
    quizAt(book, null, "Italiano", "Quante sillabe ha la parola O-THO-CA?", ["2", "3", "4"], 1, 3, "Libro di italiano");
    const engTex = canvasTex("english", 400, 520, (g, w, h) => { g.fillStyle = "#e3f2fd"; g.fillRect(0, 0, w, h); g.fillStyle = "#0d47a1"; g.font = "800 44px Inter"; g.textAlign = "center"; g.fillText("ENGLISH", w / 2, 70); g.font = "600 30px Inter"; ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].forEach((d, i) => g.fillText(d, w / 2, 130 + i * 52)); });
    const eng = c.place(P.poster(engTex, 0.6, 0.78), 2.2, D / 2 - 0.05, PI, { y: 1.6, solid: false });
    void eng; if (false) quizAt(eng, new THREE.Vector3(2.2, 0, D / 2 - 1.1), "Inglese", "How many days are there in a week?", ["Five", "Seven", "Ten"], 1, 7, "Cartellone di inglese");
    const reg = new THREE.Group(); B(reg, 0, 0, 0, 0.32, 0.04, 0.24, mat(0x1565c0)); c.place(reg, -2.1, -2.85, 0.2, { y: 0.79, solid: false });
    c.interact(reg, { label: "Leggi il registro", point: new THREE.Vector3(-2.1, 0, -2.1), range: 1.8, use: () => c.doc("Registro di classe", `<p>Nota della prof: <i>il cassetto si apre con le cifre in quest'ordine:</i></p><p style="font-size:20px"><b>1. Matematica · 2. Italiano</b></p>`) });
    c.interact(desk, { label: "Cassetto della cattedra", point: new THREE.Vector3(-3.0, 0, -2.0), range: 1.6, when: () => !c.isDone("cassetto"),
      use: async () => { if (await c.puzzle({ type: "code", title: "Cassetto della cattedra", body: `<p>Un lucchetto a 2 cifre. ${c.digits() < 2 ? `<span class="muted">Hai trovato ${c.digits()} cifre su 2.</span>` : ""}</p>`, answer: "63" })) { c.done("cassetto"); c.give({ id: "chiaveAula", name: "Chiave dell'aula", icon: "🗝️", desc: "Era nel cassetto" }); c.prof("Dieci e lode! La chiave è tua."); } } });
  },
  talk(c) {
    if (!c.isDone("verifica")) return [`Hai trovato ${c.digits()} cifre su 4. Cerca su lavagna, cartina, libri e cartelloni!`];
    if (!c.isDone("cassetto")) return ["L'ordine delle materie è sul registro, qui sulla cattedra."];
    return ["Verifica superata! Puoi uscire."];
  },
  curiosity: "All'Othoca, accanto ai laboratori, ci sono le materie di tutti: italiano, storia, matematica e inglese. Nelle aule nuove ci sono le LIM, lavagne interattive collegate al computer.",
},
// =====================================================================================
{
  id: "palestra", name: "Palestra", indirizzo: "Scienze motorie", difficulty: 1,
  photos: ["gym_04", "gym_02"], cardPhoto: "gym_04",
  size: [26, 16, 7],
  preload: ["foto/tex/gym_floor.jpg", "foto/tex/gym_ceiling.jpg", "foto/tex/gym_climb.jpg"],
  shell: () => ({ floorTex: TEX.parquet(), floorPhoto: "foto/tex/gym_floor.jpg", floorScale: 1.8, floorBump: 2, ceilPhoto: "foto/tex/gym_ceiling.jpg", ceilScale: 7, floorRough: 0.3, ceilTex: canvasTex("woodceil", 256, 256, (g, w, h) => { g.fillStyle = "#8a5a32"; g.fillRect(0, 0, w, h); g.fillStyle = "#6e4526"; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 6, h); g.fillStyle = "#2c6e66"; g.fillRect(0, 0, w, 10); }), wall: 0xf4f2ee, windows: [{ side: "n", y: 5.6, h: 1.0, from: -0.48, to: 0.48, n: 10 }, { side: "s", y: 5.6, h: 1.0, from: -0.48, to: 0.48, n: 10 }, { side: "e", y: 5.6, h: 1.0, from: -0.4, to: 0.4, n: 5 }], lightSX: 4, lightSZ: 4, lightW: 0.8, lightD: 0.8, sunI: 1.8 }),
  spawn: [-10.5, 5.5, PI * 0.75], exit: { side: "w", z: -4.5, color: 0x8a5a2b, glass: true }, entry: { side: "s", x: -10.5, color: 0x8a5a2b, glass: true },
  teacher: { name: "Prof. Siotto", role: "Scienze motorie", photo: "foto/prof/siotto.jpg", face: "foto/prof/face_siotto.png", at: [-7.5, 4], look: { whistle: true, shirt: 0x24408f, sleeves: "short", pants: 0x1d2433, shoes: 0xf2f2f2, hair: 0x3b3a3a, beard: true, beardColor: 0x9a9893, skinTone: 0xc99580 } },
  tasks: [
    { id: "percorso", title: "Il percorso dei coni", step: (c) => `Tocca i coni nell'ordine della lavagnetta (${c.state.coneStep || 0}/3)`,
      hints: ["L'ordine dei coni è scritto sulla lavagnetta vicino al prof.", "Avvicinati a ogni cono e premi E, uno alla volta.", "Ordine: Giallo → Rosso → Blu."] },
    { id: "palloni", title: "Riordina i palloni", step: (c) => `Metti ogni pallone nel suo carrello (${c.state.balls || 0}/2)`,
      hints: ["Raccogli i palloni sparsi per la palestra (E).", "Il carrello BASKET è per i palloni arancioni, VOLLEY per quelli bianchi e blu.", "C'è un pallone da basket vicino al centro e uno da pallavolo sul lato: portali ai carrelli sotto il canestro."] },
  ],
  intro: [
    "Fischio d'inizio! Sono il professor Siotto. Prima di tutto, riscaldamento!",
    "Fai il percorso dei coni nell'ordine scritto sulla lavagnetta. Se sbagli, si ricomincia!",
    "Poi aiutami a mettere in ordine: i palloni da basket e da pallavolo vanno nei carrelli giusti.",
  ],
  build(c) {
    const { W, D } = c;
    // fascia blu intorno al campo e linee
    const blue = mat(0x1d4fb8, { rough: .35 });
    for (const [x, z, w, d] of [[0, -D / 2 + 1.3, W, 2.6], [0, D / 2 - 1.3, W, 2.6], [-W / 2 + 1.5, 0, 3, D], [W / 2 - 1.5, 0, 3, D]]) plane(c.scene, x, 0.004, z, w, d, blue, 0, -PI / 2);
    const lineM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 1.78, 48), lineM); ring.rotation.x = -PI / 2; ring.position.y = 0.006; c.scene.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.7, 48), blue); disc.rotation.x = -PI / 2; disc.position.y = 0.005; c.scene.add(disc);
    plane(c.scene, 0, 0.006, 0, 0.08, D - 5.2, lineM, 0, -PI / 2);
    c.place(P.hoop(), -W / 2 + 2.2, 0, -PI / 2 + PI, { solid: false }); c.place(P.hoop(), W / 2 - 2.2, 0, PI / 2 - PI, { solid: false });
    c.colliderBox(-W / 2 + 1.1, -0.1, -W / 2 + 1.4, 0.1); c.colliderBox(W / 2 - 1.4, -0.1, W / 2 - 1.1, 0.1);
    for (let i = 0; i < 3; i++) { c.place(P.wallBars(), -W / 2 + 0.1, 3.6 + i * 1.1, PI / 2); c.place(P.wallBars(), W / 2 - 0.1, 3.4 + i * 1.1, -PI / 2); c.place(P.wallBars(), W / 2 - 0.1, -3.4 - i * 1.1, -PI / 2); }
    c.place(P.climbingWall(1.8, 6.4, "foto/tex/gym_climb.jpg"), W / 2 - 0.06, -7.0, -PI / 2);
    { const off = new THREE.Group(); B(off, 0, 1.2, 0, 2.6, 2.4, 1.6, M.glass, false); B(off, 0, 2.42, 0, 2.7, 0.06, 1.7, M.steel); c.place(off, 10.6, D / 2 - 1.0, 0); c.place(P.table(1.4, 0.6, M.white), 10.6, D / 2 - 1.0, 0, { solid: false }); }
    c.place(P.chalkboard(1.6, 1.0, P.boardTex("gymboard", [{ t: "SCIENZE MOTORIE", bold: true, size: 56, color: "#ffffff" }, { t: "Riscaldamento: 5 min", color: "#fdd835", gap: 8 }, { t: "Fair play sempre!", color: "#81c784" }, { t: "Basket · Volley · Arrampicata", color: "#90caf9", size: 38 }], { bg: "#1f3b2c", chalk: true })), -W / 2 + 0.05, -1.4, PI / 2, { y: 1.7, solid: false });
    for (const [x, col] of [[2, 0x1e5fc4], [4.2, 0xc62828], [6.4, 0xc62828], [8.6, 0x1e5fc4]]) { const m = c.place(P.mat3(col), x, -D / 2 + 0.25, 0); m.rotation.x = -1.35; m.position.y = 0.95; }
    c.place(P.gymBench(3), 2, D / 2 - 0.5, 0); c.place(P.gymBench(3), 6, D / 2 - 0.5, 0);
    // lavagnetta con l'ordine
    const ord = canvasTex("ordineconi", 400, 300, (g, w, h) => { g.fillStyle = "#1f3b2c"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = "700 30px 'Comic Sans MS', cursive"; g.fillText("PERCORSO:", 30, 50); [["#fdd835", "1. GIALLO"], ["#e53935", "2. ROSSO"], ["#1e88e5", "3. BLU"]].forEach(([col, t], i) => { g.fillStyle = col; g.fillText(t, 50, 105 + i * 50); }); });
    const bd = new THREE.Group(); B(bd, 0, 1.2, 0, 0.05, 2.4, 0.05, M.grey); const brd = B(bd, 0, 1.6, 0.03, 0.9, 0.68, 0.03, M.black); plane(bd, 0, 1.6, 0.05, 0.86, 0.64, new THREE.MeshBasicMaterial({ map: ord })); void brd;
    c.place(bd, -6.2, 5.6, PI * 0.85);
    c.interact(bd, { label: "Leggi la lavagnetta del percorso", range: 2.2, use: () => c.canvasDoc("Il percorso dei coni", ord.image) });
    // coni
    const cones = [[0xfdd835, "Giallo", -2, 3], [0x1e88e5, "Blu", 5, 2.5], [0xe53935, "Rosso", 1.5, -3.5]];
    const order = ["Giallo", "Rosso", "Blu"];
    c.state.coneStep = 0;
    cones.forEach(([col, nm, x, z]) => {
      const cn = c.place(P.cone(col), x, z, 0, { solid: false });
      c.interact(cn, { label: "Tocca il cono " + nm, range: 1.4, when: () => !c.isDone("percorso"),
        use: () => {
          if (order[c.state.coneStep] === nm) { c.state.coneStep++; sfx.note(c.state.coneStep); cn.position.y = 0.15; setTimeout(() => (cn.position.y = 0), 300); c.refresh(); if (c.state.coneStep === 3) { c.done("percorso"); sfx.whistle(); c.prof("Ottimo riscaldamento! Ora i palloni: basket con basket, pallavolo con pallavolo."); } }
          else { c.state.coneStep = 0; sfx.whistle(); c.toast("Fiiii! Ordine sbagliato: ricomincia dal cono giallo."); c.refresh(); }
        } });
    });
    // palloni e carrelli
    c.state.balls = 0;
    // tiro a canestro: con un pallone da basket in mano, dalla linea del tiro libero
    const shotSpot = new THREE.Group(); B(shotSpot, 0, 0.003, 0, 0.6, 0.006, 0.6, mat(0xf0559a, { opacity: 0.6 }), false); c.place(shotSpot, -W / 2 + 4.6, 0, 0, { solid: false });
    let shots = 0;
    c.interact(shotSpot, { label: "Tira a canestro!", range: 1.4, when: () => c.items().some((it) => it.kind === "basket"), use: () => {
      const b = P.ball("basket"); const start = new THREE.Vector3(-W / 2 + 4.6, 1.9, 0), end = new THREE.Vector3(-W / 2 + 2.2, 3.15, 0); b.position.copy(start); c.scene.add(b);
      const ok = Math.random() < 0.7 || shots >= 1; shots++; let t = 0; sfx.click();
      c.anim((dt) => { if (t > 1.6 || !b.parent) return; t += dt; const k = Math.min(1, t / 1.0); if (k < 1) { b.position.lerpVectors(start, ok ? end : end.clone().add(new THREE.Vector3(0.1, 0, 0.3)), k); b.position.y += Math.sin(k * Math.PI) * 1.6; b.rotation.x += dt * 8; } else { b.position.y -= dt * 4; b.position.x += dt * (ok ? 0.2 : 1.2); if (t > 1.0 && t - dt <= 1.0) { if (ok) { sfx.ok(); c.toast("🏀 Canestro!"); } else { sfx.bad(); c.toast("Ferro! Riprova"); } } if (b.position.y < 0.12) { c.scene.remove(b); } } });
    } });
    const balls = [["basket", -4, -1], ["volley", 3, 5.5]];
    balls.forEach(([k, x, z], i) => {
      const bl = c.place(P.ball(k), x, z, 0, { solid: false });
      c.interact(bl, { label: k === "basket" ? "Raccogli il pallone da basket" : "Raccogli il pallone da pallavolo", range: 1.4,
        use: (it) => { c.give({ id: "ball" + i, kind: k, name: k === "basket" ? "Pallone da basket" : "Pallone da pallavolo", icon: k === "basket" ? "🏀" : "🏐", desc: "Va nel suo carrello" }); c.remove(it); } });
    });
    [["basket", 0xe8742a, "BASKET", W / 2 - 3.6, -2.2], ["volley", 0x1e5fc4, "VOLLEY", W / 2 - 3.6, 2.2]].forEach(([k, col, lbl, x, z]) => {
      const cart = c.place(P.ballCart(col, lbl), x, z, -PI / 2);
      c.interact(cart, { label: "Carrello " + lbl, range: 1.9, when: () => !c.isDone("palloni"),
        use: () => {
          const mine = c.items().filter((it) => it.kind);
          if (!mine.length) { c.toast("Non hai palloni. Cercali in giro per la palestra!"); return; }
          let put = 0, wrong = 0;
          for (const it of mine) { if (it.kind === k) { c.take(it.id); put++; c.state.balls++; const b = P.ball(k); b.position.set((put - 1) * 0.25 - 0.2, 0.5, 0); cart.add(b); } else wrong++; }
          if (put) { sfx.pick(); c.toast(`${put} pallon${put > 1 ? "i" : "e"} nel carrello ${lbl}!`); }
          if (wrong) c.toast(put ? `Messi! Ma gli altri non vanno nel carrello ${lbl}.` : `Questo pallone non va nel carrello ${lbl}!`);
          c.refresh();
          if (c.state.balls >= 2) { c.done("palloni"); c.prof("Palestra in ordine! Sei pronto per qualsiasi sport."); }
        } });
    });
  },
  talk(c) {
    if (!c.isDone("percorso")) return ["La lavagnetta con l'ordine dei coni è qui vicino a me. Giallo per primo!"];
    if (!c.isDone("palloni")) return ["I carrelli sono sotto il canestro in fondo. Basket ai palloni arancioni, volley agli altri."];
    return ["Bravo! Ora puoi uscire dalla porta a vetri."];
  },
  curiosity: "Il palazzetto dell'Othoca ha campo da basket e pallavolo, spalliere e una parete d'arrampicata. Scienze motorie insegna lavoro di squadra, rispetto delle regole e cura del proprio corpo.",
},
// =====================================================================================
{
  id: "teatro", name: "Teatro · Aula magna", indirizzo: "Progetti e attività", difficulty: 3,
  photos: ["theatre_06", "theatre_03"], cardPhoto: "theatre_06",
  size: [16, 18, 6],
  preload: ["foto/tex/theatre_ceiling.jpg", "foto/tex/theatre_band.jpg"],
  shell: () => ({ floorTex: TEX.dots(), floorScale: 1.2, floorRough: 0.4, ceilPhoto: "foto/tex/theatre_ceiling.jpg", ceilScale: 2.6, wallBand: { url: "foto/tex/theatre_band.jpg", y: 5.35, h: 1.1 }, ceil: 0xd9d3c8, wall: 0xf3f0ea, hemi: 1.15, sunI: 1.5, lightSX: 3, lightSZ: 3, lightW: 0.5, lightD: 0.5 }),
  spawn: [-3.4, 7.8, PI], exit: { side: "e", z: -4.5, color: 0x8a5a2b }, entry: { side: "s", x: -3.4, y: 1.8, color: 0x8a5a2b },
  teacher: { name: "Prof. Mura", role: "Laboratorio teatrale", at: [1.0, -3.5], look: { shirt: 0x1a1a1a, pants: 0x1a1a1a, hair: 0x6d4c41, beard: true, coat: 0x3a1f2a, scarf: 0xc62828 } },
  tasks: [
    { id: "oggetti", title: "Gli oggetti di scena", step: (c) => `Trova i 2 oggetti di scena e portali sul tavolo davanti al palco (${c.state.props || 0}/2)`,
      hints: ["Gli oggetti di scena sono in sala: uno vicino al palco e uno in fondo.", "Guarda a sinistra del palco e sullo spiazzo in alto, dietro le gradinate.", "Corona: a sinistra del palco · Lanterna: sullo spiazzo in alto, dietro le gradinate."] },
    { id: "luci", title: "Le luci dello spettacolo", step: () => "Segui il copione e accendi le luci di scena dalla consolle",
      hints: ["Il copione è sul leggio vicino al palco.", "La consolle delle luci è sullo spiazzo in alto, dietro le gradinate: sali dalla scala centrale.", "Ordine: Blu (notte) → Giallo (alba) → Bianco (giorno) → Rosso (finale)."] },
  ],
  intro: [
    "Benvenuto in aula magna! Sono il professor Mura e stasera c'è lo spettacolo della scuola.",
    "Disastro: mancano due oggetti di scena! La corona e la lanterna sono finite chissà dove. Portali sul tavolo davanti al palco.",
    "Poi le luci: il copione sul leggio dice in che ordine accenderle dalla consolle in fondo alla sala.",
  ],
  build(c) {
    const { W, D } = c;
    c.place(P.stage(9, 3.6, 0.6), 0, -D / 2 + 1.9, 0, { cam: true, solid: false });
    // il palco si calpesta: scalini davanti al centro, bordi chiusi
    c.floor({ x0: -4.5, z0: -D / 2, x1: 4.5, z1: -D / 2 + 3.7, y: 0.6 });
    c.floor({ x0: -0.8, z0: -5.3, x1: 0.8, z1: -5.05, y: 0.4 }); c.floor({ x0: -0.8, z0: -5.05, x1: 0.8, z1: -4.45, y: 0.2 });
    c.colliderBox(-4.5, -5.38, -0.82, -5.28); c.colliderBox(0.82, -5.38, 4.5, -5.28); c.colliderBox(-4.62, -D / 2, -4.5, -5.3); c.colliderBox(4.5, -D / 2, 4.62, -5.3);
    // fondale nero con il "dietro le quinte": passaggio sul lato destro del palco
    const bd = B(c.scene, -0.75, 0.6 + 2.2, -7.6, 7.5, 4.4, 0.08, M.curtain); c.camBlock(bd); c.colliderBox(-4.5, -7.66, 3.0, -7.54);
    for (let i = 0; i < 30; i++) B(c.scene, -4.4 + i * 0.25, 0.6 + 2.2, -7.55 + Math.sin(i * 1.7) * 0.03, 0.22, 4.4, 0.04, M.curtain, false);
    const crate = (x, z, s) => { const g = new THREE.Group(); B(g, 0, s / 2, 0, s, s, s, M.wood); c.place(g, x, z, Math.random(), { y: 0.6 }); };
    crate(-4.0, -8.5, 0.6); crate(-3.3, -8.55, 0.45); crate(1.8, -8.5, 0.55);
    { const rack = new THREE.Group(); B(rack, 0, 1.6, 0, 1.4, 0.04, 0.04, M.steel); B(rack, -0.7, 0.8, 0, 0.04, 1.6, 0.04, M.steel); B(rack, 0.7, 0.8, 0, 0.04, 1.6, 0.04, M.steel); [0xc62828, 0x1565c0, 0x6a1b9a, 0x2e7d32, 0xf9a825].forEach((col, i) => B(rack, -0.5 + i * 0.25, 1.1, 0, 0.2, 0.9, 0.3, mat(col, { rough: 1 }))); c.place(rack, -1.2, -8.55, 0, { y: 0.6 }); }
    { const mir = new THREE.Group(); B(mir, 0, 1.0, 0, 0.8, 1.8, 0.05, mat(0xdddddd, { metal: 1, rough: 0.05 })); c.place(mir, 0.6, -8.92, 0, { y: 0.6, solid: false }); }
    c.place(P.curtain(2.4, 5), -5.2, -D / 2 + 3.4, 0, { cam: true }); c.place(P.curtain(2.4, 5), 5.2, -D / 2 + 3.4, 0, { cam: true });
    B(c.scene, 0, 5.2, -D / 2 + 3.5, 13, 1.2, 0.2, M.curtain, false);
    const scr = P.boardTex("teatro", [{ t: "OTHOCA IN SCENA", bold: true, size: 96, color: "#f0559a", x: 150, gap: 120 }, { t: "Spettacolo di fine anno · ore 21", size: 50, color: "#ffffff", x: 200 }, { t: "Laboratorio teatrale dell'I.T.I. Othoca", size: 40, color: "#cccccc", x: 230 }], { bg: "#14101a", chalk: true });
    plane(c.scene, -0.75, 3.4, -7.5, 5.0, 2.7, new THREE.MeshBasicMaterial({ map: scr, color: 0xbbbbbb }));
    // gradinate: blocchi pieni con le file di poltroncine
    const tiers = 6;
    for (let r = 0; r < tiers; r++) {
      const z = 0.2 + r * 1.15, y = r * 0.3;
      for (const side of [-1, 1]) {
        const xC = side * 4.1;
        if (r > 0) { const blk = B(c.scene, xC, y / 2, z, 6.2, y, 1.15, mat(0x3a3a40)); world_cam(c, blk); }
        c.place(P.seatRow(10, 0.6), xC, z, PI, { y, solid: false });
      }
      c.colliderBox(-7.3, z - 0.55, -1.0, z + 0.55); c.colliderBox(1.0, z - 0.55, 7.3, z + 0.55);
    }
    // scala centrale tra le due gradinate fino allo spiazzo in alto
    const SD = 6.85 / 12;
    for (let i = 0; i < 12; i++) { const h = (i + 1) * 0.15, st = B(c.scene, 0, h / 2, -0.35 + (i + 0.5) * SD, 2.0, h, SD, mat(0x46464c, { rough: .7 })); world_cam(c, st); B(c.scene, 0, h + 0.004, -0.35 + i * SD + 0.04, 2.0, 0.01, 0.06, mat(0xd9d9d9), false); }
    c.floor({ x0: -1.0, z0: -0.35, x1: 1.0, z1: 6.5, y: (x, z) => Math.min(1.8, (Math.floor((z + 0.35) / SD) + 1) * 0.15) });
    for (const sx of [-1, 1]) { const rail = C(c.scene, sx * 1.02, 1.0, 3.1, 0.025, 7.2, M.steel); rail.rotation.x = Math.atan2(1.8, 6.85) - Math.PI / 2; }
    // spiazzo rialzato dietro le gradinate
    const pl = B(c.scene, 0, 0.9, 7.75, 16, 1.8, 2.5, mat(0x3a3a40)); world_cam(c, pl);
    c.floor({ x0: -8, z0: 6.5, x1: 8, z1: 9, y: 1.8 });
    for (const sx of [-1, 1]) { B(c.scene, sx * 4.4, 2.3, 6.55, 6.8, 0.05, 0.05, M.steel, false); for (let x = 1.2; x < 7.8; x += 0.8) B(c.scene, sx * x, 2.05, 6.55, 0.03, 0.5, 0.03, M.steel, false); }
    { const cover = new THREE.Group(); B(cover, 0, 0.5, 0, 1.6, 1.0, 0.7, mat(0x1e7d4f, { rough: 1 })); c.place(cover, 4.6, 8.2, 0, { y: 1.8 }); }
    for (const z of [-2.5, -1.4]) for (const x of [-6.2, -5.5, -4.8, -4.1, -3.4, -2.7, -2.0, 2.0, 2.7, 3.4, 4.1, 4.8, 5.5, 6.2]) c.place(P.chair(M.seatRed, M.black), x, z, PI);
    // consolle e leggio
    const cons = c.place(P.lightConsole(), 1.6, D / 2 - 1.0, PI, { y: 1.8 });
    const lect = new THREE.Group(); C(lect, 0, 0.55, 0, 0.04, 1.1, M.black); const top = B(lect, 0, 1.12, 0, 0.45, 0.04, 0.35, M.black); top.rotation.x = -0.4; B(lect, 0, 1.15, 0.02, 0.36, 0.01, 0.26, M.white).rotation.x = -0.4;
    c.place(lect, 2.6, -D / 2 + 4.6, 0.2);
    c.interact(lect, { label: "Leggi il copione", range: 2, use: () => c.doc("Copione · Atto finale", `<p><b>Scena 1</b> — È notte: luce <b style="color:#1e88e5">BLU</b>.</p><p><b>Scena 2</b> — Sorge il sole: luce <b style="color:#f9a825">GIALLA</b>.</p><p><b>Scena 3</b> — Pieno giorno: luce <b>BIANCA</b>.</p><p><b>Finale</b> — Applausi: luce <b style="color:#e53935">ROSSA</b>!</p>`) });
    // fari di scena
    const spots = [];
    for (let i = 0; i < 5; i++) { const s = P.spotlight(); s.g.position.set(-4 + i * 2, 5.4, -D / 2 + 4.2); c.scene.add(s.g); spots.push(s); }
    const beams = spots.map((s2) => { const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); cone.position.set(s2.g.position.x, 3.1, s2.g.position.z - 1.6); cone.rotation.x = -0.35; c.scene.add(cone); return cone; });
    const setBeams = (col, op = 0.16) => beams.forEach((b) => { b.material.color.setHex(col); b.material.opacity = op; });
    const stageLight = new THREE.PointLight(0xffffff, 0, 14); stageLight.position.set(0, 4, -D / 2 + 3); c.scene.add(stageLight);
    // tavolo di scena
    c.state.props = 0;
    const tbl = c.place(P.table(1.6, 0.7, mat(0x5d4037)), -2.6, -D / 2 + 4.8, 0);
    const placed = [];
    c.interact(tbl, { label: "Tavolo degli oggetti di scena", range: 2, when: () => !c.isDone("oggetti"),
      use: () => {
        const mine = c.items().filter((it) => it.prop);
        if (!mine.length) { c.toast("Sul tavolo mancano corona, maschera e lanterna. Cercali in sala!"); return; }
        for (const it of mine) { c.take(it.id); c.state.props++; const g = it.make(); g.position.set(-0.5 + placed.length * 0.5, 0.78, 0); tbl.add(g); placed.push(g); }
        sfx.pick(); c.refresh();
        if (c.state.props >= 2) { c.done("oggetti"); c.prof("Ci sono tutti! Adesso le luci: leggi il copione e vai alla consolle."); }
        else c.toast(`Oggetti sul tavolo: ${c.state.props}/2`);
      } });
    const crown = () => { const g = new THREE.Group(); const ring = C(g, 0, 0.06, 0, 0.1, 0.12, M.yellow, 0.1); ring.material = mat(0xf2c21b, { metal: 0.7, rough: 0.3 }); for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 6), ring.material); sp.position.set(Math.cos(i * 1.26) * 0.09, 0.15, Math.sin(i * 1.26) * 0.09); g.add(sp); } return g; };
    const mask = () => { const g = new THREE.Group(); const f = S(g, 0, 0.1, 0, 0.11, mat(0xffffff, { rough: .3 })); f.scale.set(1, 1.2, 0.4); S(g, -0.04, 0.12, 0.04, 0.02, M.black); S(g, 0.04, 0.12, 0.04, 0.02, M.black); return g; };
    const lantern = () => { const g = new THREE.Group(); B(g, 0, 0.12, 0, 0.14, 0.2, 0.14, mat(0xffe082, { emissive: 0xffc107, ei: 0.6 })); B(g, 0, 0.24, 0, 0.16, 0.03, 0.16, M.black); B(g, 0, 0.01, 0, 0.16, 0.03, 0.16, M.black); return g; };
    const hidden = [["corona", "Corona", "👑", crown, -5.9, -D / 2 + 4.6], ["lanterna", "Lanterna", "🏮", lantern, 7.2, 7.6]];
    hidden.forEach(([id, nm, ic, mk, x, z]) => {
      const g = mk(); c.place(g, x, z, 0, { solid: false, y: (id === "maschera" ? 0.6 : id === "lanterna" ? 1.8 : 0) });
      c.interact(g, { label: "Prendi: " + nm, range: 1.5, use: (it) => { c.give({ id, prop: true, name: nm, icon: ic, desc: "Oggetto di scena", make: mk }); c.remove(it); c.toast(nm + " trovata! Portala sul tavolo davanti al palco."); } });
    });
    c.interact(cons, { label: "Consolle delle luci", point: new THREE.Vector3(1.6, 0, D / 2 - 1.9), range: 2, when: () => !c.isDone("luci"),
      use: async () => {
        if (!c.isDone("oggetti")) { c.prof("Aspetta! Prima gli oggetti di scena, poi proviamo le luci."); return; }
        const cols = { 0: 0x1e88e5, 1: 0xfdd835, 2: 0xffffff, 3: 0xe53935 };
        if (await c.puzzle({ type: "sequence", title: "Consolle delle luci", body: `<p>Accendi le luci nell'ordine del copione.</p>`, items: [
          { label: "Rosso", icon: "🔴", color: "#c62828" }, { label: "Bianco", icon: "⚪", color: "#757575" }, { label: "Blu", icon: "🔵", color: "#1565c0" }, { label: "Giallo", icon: "🟡", color: "#f9a825" }], answer: [2, 3, 1, 0],
          sound: (i) => { sfx.note(i); const col = [cols[3], cols[2], cols[0], cols[1]][i]; stageLight.color.setHex(col); stageLight.intensity = 30; spots.forEach((s) => s.lens.material.emissive.setHex(col)); setBeams(col); } })) {
          c.done("luci"); stageLight.color.setHex(0xe53935); stageLight.intensity = 40;
          let st = 0; const show = [0x1e88e5, 0xfdd835, 0xffffff, 0xe53935, 0xf0559a]; c.anim((dt) => { st += dt; beams.forEach((b, i) => { b.material.color.setHex(show[(Math.floor(st * 2) + i) % show.length]); b.material.opacity = 0.12 + Math.sin(st * 4 + i) * 0.06; b.rotation.z = Math.sin(st * 1.2 + i) * 0.25; }); }); c.prof("Si va in scena! Che spettacolo… e applausi per te!");
        }
      } });
  },
  talk(c) {
    if (!c.isDone("oggetti")) return [`Ne hai trovati ${c.state.props || 0} su 2. Guarda a sinistra del palco e in fondo alla sala!`];
    if (!c.isDone("luci")) return ["Il copione è sul leggio qui accanto. La consolle è in fondo alla sala."];
    return ["Spettacolo riuscito! Puoi uscire dalla porta laterale."];
  },
  curiosity: "L'aula magna dell'Othoca ospita assemblee, conferenze, open day e il laboratorio teatrale: a scuola si impara anche a parlare in pubblico, recitare e lavorare dietro le quinte (luci, audio, scenografie).",
},
];

// aiuto: anche i blocchi delle gradinate fermano la camera
function world_cam(c, mesh) { c.camBlock(mesh); }

// =====================================================================================
// Stanza segreta: si sblocca completando tutte e 8 le stanze. Ogni stanza regala una lettera:
// in ordine formano O-R-I-S-T-A-N-O.
export const SECRET_WORD = "ORISTANO";
export const SECRET = {
  id: "segreta", name: "L'Archivio segreto", indirizzo: "Stanza segreta", difficulty: 3, secret: true,
  photos: [], cardPhoto: "entrance_01",
  size: [8, 7, 3.2],
  preload: [],
  shell: () => ({ floorTex: TEX.parquet(), floorScale: 1.4, wall: 0x2c2338, ceil: 0x1e1828, windows: [] }),
  spawn: [2.6, 2.4, PI * 0.8], exit: { side: "n", x: 2.6, color: 0x6a1b4d, glass: false }, entry: null,
  teacher: { name: "Il custode Gino", role: "Guardiano dell'archivio", at: [-2.4, -1.6], look: { shirt: 0x37474f, pants: 0x263238, hair: 0x9e9e9e, beard: true, beardColor: 0xbdbdbd, glasses: true, hat: 0x37474f } },
  tasks: [
    { id: "parola", title: "La parola segreta", step: () => "Apri lo scrigno con le 8 lettere raccolte",
      hints: ["Ogni stanza completata ti ha dato una lettera: le trovi sulla lavagna dell'archivio.", "Mettile nell'ordine delle stanze sulla mappa: formano il nome di una città.", "La parola è ORISTANO."] },
    { id: "quiz", title: "Il quiz del fenicottero", step: () => "Rispondi alle domande del custode sul computer dell'archivio",
      hints: ["Le risposte sono nelle curiosità che hai letto uscendo dalle stanze.", "Il logo dell'Othoca è un uccello rosa degli stagni.", "Fenicottero · Fenici · ZooMate."] },
  ],
  intro: [
    "Ehi, tu! Nessuno entra nell'Archivio segreto dell'Othoca da anni…",
    "Sono Gino, il custode. Se sei arrivato fin qui hai superato tutte le stanze della scuola: complimenti!",
    "Nello scrigno c'è il Diploma d'onore dell'Othoca. Si apre con una parola di otto lettere: una per ogni stanza che hai completato.",
  ],
  build(c) {
    const { W, D } = c;
    const gold = mat(0xd4a017, { rough: 0.3, metal: 0.8 });
    // scaffali dell'archivio pieni di faldoni
    for (let i = 0; i < 4; i++) { c.place(P.shelfUnit(mat(0x4e342e), 0.9, 2.2), -W / 2 + 0.25, -2.2 + i * 1.1, PI / 2); }
    for (let i = 0; i < 3; i++) c.place(P.shelfUnit(mat(0x4e342e), 0.9, 2.2), -1.5 + i * 1.0, -D / 2 + 0.25, 0);
    c.place(P.bookStack(5), -2.0, 1.6, 0.4, { y: 0, solid: false });
    c.place(P.plant(), W / 2 - 0.4, -D / 2 + 0.4, 0);
    c.place(P.sofa(0x6a1b4d), W / 2 - 0.6, 0.2, -PI / 2);
    c.place(P.wallClock(), 1.6, -D / 2 + 0.05, 0, { y: 2.3, solid: false });
    // lavagna con le lettere raccolte
    const letters = c.state.letters || "";
    const lines = [{ t: "LE LETTERE DELLE STANZE", bold: true, size: 50, color: "#ffd54f" }, { t: SECRET_WORD.split("").map((ch, i) => letters[i] && letters[i] !== "_" ? ch : "_").join("  "), bold: true, size: 96, gap: 20 }, { t: "nell'ordine delle stanze sulla mappa", size: 34, gap: 16 }];
    const board = c.place(P.chalkboard(2.2, 1.2, P.boardTex("archivio", lines, { chalk: true })), W / 2 - 0.05, -1.4, -PI / 2, { y: 1.55, solid: false });
    c.interact(board, { label: "Leggi la lavagna", point: new THREE.Vector3(W / 2 - 1.1, 0, -1.4), range: 2, use: () => c.doc("Le lettere delle stanze", `<p>Ogni stanza completata ti ha regalato una lettera:</p><p style="font-size:30px;letter-spacing:10px;text-align:center"><b>${SECRET_WORD.split("").map((ch) => ch).join(" ")}</b></p><p class="muted">Nell'ordine delle stanze sulla mappa formano il nome di una città che conosci bene…</p>`) });
    // scrigno dorato
    const chest = new THREE.Group();
    B(chest, 0, 0.22, 0, 0.8, 0.44, 0.5, mat(0x5d2e0c, { rough: 0.6 })); B(chest, 0, 0.5, 0, 0.82, 0.14, 0.52, mat(0x6d3a12, { rough: 0.6 }));
    B(chest, 0, 0.3, 0.26, 0.82, 0.05, 0.02, gold); B(chest, -0.3, 0.3, 0, 0.05, 0.62, 0.53, gold); B(chest, 0.3, 0.3, 0, 0.05, 0.62, 0.53, gold); B(chest, 0, 0.4, 0.27, 0.12, 0.14, 0.03, gold);
    c.place(chest, 0, -2.6, 0);
    const glow = new THREE.PointLight(0xffc94d, 0, 3); glow.position.set(0, 1, -2.4); c.scene.add(glow);
    c.interact(chest, { label: "Scrigno dorato", point: new THREE.Vector3(0, 0, -1.7), range: 1.8, when: () => !c.isDone("parola"),
      use: async () => { if (await c.puzzle({ type: "code", kind: "Scrigno", title: "La parola segreta", body: "<p>Otto lettere, una per stanza.</p>", answer: SECRET_WORD, keys: ["O", "R", "I", "S", "T", "A", "N", "E", "C", "L", "⌫", "OK"] })) { glow.intensity = 3; c.done("parola"); c.prof("Lo scrigno si è aperto! Ma prima del diploma… un'ultima prova: rispondi alle mie domande al computer."); } } });
    // computer del quiz
    const desk = c.place(P.teacherDesk(), 1.4, 1.9, PI);
    const mon = c.place(P.monitor(), 1.4, 1.9, PI, { y: 0.77, solid: false });
    c.interact(mon || desk, { label: "Computer dell'archivio", point: new THREE.Vector3(1.4, 0, 1.1), range: 1.8, when: () => c.isDone("parola") && !c.isDone("quiz"),
      use: async () => { if (await c.puzzle({ type: "quiz", kind: "Quiz finale", title: "Il quiz del fenicottero", questions: [
        { q: "Qual è l'animale del logo dell'Othoca?", options: ["Il fenicottero rosa", "L'aquila", "Il cavallo"], correct: 0 },
        { q: "Chi fondò l'antica città di Othoca?", options: ["I Romani", "I Fenici", "I Vichinghi"], correct: 1 },
        { q: "Come si chiama il museo degli animali delle zone umide della scuola?", options: ["Museo Egizio", "ZooMate", "Acquario Othoca"], correct: 1 },
      ] })) { c.done("quiz"); c.prof("Perfetto! Il Diploma d'onore è tuo. Ora puoi uscire dall'archivio da vero campione dell'Othoca!"); } } });
    // tappeto e lampade calde
    plane(c.scene, 0, 0.005, 0, 3.4, 2.4, mat(0x7b1f3a, { rough: 0.95 }), 0, -PI / 2);
    for (const [x, z] of [[-1.5, 0], [1.8, -1.5]]) { const l = new THREE.PointLight(0xffb36b, 1.4, 6); l.position.set(x, 2.6, z); c.scene.add(l); }
  },
  talk(c) {
    if (!c.isDone("parola")) return ["Le otto lettere sono scritte sulla lavagna. Mettile in ordine e apri lo scrigno."];
    if (!c.isDone("quiz")) return ["Ultima prova: le domande sono sul computer, lì sulla scrivania."];
    return ["Sei una leggenda dell'Othoca! La porta è aperta."];
  },
  curiosity: "Hai esplorato tutti i laboratori dell'Othoca: chimica, officina, pneumatica, ZooMate, informatica, aula, palestra e teatro. Il prossimo passo? Iscriverti e viverli davvero!",
};
