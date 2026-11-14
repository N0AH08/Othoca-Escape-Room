/*
 * ESCAPE DEI LABORATORI — quattro laboratori separati, ricostruiti dalle foto 360°
 * Ogni laboratorio è una stanza a sé: quando si risolve il suo enigma la porta si apre e porta al laboratorio successivo.
 * Coordinate in metri (x destra, z giù); i laboratori sono lontani tra loro e non si vedono.
 */
window.SCUOLA = {
  labs: true,
  rooms: [
    { id: "chimica", name: "Laboratorio di chimica", area: "Chimica", rect: [0, 0, 16, 11], h: 4.2, floor: "tiles", ceil: "vault", wall: "cream", windows: ["n"] },
    { id: "officina", name: "Officina meccanica", area: "Officina", rect: [100, 0, 118, 14], h: 6, floor: "greytiles", ceil: "vault", wall: "cream", windows: ["n", "w"] },
    { id: "pneumatica", name: "Laboratorio di pneumatica", area: "Pneumatica", rect: [200, 0, 214, 12], h: 3.4, floor: "lighttiles", ceil: "panels", wall: "white", windows: ["n"] },
    { id: "zoomate", name: "Museo ZooMate", area: "ZooMate", rect: [300, 0, 314, 12], h: 3.8, floor: "beige", ceil: "panels", wall: "white" }
  ],
  // porte d'uscita: to = [x, z, direzione] dove si arriva nel laboratorio successivo
  doors: [
    { a: [16, 7.8], b: [16, 9.8], kind: "wood", lock: "chimica", to: [101.6, 11.5, Math.PI / 2], lockedSay: "La porta del laboratorio è chiusa! Prima risolvi l'esperimento delle provette sul bancone." },
    { a: [114.5, 0], b: [116.5, 0], kind: "wood", lock: "tornio", to: [201.6, 10, Math.PI / 2], lockedSay: "L'officina resta chiusa finché non risolvi il disegno tecnico sul banco da lavoro." },
    { a: [201.5, 0], b: [203.5, 0], kind: "wood", lock: "circuito", to: [307, 10.8, Math.PI], lockedSay: "La porta è collegata al quadro elettrico: accendi tutte e tre le lampadine!" }
  ],
  info: [],
  items: {
    phchart:  { room: "chimica", p: [0.15, 1.7, 3.2], stand: [1.9, 3.2], icon: "🧪", label: "Cartellone del pH" },
    chimica:  { room: "chimica", p: [8, 1.15, 4.8], stand: [8, 6.4], icon: "⚗️", label: "Provette" },
    tornio:   { room: "officina", p: [109, 1.0, 8.6], stand: [109, 10.3], icon: "📐", label: "Disegno tecnico" },
    circuito: { room: "pneumatica", p: [213.85, 1.5, 6.5], stand: [212.2, 6.5], icon: "💡", label: "Quadro elettrico" },
    simon:    { room: "zoomate", p: [309.6, 1.8, 0.2], stand: [309.6, 2.7], icon: "🖥️", label: "Schermi interattivi" },
    finale:   { room: "zoomate", p: [305.5, 0.4, 0.9], stand: [305.5, 2.7], icon: "🧰", label: "Cassa" }
  },
  goalOrder: ["phchart", "chimica", "tornio", "circuito", "simon", "finale"],
  escZone: { chimica: "chimica", officina: "officina", pneumatica: "pneumatica", zoomate: "zoomate" },
  start: { pos: [8, 9.6], heading: Math.PI }
};

// ---------- Arredi dei quattro laboratori (oggetti 3D come nelle foto 360°) ----------
window.ARREDI_LAB = (K) => {
  const { react, svgTex, GAME, R, THREE, MAT, box, cyl, quad, local, picture, block, blockRot, column, chair, desk, machineLathe, ceilingLights, wallPic, onWall, FACE, bench, extinguisher, radiator, displayCase, greyCabinet, labCabinet, pneumaticPanel, instrumentBench, doorLabel, canvasTex, std, rnd, addGeo, bottleCols } = K;
  const exitSign = (x, z, ry) => { const t = canvasTex(128, 48, (g, w, h) => { g.fillStyle = "#1b8f3a"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = "bold 26px Inter, sans-serif"; g.textAlign = "center"; g.fillText("USCITA", w / 2, 33); }, false); local(x, z, ry, () => quad([-0.35, 2.55, 0.05], [0.35, 2.55, 0.05], [0.35, 2.8, 0.05], [-0.35, 2.8, 0.05], [0, 0, 1, 0, 1, 1, 0, 1], std({ map: t, emissive: 0x115522 }))); };

  // ===== 1. LABORATORIO DI CHIMICA (banconi bianchi con cassetti verde menta, cappe, armadi con vetreria) =====
  {
    const C = R.chimica; ceilingLights(C, 3.4, 3.4, 1.4, 0.25);
    const benchLab = (x0, z0, x1, z1) => {
      box(x0, 0, z0, x1, 0.86, z1, MAT.mint); box(x0 - 0.05, 0.86, z0 - 0.05, x1 + 0.05, 0.92, z1 + 0.05, MAT.labWhite);
      for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.6) box(x, 0.2, z1 + 0.001, x + 0.5, 0.75, z1 + 0.01, std({ color: 0x8fcbb0 }), false);
      box(x0 + 0.3, 0.92, (z0 + z1) / 2 - 0.05, x1 - 0.3, 1.45, (z0 + z1) / 2 + 0.05, MAT.labWhite);
      box(x0 + 0.3, 1.45, (z0 + z1) / 2 - 0.15, x1 - 0.3, 1.48, (z0 + z1) / 2 + 0.15, MAT.labWhite);
      for (let x = x0 + 0.6; x < x1 - 0.4; x += 1.1) { cyl(x, 0.92, z0 + 0.3, 0.06, 1.12, bottleCols[0], 10); cyl(x + 0.35, 0.92, z1 - 0.3, 0.07, 1.06, bottleCols[(x * 3 | 0) % 6], 10); cyl(x + 0.6, 1.48, (z0 + z1) / 2, 0.04, 1.62, bottleCols[2], 8); }
      block(x0, z0, x1, z1);
    };
    benchLab(2.5, 3.6, 13.5, 5);
    benchLab(3.5, 0.9, 9.5, 2.1);
    // rubinetti e lavello sul bancone centrale
    for (const x of [4, 7, 10, 13]) { cyl(x, 0.92, 4.3, 0.02, 1.25, MAT.alu, 6); box(x - 0.02, 1.22, 4.3, x + 0.02, 1.25, 4.55, MAT.alu, false); }
    // cappa aspirante
    box(C.x1 - 3.4, 0, 0.15, C.x1 - 0.4, 0.9, 1.1, MAT.labWhite); box(C.x1 - 3.4, 0.9, 1.05, C.x1 - 0.4, 2.1, 1.1, MAT.glass, false);
    box(C.x1 - 3.4, 2.1, 0.15, C.x1 - 0.4, 2.9, 1.1, MAT.labWhite); box(C.x1 - 2.2, 2.9, 0.3, C.x1 - 1.6, C.h, 0.9, MAT.alu, false); block(C.x1 - 3.4, 0, C.x1 - 0.4, 1.1);
    // armadi con la vetreria e armadio di sicurezza giallo
    labCabinet(C.x0 + 0.39, 7, FACE.w, 2.6); labCabinet(C.x0 + 0.39, 9.4, FACE.w, 1.8);
    labCabinet(5, C.z1 - 0.39, FACE.s, 3); labCabinet(8.2, C.z1 - 0.39, FACE.s, 3);
    box(C.x1 - 1.5, 0, 1.5, C.x1 - 0.15, 2, 2.9, MAT.yellow); box(C.x1 - 1.52, 1.6, 1.9, C.x1 - 1.5, 1.8, 2.5, MAT.black, false); block(C.x1 - 1.5, 1.5, C.x1 - 0.15, 2.9);
    // lavagna interattiva e tabella periodica
    box(C.x1 - 0.18, 1.1, 4, C.x1 - 0.13, 2.7, 6.8, MAT.black, false); box(C.x1 - 0.2, 1.2, 4.1, C.x1 - 0.18, 2.6, 6.7, std({ color: 0x2196f3, emissive: 0x0d47a1 }), false);
    const periodic = canvasTex(512, 300, (g, w, h) => { g.fillStyle = "#fffdf5"; g.fillRect(0, 0, w, h); const cols = ["#ef9a9a", "#ffcc80", "#fff59d", "#a5d6a7", "#90caf9", "#ce93d8", "#b0bec5"]; for (let r = 0; r < 7; r++) for (let c = 0; c < 18; c++) { if (r === 0 && c > 0 && c < 17) continue; if ((r === 1 || r === 2) && c > 1 && c < 12) continue; g.fillStyle = cols[(c + r) % cols.length]; g.fillRect(8 + c * 27.5, 20 + r * 38, 25, 35); } g.fillStyle = "#333"; g.font = "bold 16px Inter"; g.fillText("TAVOLA PERIODICA", 180, 15); }, false);
    // (la tavola periodica è sulla lavagna interattiva)
    // cartellone del pH: gli stessi colori e numeri dell'enigma (indicatore al cavolo rosso)
    const scale = [...GAME.puzzles.phchart.body.matchAll(/--c:(#[0-9a-fA-F]{3,6});--i:\d+"><b>(\d+)<\/b><span>([^<]+)/g)].map((m) => [m[1], m[2], m[3]]);
    const ph = canvasTex(768, 384, (g, w, h) => {
      g.fillStyle = "#fffdf5"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#222"; g.font = "bold 40px Inter, sans-serif"; g.textAlign = "center"; g.fillText("Indicatore al cavolo rosso", w / 2, 56);
      const bw = (w - 40) / Math.max(1, scale.length);
      scale.forEach(([c, n, t], i) => { g.fillStyle = c; g.fillRect(20 + i * bw + 4, 90, bw - 8, 150); g.fillStyle = "#222"; g.font = "bold 40px Inter, sans-serif"; g.fillText("pH " + n, 20 + i * bw + bw / 2, 300); g.font = "19px Inter, sans-serif"; g.fillText(t, 20 + i * bw + bw / 2, 340); });
    }, false);
    local(C.x0 + 0.14, 3.2, FACE.w, () => { box(-1.35, 1.05, -0.02, 1.35, 2.45, 0, MAT.wood, false); quad([-1.3, 1.1, 0.005], [1.3, 1.1, 0.005], [1.3, 2.4, 0.005], [-1.3, 2.4, 0.005], [0, 0, 1, 0, 1, 1, 0, 1], std({ map: ph, emissive: 0x222222 })); });
    // le tre provette dell'enigma, con i loro colori e i cartellini
    const tubes = [...GAME.puzzles.chimica.body.matchAll(/<rect[^>]*x="3" y="45"[^>]*fill="([^"]+)"[\s\S]*?<text[^>]*>([^<]+)<\/text>/g)].map((m) => [m[1], m[2]]);
    box(7.1, 0.92, 4.6, 8.9, 0.96, 5.0, MAT.lightwood, false); box(7.1, 1.18, 4.6, 8.9, 1.22, 5.0, MAT.lightwood, false);
    for (const x of [7.15, 8.85]) box(x - 0.03, 0.92, 4.6, x + 0.03, 1.22, 5.0, MAT.lightwood, false);
    tubes.slice(0, 3).forEach(([c, label], i) => {
      const x = 7.5 + i * 0.5;
      const glassT = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 16, 1, true), MAT.glass); glassT.position.set(x, 1.15, 4.8); K.scene.add(glassT);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.26, 16), std({ color: c, emissive: c, emissiveIntensity: 0.25, roughness: 0.2 })); liq.position.set(x, 1.07, 4.8); K.scene.add(liq);
      const tag = canvasTex(128, 48, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#222"; g.font = "bold 26px Inter, sans-serif"; g.textAlign = "center"; g.fillText(label, w / 2, 33); }, false);
      local(x, 5.01, 0, () => quad([-0.2, 0.93, 0], [0.2, 0.93, 0], [0.2, 1.08, 0], [-0.2, 1.08, 0], [0, 0, 1, 0, 1, 1, 0, 1], std({ map: tag })));
    });
    const note = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#fff59d"; g.fillRect(0, 0, w, h); g.fillStyle = "#333"; g.font = "italic 22px Georgia"; g.fillText("Il codice è il pH", 20, 50); g.fillText("delle provette,", 20, 80); g.fillText("da sinistra a destra", 20, 110); }, false);
    local(9.4, 4.85, 0, () => quad([-0.15, 0.925, 0.12], [0.15, 0.925, 0.12], [0.15, 0.925, -0.12], [-0.15, 0.925, -0.12], [0, 0, 1, 0, 1, 1, 0, 1], std({ map: note })));
    react("chimica", () => { const l = new THREE.PointLight(0x9cff9c, 1.5, 3); l.position.set(8, 1.6, 5); K.scene.add(l); });
    for (let k = 0; k < 4; k++) chair(4.5 + k * 2.5, 6.2, Math.PI, MAT.darkgrey);
    exitSign(C.x1 - 0.14, 8.8, FACE.e); extinguisher(C.x1 - 0.12, 10.3, FACE.e); radiator(C.x0 + 0.13, 4.8, FACE.w);
  }

  // ===== 2. OFFICINA MECCANICA (torni su pedane di legno, fresa, macchina CNC, banchi) =====
  {
    const O = R.officina; ceilingLights(O, 4.5, 4.5, 1.4, 0.3);
    for (const [x, z] of [[103.5, 2.5], [103.5, 7], [112, 3.5], [112, 7]]) machineLathe(x, z, 0);
    // fresa verticale
    box(116, 0, 10.5, 117.3, 1.0, 11.8, MAT.machine); box(116.3, 1.0, 10.6, 117, 2.3, 11.1, MAT.machine); box(115.9, 1.6, 10.9, 117.4, 1.8, 11.9, MAT.machine); cyl(116.65, 1.1, 11.4, 0.05, 1.6, MAT.alu, 8); block(115.9, 10.5, 117.4, 11.9);
    // macchina CNC bianca e fucsia
    box(108, 0, 0.4, 111, 2.3, 2.9, std({ color: 0xece6ea })); box(108.2, 0.9, 2.9, 110.8, 2.0, 2.95, std({ color: 0xc2185b }), false); box(108.6, 1.0, 2.96, 110.2, 1.9, 2.97, MAT.glass, false); block(108, 0.4, 111, 2.9);
    // banco da lavoro con il disegno tecnico (enigma)
    box(107, 0.85, 8, 111, 0.92, 9.2, MAT.lightwood); box(107.1, 0, 8.05, 107.3, 0.85, 9.15, MAT.darkgrey); box(110.7, 0, 8.05, 110.9, 0.85, 9.15, MAT.darkgrey); block(107, 8, 111, 9.2);
    const svg = (GAME.puzzles.tornio.body.match(/<svg[\s\S]*?<\/svg>/) || [""])[0];
    const noteT = (GAME.puzzles.tornio.body.match(/Nota a matita: "([^"]+)"/) || [, ""])[1];
    const draw = svgTex(svg, 840, 340, "#e3f2fd", "#0d47a1");
    local(109, 8.55, 0, () => { quad([-0.85, 0.925, 0.36], [0.85, 0.925, 0.36], [0.85, 0.925, -0.33], [-0.85, 0.925, -0.33], [0, 0, 1, 0, 1, 1, 0, 1], std({ map: draw, emissive: 0x111111 })); });
    const pen = canvasTex(256, 64, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#555"; g.font = "italic 22px Georgia"; g.fillText(noteT, 10, 40); }, false);
    local(110.3, 8.95, 0, () => quad([-0.35, 0.926, 0.08], [0.35, 0.926, 0.08], [0.35, 0.926, -0.08], [-0.35, 0.926, -0.08], [0, 0, 1, 0, 1, 1, 0, 1], std({ map: pen })));
    // lucchetto della porta con la scritta "lunghezza totale in mm"
    const lockTag = canvasTex(256, 64, (g, w, h) => { g.fillStyle = "#ffd54f"; g.fillRect(0, 0, w, h); g.fillStyle = "#222"; g.font = "bold 22px Inter"; g.textAlign = "center"; g.fillText("lunghezza totale in mm", w / 2, 40); }, false);
    local(115.5, 0.15, 0, () => quad([-0.45, 1.3, 0.02], [0.45, 1.3, 0.02], [0.45, 1.52, 0.02], [-0.45, 1.52, 0.02], [0, 0, 1, 0, 1, 1, 0, 1], std({ map: lockTag })));
    box(110.2, 0.92, 8.3, 110.6, 0.97, 8.5, MAT.alu, false); cyl(108, 0.92, 8.4, 0.03, 1.05, MAT.alu, 8);
    // pannello attrezzi a muro, banchi degli studenti, lavagna
    box(O.x0 + 0.14, 1.1, 10.5, O.x0 + 0.2, 2.2, 13.5, std({ color: 0x8d6e63 }), false);
    for (let k = 0; k < 8; k++) box(O.x0 + 0.2, 1.3 + (k % 3) * 0.3, 10.8 + k * 0.33, O.x0 + 0.26, 1.5 + (k % 3) * 0.3, 10.86 + k * 0.33, MAT.alu, false);
    for (let k = 0; k < 4; k++) { desk(104 + k * 1.3, 12.6, 0, 1.2, 0.6, std({ color: 0x2bb39a })); chair(104 + k * 1.3, 13.3, 0, MAT.orangeChair); }
    block(103.3, 12.3, 108.6, 12.9);
    greyCabinet(O.x1 - 0.44, 6, FACE.e, 3, 2);
    box(O.x0 + 0.13, 1, 4, O.x0 + 0.18, 2.4, 8, MAT.white, false);
    exitSign(115.5, O.z0 + 0.14, FACE.n); extinguisher(O.x1 - 0.12, 2, FACE.e);
  }

  // ===== 3. LABORATORIO DI PNEUMATICA (banchi con i pannelli rossi, compressore, quadro elettrico) =====
  {
    const P = R.pneumatica; ceilingLights(P, 3.4, 4, 1.4, 0.25);
    for (const [x, z, ry] of [[204.5, 4.5, 0], [210, 4.5, 0], [204.5, 8.8, Math.PI], [210, 8.8, Math.PI]]) {
      desk(x, z, ry, 3, 1, std({ color: 0xa08e6a }), 0.8); blockRot(x, z, ry, 3, 1);
      pneumaticPanel(x + Math.sin(ry) * -0.44, z + Math.cos(ry) * -0.44, ry);
      for (let k = 0; k < 2; k++) chair(x - 0.7 + k * 1.4, z + Math.cos(ry) * 0.8, ry + Math.PI, MAT.orangeChair);
    }
    // compressore rosso e tubi
    box(211, 0.15, 1, 212.6, 0.75, 1.6, MAT.red); cyl(211.4, 0, 1.3, 0.12, 0.15, MAT.black, 10); cyl(212.2, 0, 1.3, 0.12, 0.15, MAT.black, 10); box(211.4, 0.75, 1.1, 211.9, 1.05, 1.5, MAT.darkgrey); block(211, 1, 212.6, 1.6);
    // quadro elettrico (enigma del circuito): 4 interruttori A B C D e 3 lampadine (rossa, gialla, verde)
    box(P.x1 - 0.42, 0.7, 5.4, P.x1 - 0.14, 2.4, 7.6, std({ color: 0xd9d4c4, metalness: 0.2 }), true); block(P.x1 - 0.45, 5.4, P.x1, 7.6);
    const lamps = [0xff3d3d, 0xffd600, 0x00e676].map((c, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), std({ color: 0x444444, emissive: 0x000000 })); m.position.set(P.x1 - 0.44, 2.1, 6 + i * 0.5); K.scene.add(m); m.userData.c = c; return m; });
    const levers = ["A", "B", "C", "D"].map((L, i) => {
      const z = 5.85 + i * 0.43;
      box(P.x1 - 0.44, 1.05, z - 0.09, P.x1 - 0.42, 1.55, z + 0.09, MAT.black, false);
      const lv = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.06), std({ color: 0xeeeeee })); lv.position.set(P.x1 - 0.5, 1.2, z); K.scene.add(lv);
      const lab = canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#111"; g.font = "bold 44px Inter"; g.textAlign = "center"; g.fillText(L, 32, 48); }, false);
      local(P.x1 - 0.415, z, FACE.e, () => quad([-0.07, 1.6, 0], [0.07, 1.6, 0], [0.07, 1.74, 0], [-0.07, 1.74, 0], [0, 0, 1, 0, 1, 1, 0, 1], std({ map: lab })));
      return lv;
    });
    react("circuito", () => { lamps.forEach((m) => { m.material.color.setHex(m.userData.c); m.material.emissive.setHex(m.userData.c); m.material.emissiveIntensity = 1.4; }); [1, 0, 1, 0].forEach((on, i) => (levers[i].position.y = on ? 1.4 : 1.2)); const l = new THREE.PointLight(0xffffcc, 1.2, 4); l.position.set(P.x1 - 0.8, 2.1, 6.5); K.scene.add(l); });
    // armadio con i componenti e lavagna
    greyCabinet(P.x0 + 0.44, 7, FACE.w, 3, 2);
    box(P.x1 - 0.14, 1, 1.5, P.x1 - 0.12, 2.3, 4.5, MAT.white, false);
    exitSign(202.5, P.z0 + 0.14, FACE.n); extinguisher(P.x1 - 0.12, 10.5, FACE.e); radiator(207, P.z1 - 0.14, FACE.s, 2);
  }

  // ===== 4. MUSEO ZOOMATE (pannelli con gli uccelli, schermi nelle cornici arancioni e verdi, vetrina, cassa) =====
  {
    const Z = R.zoomate; ceilingLights(Z, 3.4, 3.4, 1.2, 0.25);
    box(304.4, 0, 3.5, 304.6, 2.8, 8, MAT.labWhite, true); block(304.4, 3.5, 304.6, 8);
    picture("quadri_uccelli", 304.39, 1.7, 5.75, 3.6, 1.8, -Math.PI / 2, MAT.labWhite);
    picture("quadri_uccelli", 304.61, 1.7, 5.75, 3.6, 1.8, Math.PI / 2, MAT.labWhite);
    wallPic(Z, "n", 303.5, "quadri_uccelli", 1.75, 4.2, 2.1, MAT.labWhite);
    wallPic(Z, "s", 311, "poster_zoomate", 1.5, 1.2, 1.8, MAT.wood);
    for (const [side, t, col] of [["e", 9.5, MAT.orange], ["s", 303, MAT.green]]) {
      const [x, z, ry] = onWall(Z, side, t, 0.13);
      local(x, z, ry, () => box(-0.9, 0.9, 0, 0.9, 2.4, 0.25, col));
      picture("schermo_zoomate", x + Math.sin(ry) * 0.26, 1.65, z + Math.cos(ry) * 0.26, 1.2, 1.1, ry, col);
    }
    wallPic(Z, "w", 6, "quadri_uccelli", 1.75, 4, 2, MAT.labWhite);
    // vetrina con i reperti (solo da guardare)
    displayCase(Z.x1 - 0.4, 4, FACE.e, 1.8, 2, 0.5, "instr");
    // i quattro schermi interattivi del museo (enigma: ripeti la sequenza di luci)
    const scr = [0xff4d4d, 0x4d9dff, 0xffd84d, 0x5ee07a].map((c, i) => {
      const x = 307.5 + i * 1.4;
      box(x - 0.62, 1.15, 0.14, x + 0.62, 2.45, 0.3, std({ color: c, roughness: 0.4 }), true);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.95), std({ color: 0x0b0f14, emissive: c, emissiveIntensity: 0.12 })); m.position.set(x, 1.8, 0.31); K.scene.add(m);
      return m;
    });
    block(306.8, 0.14, 312.6, 0.32);
    const pulse = (t) => scr.forEach((m, i) => (m.material.emissiveIntensity = 0.12 + 0.18 * Math.max(0, Math.sin(t * 2.2 - i * 1.3))));
    (function anim() { if (!scr.solved) pulse(performance.now() / 1000); requestAnimationFrame(anim); })();
    react("simon", () => { scr.solved = true; scr.forEach((m) => (m.material.emissiveIntensity = 1.2)); });
    // cassa del sigillo sotto il quadro grande
    box(304.7, 0, 0.4, 306.3, 0.75, 1.4, MAT.pallet, true); box(304.65, 0.72, 0.35, 306.35, 0.8, 1.45, std({ color: 0x5d3a1a }), true); for (const x of [304.9, 306.1]) box(x - 0.05, 0.3, 1.4, x + 0.05, 0.6, 1.43, std({ color: 0xd4af37, metalness: 0.7 }), false); block(304.7, 0.3, 306.3, 1.45);
    for (let k = 0; k < 5; k++) chair(309 + k * 0.62, 10.6, Math.PI);
    box(302, 0, 9.5, 304.4, 0.75, 10.7, MAT.labWhite); box(302.2, 0.75, 9.7, 304.2, 0.78, 10.5, std({ color: 0x111111, emissive: 0x1565c0, emissiveIntensity: 0.4 })); block(302, 9.5, 304.4, 10.7);
    for (const [x, z] of [[313.2, 11.2], [313.2, 0.8], [300.8, 11.2]]) { cyl(x, 0, z, 0.25, 0.6, MAT.lightwood, 12); for (let k = 0; k < 9; k++) { const g = new THREE.CylinderGeometry(0.01, 0.015, 1.6, 4); g.rotateZ((rnd() - 0.5) * 0.5); g.rotateX((rnd() - 0.5) * 0.5); g.translate(x, 1.3, z); addGeo(g, std({ color: 0xd8c08a }), false); } block(x - 0.3, z - 0.3, x + 0.3, z + 0.3); }
  }
};
