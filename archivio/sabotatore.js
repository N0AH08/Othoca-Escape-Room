/*
 * IL SABOTATORE DELL'OTHOCA
 * --------------------------
 * Gioco secondario di deduzione: tra i robot della scuola si nasconde un sabotatore che spegne
 * gli altri robot quando nessuno guarda. Si vince completando le attività nei laboratori
 * oppure scoprendo il sabotatore durante le riunioni di emergenza.
 * Tutto in un canvas 2D con vista dall'alto. Nessuna libreria esterna.
 */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const WORLD_W = 2400, WORLD_H = 1600;
  const VISION = 280;           // raggio di visione del giocatore (px del mondo)
  const PLAYER_SPEED = 175, BOT_SPEED = 118;
  const KILL_RANGE = 70, WITNESS_RANGE = 300, BODY_SEE = 220, SIGHT = 260;
  const BOT_TASKS = 3;          // attività che ogni robot innocente deve completare

  // ---------- Mappa ----------
  const ROOMS = {
    lab:   { name: "Lab. Informatica", r: [100, 100, 500, 380] },
    chim:  { name: "Chimica",          r: [1800, 100, 500, 380] },
    bib:   { name: "Biblioteca",       r: [100, 620, 500, 360] },
    tor:   { name: "Torneria",         r: [1800, 620, 500, 360] },
    mensa: { name: "Mensa",            r: [100, 1120, 500, 380] },
    pal:   { name: "Palestra",         r: [1800, 1120, 500, 380] },
    atrio: { name: "Atrio",            r: [850, 560, 700, 480] }
  };
  const CORRIDORS = [
    [560, 230, 1280, 140], [1130, 330, 140, 270], [560, 1250, 1280, 140], [1130, 1000, 140, 290],
    [560, 730, 330, 140], [1510, 730, 330, 140], [290, 440, 140, 220], [290, 940, 140, 220],
    [1990, 440, 140, 220], [1990, 940, 140, 220]
  ];
  const RECTS = [...Object.values(ROOMS).map((r) => r.r), ...CORRIDORS];
  const inRect = (x, y, r, m = 0) => x >= r[0] + m && x <= r[0] + r[2] - m && y >= r[1] + m && y <= r[1] + r[3] - m;
  const walkable = (x, y, rad) => RECTS.some((r) => inRect(x, y, r, rad));
  function roomAt(x, y) { for (const [k, v] of Object.entries(ROOMS)) if (inRect(x, y, v.r)) return k; return "corr"; }
  const roomName = (k) => (k === "corr" ? "un corridoio" : ROOMS[k].name);
  const roomNameIn = (k) => (k === "corr" ? "in corridoio" : k === "atrio" ? "nell'Atrio" : k === "mensa" || k === "pal" || k === "bib" || k === "chim" || k === "tor" ? "in " + ROOMS[k].name : "nel " + ROOMS[k].name);

  // Grafo per i robot automatici
  const NODES = {
    lab: [350, 290], chim: [2050, 290], bib: [350, 800], tor: [2050, 800], mensa: [350, 1310], pal: [2050, 1310], atrio: [1200, 800],
    nN: [1200, 300], nS: [1200, 1320], nW: [725, 800], nE: [1675, 800], nLB: [360, 550], nBM: [360, 1050], nCT: [2060, 550], nTP: [2060, 1050]
  };
  const EDGES = [["lab", "nN"], ["nN", "chim"], ["nN", "atrio"], ["atrio", "nS"], ["nS", "mensa"], ["nS", "pal"], ["atrio", "nW"], ["nW", "bib"],
    ["atrio", "nE"], ["nE", "tor"], ["lab", "nLB"], ["nLB", "bib"], ["bib", "nBM"], ["nBM", "mensa"], ["chim", "nCT"], ["nCT", "tor"], ["tor", "nTP"], ["nTP", "pal"]];
  const ADJ = {}; for (const [a, b] of EDGES) { (ADJ[a] = ADJ[a] || []).push(b); (ADJ[b] = ADJ[b] || []).push(a); }
  function bfs(a, b) {
    const prev = { [a]: null }, q = [a];
    while (q.length) { const n = q.shift(); if (n === b) break; for (const m of ADJ[n]) if (!(m in prev)) { prev[m] = n; q.push(m); } }
    const out = []; for (let n = b; n; n = prev[n]) out.unshift(n); return out;
  }
  function nearestNode(x, y) { let best = null, bd = Infinity; for (const [k, p] of Object.entries(NODES)) { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = k; } } return best; }

  // Attività del giocatore (una per stanza) e campanella
  const TASKS = [
    { id: "cavi",     room: "lab",   x: 200,  y: 170,  name: "Collega i cavi di rete",   icon: "🔌" },
    { id: "provette", room: "chim",  x: 2200, y: 170,  name: "Ordina le provette",       icon: "🧪" },
    { id: "tornio",   room: "tor",   x: 2200, y: 690,  name: "Centra il pezzo al tornio", icon: "⚙️" },
    { id: "libri",    room: "bib",   x: 200,  y: 690,  name: "Riordina i libri",         icon: "📚" },
    { id: "pallone",  room: "pal",   x: 2200, y: 1430, name: "Gonfia il pallone",        icon: "🏀" },
    { id: "pixel",    room: "mensa", x: 200,  y: 1430, name: "Disegna il menù a pixel",  icon: "🖥️" },
    { id: "badge",    room: "atrio", x: 960,  y: 620,  name: "Leggi il badge",           icon: "🪪" }
  ];
  const BELL = { x: 1200, y: 760 };

  // ---------- Suoni ----------
  let actx = null, muted = false;
  function tone(f, start, dur, type = "sine", vol = 0.15) {
    if (muted) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    if (actx.state === "suspended") actx.resume();
    const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + start;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const sfx = {
    blip: () => tone(1100, 0, 0.05, "square", 0.04),
    ok: () => { tone(660, 0, 0.15); tone(990, 0.1, 0.3); },
    err: () => { tone(180, 0, 0.15, "square", 0.07); tone(130, 0.1, 0.2, "square", 0.07); },
    alarm: () => { for (let i = 0; i < 4; i++) { tone(880, i * 0.36, 0.18, "sawtooth", 0.08); tone(587, i * 0.36 + 0.18, 0.18, "sawtooth", 0.08); } },
    vote: () => tone(520, 0, 0.1, "triangle", 0.12),
    whoosh: () => { for (let i = 0; i < 8; i++) tone(900 - i * 90, i * 0.05, 0.12, "sine", 0.06); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.45, "triangle", 0.18)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.2, 0.5, "sawtooth", 0.08)),
    zap: () => { tone(1500, 0, 0.08, "square", 0.05); tone(300, 0.05, 0.25, "sawtooth", 0.06); }
  };

  // ---------- Disegno dei robot ----------
  const logoImg = new Image(); logoImg.src = "lib/img/logoOthoca.png";
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16), c = (v) => Math.max(0, Math.min(255, v + amt));
    return "#" + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
  // Robot originale: testa a tamburo con schermo-viso, antenna, corpo tondo, piedini
  function drawBot(g, x, y, color, o = {}) {
    const s = o.scale || 1, dir = o.dir || 1, ph = o.phase || 0;
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(0, 22, 21, 7, 0, 0, Math.PI * 2); g.fill();
    if (o.dead) {
      g.rotate(Math.PI / 2 * 0.9);
      g.fillStyle = shade(color, -40); g.beginPath(); g.arc(4, 4, 15, 0, Math.PI * 2); g.fill();
      rr(g, -30, -12, 30, 22, 7); g.fillStyle = shade(color, -20); g.fill();
      rr(g, -26, -7, 21, 12, 4); g.fillStyle = "#1b1420"; g.fill();
      g.strokeStyle = "#ff6b6b"; g.lineWidth = 2;
      for (const ex of [-20, -11]) { g.beginPath(); g.moveTo(ex - 3, -4); g.lineTo(ex + 3, 2); g.moveTo(ex + 3, -4); g.lineTo(ex - 3, 2); g.stroke(); }
      g.restore();
      // scintille
      const t = performance.now() / 120;
      g.strokeStyle = "rgba(255,230,120,.9)"; g.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const a = t + i * 2.1, r1 = 12 + (i * 5) % 9; g.beginPath(); g.moveTo(x + Math.cos(a) * r1, y - 6 + Math.sin(a) * r1); g.lineTo(x + Math.cos(a) * (r1 + 6), y - 6 + Math.sin(a) * (r1 + 6)); g.stroke(); }
      return;
    }
    // piedini
    const step = Math.sin(ph) * 3;
    g.fillStyle = shade(color, -60);
    rr(g, -11, 12 + step, 8, 9, 3); g.fill(); rr(g, 3, 12 - step, 8, 9, 3); g.fill();
    // braccia
    g.strokeStyle = shade(color, -30); g.lineWidth = 5; g.lineCap = "round";
    g.beginPath(); g.moveTo(-13, 2); g.lineTo(-19, 9 - step); g.moveTo(13, 2); g.lineTo(19, 9 + step); g.stroke();
    // corpo
    const bg = g.createRadialGradient(-5, -2, 2, 0, 4, 18); bg.addColorStop(0, shade(color, 40)); bg.addColorStop(1, color);
    g.fillStyle = bg; g.beginPath(); g.arc(0, 5, 15, 0, Math.PI * 2); g.fill();
    g.strokeStyle = shade(color, -55); g.lineWidth = 1.5; g.stroke();
    if (o.logo && logoImg.complete && logoImg.naturalWidth) {
      g.save(); g.beginPath(); g.arc(0, 7, 7, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.clip();
      g.drawImage(logoImg, -6, 1, 12, 12); g.restore();
    }
    // antenna
    g.strokeStyle = "#cfd3da"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -27); g.lineTo(0, -36); g.stroke();
    g.fillStyle = o.antenna || "#ffd27a"; g.beginPath(); g.arc(0, -38, 3.5, 0, Math.PI * 2); g.fill();
    // testa a tamburo
    rr(g, -17, -29, 34, 24, 8); g.fillStyle = shade(color, 15); g.fill(); g.strokeStyle = shade(color, -55); g.stroke();
    g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(-17, -11, 34, 3);
    // schermo con occhi
    rr(g, -12 + dir * 2, -25, 24, 12, 4); g.fillStyle = "#1b1420"; g.fill();
    const blink = (Math.floor(performance.now() / 160 + (o.seed || 0) * 7) % 30) === 0;
    g.fillStyle = o.eyes || "#9ff6ff";
    if (blink) { g.fillRect(-7 + dir * 2, -19, 5, 1.5); g.fillRect(2 + dir * 2, -19, 5, 1.5); }
    else { g.beginPath(); g.arc(-4.5 + dir * 3, -19, 2.4, 0, Math.PI * 2); g.arc(4.5 + dir * 3, -19, 2.4, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  function portrait(color, o = {}) {
    const c = document.createElement("canvas"); c.width = c.height = 96;
    const g = c.getContext("2d"); drawBot(g, 48, 58, color, { scale: 1.7, ...o }); return c;
  }

  // ---------- Mappa statica ----------
  const mapCanvas = document.createElement("canvas"); mapCanvas.width = WORLD_W; mapCanvas.height = WORLD_H;
  function drawMap() {
    const g = mapCanvas.getContext("2d");
    g.fillStyle = "#0d0a09"; g.fillRect(0, 0, WORLD_W, WORLD_H);
    // muri: rettangoli allargati
    for (const r of RECTS) { g.fillStyle = "#2b211c"; g.fillRect(r[0] - 16, r[1] - 16, r[2] + 32, r[3] + 32); }
    for (const r of RECTS) { g.fillStyle = "#3b2e27"; g.fillRect(r[0] - 6, r[1] - 6, r[2] + 12, r[3] + 12); }
    // corridoi
    for (const r of CORRIDORS) {
      g.fillStyle = "#4a423b"; g.fillRect(...r);
      g.strokeStyle = "rgba(255,255,255,.05)"; g.lineWidth = 2;
      for (let i = r[0]; i < r[0] + r[2]; i += 40) { g.beginPath(); g.moveTo(i, r[1]); g.lineTo(i, r[1] + r[3]); g.stroke(); }
      for (let j = r[1]; j < r[1] + r[3]; j += 40) { g.beginPath(); g.moveTo(r[0], j); g.lineTo(r[0] + r[2], j); g.stroke(); }
    }
    const tiles = (r, a, b, size) => { for (let x = r[0]; x < r[0] + r[2]; x += size) for (let y = r[1]; y < r[1] + r[3]; y += size) { g.fillStyle = ((x - r[0]) / size + (y - r[1]) / size) % 2 ? a : b; g.fillRect(x, y, Math.min(size, r[0] + r[2] - x), Math.min(size, r[1] + r[3] - y)); } };
    const grid = (r, color, size) => { g.strokeStyle = color; g.lineWidth = 1.5; for (let x = r[0]; x <= r[0] + r[2]; x += size) { g.beginPath(); g.moveTo(x, r[1]); g.lineTo(x, r[1] + r[3]); g.stroke(); } for (let y = r[1]; y <= r[1] + r[3]; y += size) { g.beginPath(); g.moveTo(r[0], y); g.lineTo(r[0] + r[2], y); g.stroke(); } };
    const box = (x, y, w, h, fill, stroke) => { rr(g, x, y, w, h, 6); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } };
    // Lab informatica: piastrelle blu, banchi con monitor
    let r = ROOMS.lab.r; g.fillStyle = "#2f3f52"; g.fillRect(...r); grid(r, "rgba(255,255,255,.06)", 50);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const x = 260 + i * 120, y = 260 + j * 110; box(x, y, 90, 40, "#8a6a48", "#5a4430");
      for (let k = 0; k < 2; k++) { box(x + 8 + k * 42, y + 6, 30, 18, "#1b2430", "#0b0f14"); g.fillStyle = "#4dc9f6"; g.fillRect(x + 11 + k * 42, y + 9, 24, 3); }
    }
    // Chimica: piastrelle bianche, banconi con lavandini
    r = ROOMS.chim.r; tiles(r, "#d9dde0", "#cfd4d8", 40);
    for (let j = 0; j < 2; j++) { box(1880, 250 + j * 110, 300, 50, "#f4f6f7", "#9aa3a8"); for (let k = 0; k < 3; k++) { g.fillStyle = "#9aa3a8"; g.beginPath(); g.ellipse(1930 + k * 100, 275 + j * 110, 14, 9, 0, 0, Math.PI * 2); g.fill(); } }
    // Biblioteca: parquet, scaffali con libri
    r = ROOMS.bib.r; g.fillStyle = "#6b4a2f"; g.fillRect(...r);
    for (let y = r[1]; y < r[1] + r[3]; y += 22) { g.fillStyle = (y / 22) % 2 ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.04)"; g.fillRect(r[0], y, r[2], 22); }
    for (let i = 0; i < 3; i++) {
      const x = 300 + i * 95; box(x, 650, 60, 200, "#4a2f1c", "#2b1a0e");
      for (let k = 0; k < 16; k++) { g.fillStyle = ["#c0392b", "#2980b9", "#27ae60", "#f39c12", "#8e44ad"][k % 5]; g.fillRect(x + 6 + (k % 4) * 12, 660 + Math.floor(k / 4) * 46, 9, 38); }
    }
    box(150, 860, 120, 70, "#8a5a34", "#5a3a20");
    // Torneria: cemento, macchine
    r = ROOMS.tor.r; g.fillStyle = "#5d5d58"; g.fillRect(...r); grid(r, "rgba(0,0,0,.12)", 80);
    g.fillStyle = "rgba(255,210,60,.5)"; g.fillRect(1800, 760, 500, 6); g.fillRect(1800, 860, 500, 6);
    for (let i = 0; i < 3; i++) { box(1860 + i * 130, 790, 100, 50, "#5f7a6a", "#2f3d35"); g.fillStyle = "#c9ccd1"; g.beginPath(); g.arc(1890 + i * 130, 815, 12, 0, Math.PI * 2); g.fill(); }
    // Mensa: scacchi, tavoli
    r = ROOMS.mensa.r; tiles(r, "#c9b79c", "#a8957a", 50);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { box(280 + i * 170, 1190 + j * 150, 130, 60, "#e7e1d5", "#8c8475"); }
    // Palestra: campo
    r = ROOMS.pal.r; g.fillStyle = "#c8925a"; g.fillRect(...r);
    for (let x = r[0]; x < r[0] + r[2]; x += 26) { g.fillStyle = (x / 26) % 2 ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.04)"; g.fillRect(x, r[1], 26, r[3]); }
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 4; g.strokeRect(1840, 1150, 420, 320);
    g.beginPath(); g.moveTo(2050, 1150); g.lineTo(2050, 1470); g.stroke(); g.beginPath(); g.arc(2050, 1310, 50, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#3f8fb0"; g.fillRect(1840, 1260, 50, 100); g.fillRect(2210, 1260, 50, 100);
    // Atrio: marmo terracotta, logo al centro, bancone della campanella
    r = ROOMS.atrio.r; tiles(r, "#8a5a44", "#7d503c", 70);
    g.strokeStyle = "rgba(255,230,200,.12)"; g.lineWidth = 3; g.strokeRect(r[0] + 30, r[1] + 30, r[2] - 60, r[3] - 60);
    if (logoImg.complete && logoImg.naturalWidth) { g.globalAlpha = 0.85; g.save(); g.beginPath(); g.arc(1200, 880, 95, 0, Math.PI * 2); g.fillStyle = "#f7efe6"; g.fill(); g.clip(); g.drawImage(logoImg, 1120, 800, 160, 160); g.restore(); g.globalAlpha = 1; }
    box(1150, 735, 100, 50, "#5a3a24", "#2b1a0e");
    // nomi stanze
    g.font = "700 26px Inter, system-ui, sans-serif"; g.textBaseline = "top";
    for (const v of Object.values(ROOMS)) { g.fillStyle = "rgba(0,0,0,.35)"; g.fillText(v.name.toUpperCase(), v.r[0] + 22, v.r[1] + 18); g.fillStyle = "rgba(255,255,255,.55)"; g.fillText(v.name.toUpperCase(), v.r[0] + 20, v.r[1] + 16); }
    // postazioni delle attività
    for (const t of TASKS) { box(t.x - 28, t.y - 20, 56, 40, "#2a2f36", "#111"); }
  }
  drawMap();
  logoImg.onload = drawMap;

  // ---------- Stato del gioco ----------
  const BOT_DEFS = [["Volt", "#f2c14e"], ["Pixel", "#4dc9f6"], ["Ohm", "#5ee07a"], ["Byte", "#a77bf3"], ["Gear", "#f2994a"], ["Laser", "#ff5a5f"], ["Chip", "#e9e9ee"]];
  let G; // stato della partita
  function newGame() {
    const sabIdx = Math.floor(Math.random() * BOT_DEFS.length);
    const robots = [{ id: "me", name: "Tu", color: "#f0559a", isPlayer: true, x: 1200, y: 900, alive: true, phase: 0, dir: 1, history: [], seen: [] }];
    BOT_DEFS.forEach(([name, color], i) => {
      const a = (i / BOT_DEFS.length) * Math.PI * 2;
      robots.push({ id: name, name, color, isSab: i === sabIdx, x: 1200 + Math.cos(a) * 160, y: 810 + Math.sin(a) * 110, alive: true, phase: Math.random() * 6,
        dir: 1, path: [], dwell: 1 + Math.random() * 2, tasksDone: 0, taskTimer: 0, history: [], seen: [], seed: i });
    });
    G = {
      phase: "intro", t: 0, robots, player: robots[0], done: new Set(), botDone: 0, bodies: [], kills: [],
      sabCooldown: 22, bellUsed: false, diary: [], lastDiary: {}, recordTimer: 0, meetings: 0, paused: false
    };
    renderTaskList(); updateBar();
  }
  const bots = () => G.robots.filter((r) => !r.isPlayer);
  const alive = () => G.robots.filter((r) => r.alive);
  const sab = () => G.robots.find((r) => r.isSab);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ---------- HUD ----------
  function renderTaskList() {
    $("#tasklist").innerHTML = TASKS.map((t) => `<li class="${G && G.done.has(t.id) ? "done" : ""}">${t.name} <span class="muted">· ${ROOMS[t.room].name}</span></li>`).join("");
  }
  function progress() {
    const innocentBots = bots().filter((b) => !b.isSab).length;
    return (G.done.size + G.botDone) / (TASKS.length + innocentBots * BOT_TASKS);
  }
  function updateBar() { const p = Math.min(1, progress()); $("#barfill").style.width = p * 100 + "%"; $("#pct").textContent = Math.round(p * 100) + "%"; }
  let toastT = null;
  function toast(msg) { const t = $("#toast"); t.innerHTML = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600); }

  // ---------- Finestre ----------
  const overlay = $("#overlay"), card = $("#card");
  function showCard(html, onReady) { card.innerHTML = html; overlay.hidden = false; card.scrollTop = 0; if (onReady) onReady(card); }
  function hideCard() { overlay.hidden = true; card.innerHTML = ""; }

  // ---------- Input ----------
  const keys = new Set();
  const KM = { KeyW: "u", ArrowUp: "u", KeyS: "d", ArrowDown: "d", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r" };
  addEventListener("keydown", (e) => {
    if (KM[e.code]) { keys.add(KM[e.code]); if (G.phase === "play") e.preventDefault(); }
    if (G.phase === "play") {
      if (e.code === "KeyE") doUse();
      if (e.code === "KeyR") doReport();
      if (e.code === "KeyM") openMap();
    } else if (G.phase === "map" && (e.code === "KeyM" || e.code === "Escape")) closeMap();
  });
  addEventListener("keyup", (e) => { const k = KM[e.code]; if (k) keys.delete(k); });
  addEventListener("blur", () => keys.clear());
  document.querySelectorAll("#dpad [data-k]").forEach((b) => {
    const k = b.dataset.k, on = (e) => { e.preventDefault(); keys.add(k); }, off = () => keys.delete(k);
    b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
  });
  $("#useBtn").addEventListener("click", () => G.phase === "play" && doUse());
  $("#reportBtn").addEventListener("click", () => G.phase === "play" && doReport());
  $("#mapBtn").addEventListener("click", () => (G.phase === "play" ? openMap() : G.phase === "map" && closeMap()));
  $("#muteBtn").addEventListener("click", () => { muted = !muted; $("#muteBtn").textContent = muted ? "🔇" : "🔊"; });
  $("#fsBtn").addEventListener("click", () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) {} });

  // cosa c'è vicino al giocatore
  function nearTask() { return TASKS.find((t) => !G.done.has(t.id) && Math.hypot(t.x - G.player.x, t.y - G.player.y) < 75); }
  function nearBell() { return !G.bellUsed && Math.hypot(BELL.x - G.player.x, BELL.y - G.player.y) < 80; }
  function nearBody() { return G.bodies.find((b) => Math.hypot(b.x - G.player.x, b.y - G.player.y) < 85); }
  function doUse() {
    const t = nearTask();
    if (t) return openTask(t);
    if (nearBell()) { G.bellUsed = true; startMeeting({ caller: G.player, body: null }); }
  }
  function doReport() { const b = nearBody(); if (b) startMeeting({ caller: G.player, body: b }); }

  // ---------- Aggiornamento del mondo ----------
  function updatePlayer(dt) {
    const p = G.player; let dx = 0, dy = 0;
    if (keys.has("u")) dy--; if (keys.has("d")) dy++; if (keys.has("l")) dx--; if (keys.has("r")) dx++;
    if (dx || dy) {
      const l = Math.hypot(dx, dy), sx = (dx / l) * PLAYER_SPEED * dt, sy = (dy / l) * PLAYER_SPEED * dt;
      if (walkable(p.x + sx, p.y + sy, 24)) { p.x += sx; p.y += sy; }
      else if (walkable(p.x + sx, p.y, 24)) p.x += sx;
      else if (walkable(p.x, p.y + sy, 24)) p.y += sy;
      p.phase += dt * 14; if (dx) p.dir = Math.sign(dx);
    }
  }
  function pickDestination(b) {
    const rooms = Object.keys(ROOMS);
    if (b.isSab && G.sabCooldown <= 0) {
      // il sabotatore va a cercare un robot isolato
      const targets = alive().filter((r) => !r.isSab);
      const lonely = targets.filter((r) => !alive().some((o) => o !== r && !o.isSab && dist(o, r) < WITNESS_RANGE));
      const t = (lonely.length ? lonely : targets)[Math.floor(Math.random() * (lonely.length || targets.length))];
      if (t) return roomAt(t.x, t.y) === "corr" ? nearestNode(t.x, t.y) : roomAt(t.x, t.y);
    }
    const cur = roomAt(b.x, b.y);
    let r; do { r = rooms[Math.floor(Math.random() * rooms.length)]; } while (r === cur);
    return r;
  }
  function planPath(b, dest) {
    const start = nearestNode(b.x, b.y), nodes = bfs(start, dest);
    const pts = nodes.map((n) => ({ x: NODES[n][0], y: NODES[n][1] }));
    if (ROOMS[dest]) { // punto a caso nella stanza
      const r = ROOMS[dest].r; pts.push({ x: r[0] + 60 + Math.random() * (r[2] - 120), y: r[1] + 70 + Math.random() * (r[3] - 130) });
    }
    b.path = pts;
  }
  function updateBots(dt) {
    for (const b of bots()) {
      if (!b.alive) continue;
      if (b.path.length) {
        const tgt = b.path[0], dx = tgt.x - b.x, dy = tgt.y - b.y, d = Math.hypot(dx, dy), st = BOT_SPEED * dt;
        if (d <= st) { b.x = tgt.x; b.y = tgt.y; b.path.shift(); if (!b.path.length) b.dwell = 3 + Math.random() * 3; }
        else { b.x += (dx / d) * st; b.y += (dy / d) * st; if (Math.abs(dx) > 1) b.dir = Math.sign(dx); }
        b.phase += dt * 12;
      } else {
        b.dwell -= dt;
        // gli innocenti fanno le loro attività mentre sostano in una stanza
        if (!b.isSab && b.tasksDone < BOT_TASKS && roomAt(b.x, b.y) !== "corr") {
          b.taskTimer += dt;
          if (b.taskTimer > 3.2) {
            b.taskTimer = 0; b.tasksDone++; G.botDone++; updateBar();
            if (progress() >= 1) return endGame(true, "Tutte le attività della scuola sono state completate: il sabotatore non può più fare danni!");
          }
        }
        if (b.dwell <= 0) { b.taskTimer = 0; planPath(b, pickDestination(b)); }
      }
    }
  }
  function updateSaboteur(dt) {
    const s = sab(); if (!s.alive) return;
    G.sabCooldown -= dt;
    if (G.sabCooldown > 0) return;
    const victims = alive().filter((r) => r !== s && dist(r, s) < KILL_RANGE);
    for (const v of victims) {
      const witnesses = alive().filter((o) => o !== s && o !== v && dist(o, s) < WITNESS_RANGE);
      if (witnesses.length) continue;
      if (v.isPlayer && (G.kills.length < 1 || Math.random() > 0.5)) { G.sabCooldown = 3; return; }
      v.alive = false;
      const body = { victim: v, x: v.x, y: v.y, room: roomAt(v.x, v.y), t: G.t };
      G.kills.push(body);
      G.sabCooldown = 25 + Math.random() * 10;
      if (v.isPlayer) { sfx.zap(); return endGame(false, `<b>${s.name}</b> ti ha spento mentre eri da solo ${roomNameIn(body.room)}. Era lui il sabotatore!`); }
      G.bodies.push(body);
      planPath(s, pickDestination(s));
      return;
    }
  }
  function updateObservers(dt) {
    G.recordTimer += dt;
    if (G.recordTimer < 0.5) return;
    G.recordTimer = 0;
    const al = alive();
    for (const r of al) {
      r.history.push({ t: G.t, room: roomAt(r.x, r.y) }); if (r.history.length > 240) r.history.shift();
      for (const o of al) if (o !== r && dist(o, r) < SIGHT) { r.seen.push({ t: G.t, who: o, room: roomAt(o.x, o.y) }); if (r.seen.length > 400) r.seen.shift(); }
    }
    // diario del giocatore: chi vede e dove
    for (const o of al) if (!o.isPlayer && dist(o, G.player) < VISION) {
      if (!G.lastDiary[o.id] || G.t - G.lastDiary[o.id] > 6) { G.lastDiary[o.id] = G.t; G.diary.push({ t: G.t, who: o, room: roomAt(o.x, o.y) }); }
    }
    // un innocente vede un robot spento: riunione
    for (const b of G.bodies) {
      if (G.t - b.t < 2) continue;
      const finder = al.find((r) => !r.isPlayer && !r.isSab && dist(r, b) < BODY_SEE);
      if (finder) return startMeeting({ caller: finder, body: b });
    }
  }
  function checkNumbers() {
    const s = sab();
    if (!s.alive) return false;
    const good = alive().filter((r) => !r.isSab).length;
    if (good <= 2) { endGame(false, `Sono rimasti troppo pochi robot: <b>${s.name}</b>, il sabotatore, ha preso il controllo della scuola!`); return true; }
    return false;
  }

  // ---------- Disegno ----------
  const canvas = $("#game"), ctx = canvas.getContext("2d");
  const dark = document.createElement("canvas"), dctx = dark.getContext("2d");
  let zoom = 1, camX = 1200, camY = 800;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; dark.width = canvas.width; dark.height = canvas.height;
    zoom = Math.max(0.55, Math.min(1.25, Math.min(innerWidth / 1150, innerHeight / 780))) * dpr;
  }
  addEventListener("resize", resize); resize();
  function draw() {
    if (canvas.width !== Math.round(innerWidth * Math.min(window.devicePixelRatio || 1, 2))) resize();
    if (!canvas.width || !canvas.height) return; // pannello ancora senza dimensioni
    const W = canvas.width, H = canvas.height, p = G.player;
    camX += (p.x - camX) * 0.15; camY += (p.y - camY) * 0.15;
    const vw = W / zoom, vh = H / zoom;
    const cx = Math.max(vw / 2 - 60, Math.min(WORLD_W - vw / 2 + 60, camX)), cy = Math.max(vh / 2 - 60, Math.min(WORLD_H - vh / 2 + 60, camY));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#0d0a09"; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(zoom, 0, 0, zoom, W / 2 - cx * zoom, H / 2 - cy * zoom);
    ctx.drawImage(mapCanvas, 0, 0);
    const now = performance.now() / 1000;
    // postazioni delle attività
    for (const t of TASKS) {
      const done = G.done.has(t.id);
      ctx.save();
      if (!done) { const a = 0.45 + Math.sin(now * 3) * 0.25; ctx.shadowColor = "#ffd27a"; ctx.shadowBlur = 24; ctx.strokeStyle = `rgba(255,210,122,${a})`; ctx.lineWidth = 3; rr(ctx, t.x - 30, t.y - 22, 60, 44, 8); ctx.stroke(); }
      ctx.font = "26px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.globalAlpha = done ? 0.4 : 1;
      ctx.fillText(done ? "✔" : t.icon, t.x, t.y + 1);
      ctx.restore();
    }
    // campanella
    ctx.save(); ctx.font = "30px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.globalAlpha = G.bellUsed ? 0.35 : 1;
    if (!G.bellUsed) { ctx.shadowColor = "#ff6b6b"; ctx.shadowBlur = 20 + Math.sin(now * 4) * 8; }
    ctx.fillText("🔔", BELL.x, BELL.y); ctx.restore();
    // corpi e robot visibili
    for (const b of G.bodies) if (Math.hypot(b.x - p.x, b.y - p.y) < VISION + 20) drawBot(ctx, b.x, b.y, b.victim.color, { dead: true });
    const vis = alive().filter((r) => r.isPlayer || dist(r, p) < VISION + 10).sort((a, b) => a.y - b.y);
    for (const r of vis) {
      drawBot(ctx, r.x, r.y, r.color, { dir: r.dir, phase: r.phase, logo: r.isPlayer, seed: r.seed });
      ctx.font = "600 13px Inter, system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillText(r.name, r.x + 1, r.y - 47);
      ctx.fillStyle = r.isPlayer ? "#ffb3d3" : "#fff"; ctx.fillText(r.name, r.x, r.y - 48);
    }
    // buio con cerchio di visione
    const sx = W / 2 + (p.x - cx) * zoom, sy = H / 2 + (p.y - cy) * zoom, rad = VISION * zoom;
    dctx.globalCompositeOperation = "source-over"; dctx.clearRect(0, 0, W, H);
    dctx.fillStyle = "rgba(6,4,3,.9)"; dctx.fillRect(0, 0, W, H);
    dctx.globalCompositeOperation = "destination-out";
    const grd = dctx.createRadialGradient(sx, sy, rad * 0.55, sx, sy, rad);
    grd.addColorStop(0, "rgba(0,0,0,1)"); grd.addColorStop(1, "rgba(0,0,0,0)");
    dctx.fillStyle = grd; dctx.beginPath(); dctx.arc(sx, sy, rad, 0, Math.PI * 2); dctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(dark, 0, 0);
    // pulsanti
    $("#useBtn").classList.toggle("on", !!(nearTask() || nearBell()));
    $("#reportBtn").classList.toggle("on", !!nearBody());
  }

  // ---------- Ciclo ----------
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (G.phase === "play") {
      G.t += dt;
      updatePlayer(dt); updateBots(dt); updateSaboteur(dt);
      if (G.phase === "play") updateObservers(dt);
      if (G.phase === "play") checkNumbers();
    }
    draw();
  }

  // ---------- Mini-giochi delle attività ----------
  const shuffle = (a) => { const c = a.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
  let taskCleanup = null;
  function openTask(t) {
    G.phase = "task"; keys.clear();
    showCard(`<div class="in"><p class="kicker">Attività · ${ROOMS[t.room].name}</p><h2>${t.icon} ${t.name}</h2><div id="tbody"></div>
      <div class="row"><button class="btn" id="tclose">Esci</button></div></div>`, (root) => {
      root.querySelector("#tclose").addEventListener("click", closeTask);
      const body = root.querySelector("#tbody");
      const done = () => {
        G.done.add(t.id); renderTaskList(); updateBar(); sfx.ok();
        body.innerHTML = `<div class="taskdone">✔ Attività completata!</div>`;
        setTimeout(() => { closeTask(); toast(`Hai completato: <b>${t.name}</b>`); if (progress() >= 1) endGame(true, "Tutte le attività della scuola sono state completate: il sabotatore non può più fare danni!"); }, 800);
      };
      TASK_GAMES[t.id](body, done);
    });
  }
  function closeTask() { if (taskCleanup) { taskCleanup(); taskCleanup = null; } hideCard(); if (G.phase === "task") G.phase = "play"; }
  const fail = (el) => { sfx.err(); el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); };

  const TASK_GAMES = {
    cavi(body, done) {
      const cols = [["#ff4d4d", "rosso"], ["#4d9dff", "blu"], ["#ffd84d", "giallo"], ["#5ee07a", "verde"]];
      const L = shuffle(cols), R = shuffle(cols);
      body.innerHTML = `<div class="task"><p class="hint">Clicca un cavo a sinistra e poi quello dello stesso colore a destra.</p>
        <div class="wires"><div class="wcol" id="wl">${L.map(([c, n]) => `<div class="wire" data-c="${c}" style="background:${c}" title="${n}"></div>`).join("")}</div><div></div>
        <div class="wcol" id="wr">${R.map(([c, n]) => `<div class="wire" data-c="${c}" style="background:${c}" title="${n}"></div>`).join("")}</div><svg></svg></div></div>`;
      const box = body.querySelector(".wires"), svg = body.querySelector("svg");
      let sel = null, ok = 0;
      body.querySelectorAll("#wl .wire").forEach((w) => w.addEventListener("click", () => { if (w.classList.contains("ok")) return; body.querySelectorAll(".wire.sel").forEach((x) => x.classList.remove("sel")); sel = w; w.classList.add("sel"); sfx.blip(); }));
      body.querySelectorAll("#wr .wire").forEach((w) => w.addEventListener("click", () => {
        if (!sel || w.classList.contains("ok")) return;
        if (w.dataset.c !== sel.dataset.c) { fail(w); return; }
        const b = box.getBoundingClientRect(), a1 = sel.getBoundingClientRect(), a2 = w.getBoundingClientRect();
        const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const x1 = a1.right - b.left, y1 = a1.top + a1.height / 2 - b.top, x2 = a2.left - b.left, y2 = a2.top + a2.height / 2 - b.top, mx = (x1 + x2) / 2;
        line.setAttribute("d", `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`); line.setAttribute("stroke", w.dataset.c); line.setAttribute("stroke-width", "10"); line.setAttribute("fill", "none"); line.setAttribute("stroke-linecap", "round");
        svg.appendChild(line); sel.classList.remove("sel"); sel.classList.add("ok"); w.classList.add("ok"); sel = null; sfx.blip();
        if (++ok === 4) done();
      }));
    },
    provette(body, done) {
      const all = [["#e8344e", 2, "Limone"], ["#f27aa0", 4, "Aceto"], ["#8e4fc4", 7, "Acqua"], ["#3f7fd6", 8, "Bicarbonato"], ["#36b37e", 10, "Sapone"], ["#e3d23a", 13, "Candeggina"]];
      const pick = shuffle(all).slice(0, 4), order = pick.slice().sort((a, b) => a[1] - b[1]);
      body.innerHTML = `<div class="task"><p class="hint">Versa le provette in ordine, dalla più <b>acida</b> (pH basso) alla più <b>basica</b> (pH alto).</p>
        <div class="tubes">${pick.map(([c, , n], i) => `<div style="text-align:center"><div class="tube" data-i="${i}" style="--c:${c}"></div><div class="muted">${n}</div></div>`).join("")}</div>
        <div class="legend">${all.map(([c, ph]) => `<span style="background:${c}">${ph}</span>`).join("")}</div></div>`;
      let step = 0; const tubes = [...body.querySelectorAll(".tube")];
      tubes.forEach((el) => el.addEventListener("click", () => {
        if (el.classList.contains("used")) return;
        if (pick[+el.dataset.i] !== order[step]) { fail(body.querySelector(".tubes")); step = 0; tubes.forEach((x) => x.classList.remove("used")); return; }
        el.classList.add("used"); sfx.blip(); if (++step === 4) done();
      }));
    },
    tornio(body, done) {
      body.innerHTML = `<div class="task"><p class="hint">Premi <b>STOP</b> (o la barra spaziatrice) quando il cursore è nella zona verde. Servono 3 centri.</p>
        <div class="meterwrap"><div class="zone"></div><div class="cursor"></div></div><div class="dots"><i></i><i></i><i></i></div>
        <div style="text-align:center"><button class="btn primary" id="stop">STOP</button></div></div>`;
      const zone = body.querySelector(".zone"), cur = body.querySelector(".cursor"), dots = [...body.querySelectorAll(".dots i")];
      let pos = 0, dir = 1, hits = 0, zs = 0, speed = 70, raf;
      const place = () => { zs = 15 + Math.random() * 65; zone.style.left = zs + "%"; zone.style.width = "14%"; };
      place();
      let lastT = performance.now();
      const anim = (now) => { const dt = (now - lastT) / 1000; lastT = now; pos += dir * speed * dt; if (pos > 100) { pos = 100; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } cur.style.left = pos + "%"; raf = requestAnimationFrame(anim); };
      raf = requestAnimationFrame(anim);
      const stop = () => {
        if (pos >= zs && pos <= zs + 14) { dots[hits].classList.add("on"); hits++; sfx.blip(); speed += 25; if (hits === 3) { cancelAnimationFrame(raf); done(); } else place(); }
        else fail(body.querySelector(".meterwrap"));
      };
      body.querySelector("#stop").addEventListener("click", stop);
      const key = (e) => { if (e.code === "Space") { e.preventDefault(); stop(); } };
      addEventListener("keydown", key);
      taskCleanup = () => { cancelAnimationFrame(raf); removeEventListener("keydown", key); };
    },
    libri(body, done) {
      const nums = new Set(); while (nums.size < 6) nums.add(100 + Math.floor(Math.random() * 800));
      const list = shuffle([...nums]), order = [...nums].sort((a, b) => a - b);
      const colors = ["#c0392b", "#2980b9", "#27ae60", "#f39c12", "#8e44ad", "#16a085"];
      body.innerHTML = `<div class="task"><p class="hint">Rimetti i libri sullo scaffale in ordine di collocazione, dal numero più piccolo al più grande.</p>
        <div class="books">${list.map((n, i) => `<div class="book" data-n="${n}" style="background:${colors[i]};height:${110 + (n % 5) * 12}px">${n}</div>`).join("")}</div></div>`;
      let step = 0; const books = [...body.querySelectorAll(".book")];
      books.forEach((b) => b.addEventListener("click", () => {
        if (b.classList.contains("used")) return;
        if (+b.dataset.n !== order[step]) { fail(body.querySelector(".books")); step = 0; books.forEach((x) => x.classList.remove("used")); return; }
        b.classList.add("used"); sfx.blip(); if (++step === 6) done();
      }));
    },
    pallone(body, done) {
      body.innerHTML = `<div class="task"><p class="hint">Tieni premuto <b>POMPA</b> (o la barra spaziatrice) e lascia quando la pressione è nella zona verde. Attento a non farlo scoppiare!</p>
        <div class="ball"></div><div class="vgauge"><div class="zone" style="left:70%;width:15%"></div><i></i></div>
        <div style="text-align:center;margin-top:12px"><button class="btn primary" id="pump">POMPA</button></div></div>`;
      const ball = body.querySelector(".ball"), gauge = body.querySelector(".vgauge i"), btn = body.querySelector("#pump");
      let p = 0, holding = false, raf, lastT = performance.now(), finished = false;
      const anim = (now) => {
        const dt = (now - lastT) / 1000; lastT = now;
        if (holding) p += 42 * dt; else p = Math.max(0, p - 4 * dt);
        if (p > 100) { p = 0; holding = false; fail(ball); }
        gauge.style.width = p + "%"; ball.style.setProperty("--s", 0.4 + p / 160);
        raf = requestAnimationFrame(anim);
      };
      raf = requestAnimationFrame(anim);
      const press = (e) => { e && e.preventDefault(); holding = true; };
      const release = () => { if (!holding || finished) return; holding = false; if (p >= 70 && p <= 85) { finished = true; cancelAnimationFrame(raf); done(); } else if (p > 5) fail(body.querySelector(".vgauge")); };
      btn.addEventListener("pointerdown", press); btn.addEventListener("pointerup", release); btn.addEventListener("pointerleave", release);
      const kd = (e) => { if (e.code === "Space") { e.preventDefault(); if (!e.repeat) press(); } }, ku = (e) => { if (e.code === "Space") release(); };
      addEventListener("keydown", kd); addEventListener("keyup", ku);
      taskCleanup = () => { cancelAnimationFrame(raf); removeEventListener("keydown", kd); removeEventListener("keyup", ku); };
    },
    pixel(body, done) {
      let target; do { target = Array.from({ length: 16 }, () => Math.random() < 0.45); } while (target.filter(Boolean).length < 5);
      const grid = Array(16).fill(false);
      body.innerHTML = `<div class="task"><p class="hint">Copia il disegno del menù di oggi sul display della mensa.</p>
        <div class="pixrow"><div><div class="muted" style="text-align:center">Modello</div><div class="pgrid small">${target.map((v) => `<i class="${v ? "on" : ""}"></i>`).join("")}</div></div>
        <div class="pgrid" id="pg">${grid.map((_, i) => `<i data-i="${i}"></i>`).join("")}</div></div></div>`;
      body.querySelectorAll("#pg i").forEach((c) => c.addEventListener("click", () => {
        const i = +c.dataset.i; grid[i] = !grid[i]; c.classList.toggle("on", grid[i]); sfx.blip();
        if (grid.every((v, k) => v === target[k])) done();
      }));
    },
    badge(body, done) {
      const n = 3 + Math.floor(Math.random() * 13), bin = n.toString(2).padStart(4, "0");
      body.innerHTML = `<div class="task badge"><p class="hint">Il badge mostra un numero in binario (8 · 4 · 2 · 1). Scrivi il numero in cifre.</p>
        <div class="code">${bin}</div><div class="code" id="typed" style="color:#ffd27a;min-height:62px"></div>
        <div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((k) => `<button data-k="${k}">${k}</button>`).join("")}<button data-k="del">⌫</button><button data-k="ok" style="grid-column:span 4;background:linear-gradient(180deg,#57c27a,#3a9c5b)">OK</button></div></div>`;
      let typed = "";
      const out = body.querySelector("#typed");
      body.querySelectorAll(".keys button").forEach((b) => b.addEventListener("click", () => {
        const k = b.dataset.k; sfx.blip();
        if (k === "del") typed = typed.slice(0, -1);
        else if (k === "ok") { if (+typed === n) return done(); fail(out); typed = ""; }
        else if (typed.length < 2) typed += k;
        out.textContent = typed;
      }));
    }
  };

  // ---------- Mappa ----------
  function openMap() {
    G.phase = "map"; keys.clear();
    const c = document.createElement("canvas"); c.width = 1200; c.height = 800;
    const g = c.getContext("2d"); g.drawImage(mapCanvas, 0, 0, 1200, 800);
    g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, 0, 1200, 800);
    g.font = "22px system-ui"; g.textAlign = "center"; g.textBaseline = "middle";
    for (const t of TASKS) if (!G.done.has(t.id)) { g.fillStyle = "#ffd27a"; g.beginPath(); g.arc(t.x / 2, t.y / 2, 13, 0, Math.PI * 2); g.fill(); g.fillText(t.icon, t.x / 2, t.y / 2 - 26); }
    if (!G.bellUsed) g.fillText("🔔", BELL.x / 2, BELL.y / 2);
    g.fillStyle = "#f0559a"; g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.arc(G.player.x / 2, G.player.y / 2, 11, 0, Math.PI * 2); g.fill(); g.stroke();
    showCard(`<div class="in"><p class="kicker">Mappa della scuola</p><h2>Dove sono le attività?</h2>
      <p class="muted">Pallino rosa = tu · pallini gialli = attività da fare · 🔔 = campanella d'emergenza</p></div>
      <div class="in" id="mapwrap"></div><div class="in"><div class="row"><button class="btn primary" id="mclose">Chiudi (M)</button></div></div>`, (root) => {
      c.className = "minimap"; root.querySelector("#mapwrap").appendChild(c);
      root.querySelector("#mclose").addEventListener("click", closeMap);
    });
  }
  function closeMap() { hideCard(); G.phase = "play"; }

  // ---------- Riunione ----------
  function windowRoom(r, t0, t1) {
    const cnt = {}; for (const h of r.history) if (h.t >= t0 && h.t <= t1) cnt[h.room] = (cnt[h.room] || 0) + 1;
    let best = null, bc = 0; for (const [k, v] of Object.entries(cnt)) if (v > bc) { bc = v; best = k; }
    return best || roomAt(r.x, r.y);
  }
  function startMeeting({ caller, body }) {
    G.phase = "meeting"; keys.clear(); G.meetings++;
    sfx.alarm();
    const s = sab(), al = alive(), talkers = shuffle(al.filter((r) => !r.isPlayer));
    const msgs = [], suspicion = new Map(al.map((r) => [r, 0]));
    const K = body ? { victim: body.victim, room: body.room, t: body.t } : null;
    if (K) msgs.push([caller, caller.isPlayer ? `Ho trovato <b>${K.victim.name}</b> spento ${roomNameIn(K.room)}!` : `Ho trovato <b>${K.victim.name}</b> spento ${roomNameIn(K.room)}! Chi è stato?`]);
    else msgs.push([caller, "Ho suonato la campanella: parliamo un attimo. Qualcuno ha visto qualcosa di strano?"]);
    const t0 = K ? K.t - 7 : G.t - 10, t1 = K ? K.t + 1 : G.t;
    let sabClaim = null;
    for (const r of talkers) {
      if (r === caller && K) continue;
      if (r.isSab) {
        const real = windowRoom(r, t0, t1);
        const options = Object.keys(ROOMS).filter((k) => k !== real && (!K || k !== K.room));
        sabClaim = K ? options[Math.floor(Math.random() * options.length)] : real;
        let txt = `Io ero ${roomNameIn(sabClaim)}, non ho visto niente di strano.`;
        if (K && Math.random() < 0.6) {
          const scapegoat = shuffle(al.filter((o) => !o.isSab && !o.isPlayer && o !== caller))[0];
          if (scapegoat) { txt += ` Però <b>${scapegoat.name}</b> mi sembrava un po' sospetto…`; suspicion.set(scapegoat, suspicion.get(scapegoat) + 0.8); }
        }
        msgs.push([r, txt]);
        continue;
      }
      const where = windowRoom(r, t0, t1);
      let txt = `Io ero ${roomNameIn(where)}.`;
      const seenRecent = r.seen.filter((e) => e.t >= (K ? K.t - 15 : G.t - 15) && e.t <= t1 && e.who.alive !== undefined);
      const sawSab = seenRecent.filter((e) => e.who === s).pop();
      if (K && sawSab) {
        const nearBody = sawSab.room === K.room || (ADJ[K.room] || []).some((n) => roomAt(...NODES[n]) === sawSab.room || n === sawSab.room);
        txt += ` Ho visto <b>${s.name}</b> ${roomNameIn(sawSab.room)} poco prima.`;
        suspicion.set(s, suspicion.get(s) + (sawSab.room === K.room ? 2.5 : nearBody ? 1.5 : 0.8));
      } else {
        const other = seenRecent.filter((e) => e.who !== r && !e.who.isPlayer && e.who.alive && (!K || e.who !== K.victim)).pop();
        if (other) txt += ` Ero insieme a <b>${other.who.name}</b>.`;
      }
      msgs.push([r, txt]);
    }
    // smentita: un innocente che era nella stanza dichiarata dal sabotatore e non l'ha visto
    if (K && sabClaim && s.alive) {
      const denier = talkers.find((r) => !r.isSab && windowRoom(r, t0, t1) === sabClaim && !r.seen.some((e) => e.who === s && e.t >= t0 && e.t <= t1));
      if (denier) { msgs.push([denier, `Aspettate: io ero proprio ${roomNameIn(sabClaim)} e <b>${s.name}</b> non c'era!`]); suspicion.set(s, suspicion.get(s) + 2.5); }
    }
    G.meetingData = { msgs, suspicion, K };
    const diary = G.diary.filter((d) => d.t > (G.lastMeetingT || 0)).slice(-8);
    const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
    showCard(`<div class="in meeting"><p class="kicker">Riunione di emergenza</p><h2>🚨 Chi è il sabotatore?</h2>
      <div class="headline">${K ? `${K.victim.name} è stato spento ${roomNameIn(K.room)} (circa al minuto ${fmt(K.t)}).` : "Campanella d'emergenza suonata dall'Atrio."}</div>
      <div class="chat" id="chat"></div>
      <div class="diary"><b>📒 Il tuo diario</b> (chi hai visto da vicino)${diary.length ? `<ul>${diary.map((d) => `<li>${fmt(d.t)} · <b>${d.who.name}</b> ${roomNameIn(d.room)}</li>`).join("")}</ul>` : `<div class="muted">Non hai visto nessuno da vicino.</div>`}</div>
      <p class="kicker" style="margin-top:14px">Vota chi espellere</p>
      <div class="voters" id="voters"></div>
      <div class="row"><button class="btn" id="skip" disabled>Salta il voto</button></div></div>`, (root) => {
      const chat = root.querySelector("#chat");
      msgs.forEach(([r, txt], i) => setTimeout(() => {
        const m = document.createElement("div"); m.className = "msg";
        m.appendChild(portrait(r.color, { logo: r.isPlayer })); const b = document.createElement("div"); b.className = "b";
        b.innerHTML = `<strong class="who" style="color:${r.color}">${r.name}</strong>${txt}`; m.appendChild(b); chat.appendChild(m); chat.scrollTop = chat.scrollHeight; sfx.blip();
      }, 500 + i * 650));
      const vwrap = root.querySelector("#voters");
      for (const r of G.robots) {
        const btn = document.createElement("button"); btn.className = "voter" + (r.alive ? "" : " dead") + (r.isPlayer ? " me" : "");
        btn.appendChild(portrait(r.color, { logo: r.isPlayer, dead: !r.alive }));
        const lab = document.createElement("span"); lab.innerHTML = r.name + (r.alive ? "" : " ✖"); btn.appendChild(lab);
        const v = document.createElement("span"); v.className = "votes"; btn.appendChild(v); btn.dataset.id = r.id;
        btn.disabled = true;
        btn.addEventListener("click", () => { if (!r.alive || r.isPlayer) return; castVotes(r, root); });
        vwrap.appendChild(btn);
      }
      setTimeout(() => {
        root.querySelectorAll(".voter").forEach((b) => { const r = G.robots.find((x) => x.id === b.dataset.id); b.disabled = !r.alive || r.isPlayer; });
        const sk = root.querySelector("#skip"); sk.disabled = false; sk.addEventListener("click", () => castVotes(null, root));
      }, 500 + msgs.length * 650);
    });
  }
  function castVotes(choice, root) {
    root.querySelectorAll(".voter, #skip").forEach((b) => (b.disabled = true));
    sfx.vote();
    const { suspicion } = G.meetingData, al = alive(), s = sab();
    const votes = new Map(); // target(null=salta) -> elettori
    const add = (t, voter) => { if (!votes.has(t)) votes.set(t, []); votes.get(t).push(voter); };
    add(choice, G.player);
    for (const b of al.filter((r) => !r.isPlayer)) {
      if (b.isSab) {
        const pool = al.filter((r) => !r.isSab && !r.isPlayer);
        const top = pool.sort((a, c) => suspicion.get(c) - suspicion.get(a))[0];
        add(top && Math.random() < 0.7 ? top : null, b);
        continue;
      }
      let best = null, bs = 0;
      for (const [r, v] of suspicion) if (r !== b && !r.isPlayer && r.alive && v > bs) { bs = v; best = r; }
      add(bs >= 1.5 ? best : (choice && Math.random() < 0.35 ? choice : null), b);
    }
    // mostra i voti
    for (const [t, voters] of votes) {
      const el = t ? root.querySelector(`.voter[data-id="${t.id}"]`) : root.querySelector("#skip");
      if (!el) continue;
      if (t) { el.classList.add("chosen"); el.querySelector(".votes").innerHTML = voters.map((v) => `<i style="--c:${v.color}"></i>`).join(""); }
      else el.textContent = `Salta il voto (${voters.length})`;
    }
    let top = null, topN = 0, tie = false;
    for (const [t, voters] of votes) { if (voters.length > topN) { top = t; topN = voters.length; tie = false; } else if (voters.length === topN) tie = true; }
    const ejected = !tie && top ? top : null;
    setTimeout(() => showEject(ejected), 1800);
  }
  function showEject(r) {
    G.lastMeetingT = G.t;
    let html;
    if (!r) html = `<div class="eject"><h2>Nessuno è stato espulso</h2><p class="muted">I voti erano in parità o avete saltato il voto.</p></div>`;
    else {
      r.alive = false; r.ejected = true;
      html = `<div class="eject" id="ej"></div><h2 style="text-align:center">${r.name} ${r.isSab ? "<span style='color:#ff8a7a'>era il sabotatore!</span>" : "non era il sabotatore…"}</h2>
        <p class="muted" style="text-align:center">${r.isSab ? "La scuola è salva." : `Il sabotatore è ancora tra voi. Restano ${alive().filter((x) => x.isSab).length} sabotatore e ${alive().filter((x) => !x.isSab).length} robot onesti.`}</p>`;
      sfx.whoosh();
    }
    showCard(`<div class="in">${html}<div class="row"><button class="btn primary" id="cont">Continua</button></div></div>`, (root) => {
      if (r) root.querySelector("#ej").appendChild(portrait(r.color, { logo: r.isPlayer }));
      root.querySelector("#cont").addEventListener("click", () => {
        if (r && r.isSab) return endGame(true, `Avete espulso <b>${r.name}</b>: era proprio lui il sabotatore!`);
        afterMeeting();
      });
    });
  }
  function afterMeeting() {
    hideCard();
    G.bodies = [];
    // tutti tornano nell'atrio
    alive().forEach((r, i) => { const a = (i / alive().length) * Math.PI * 2; r.x = 1200 + Math.cos(a) * 150; r.y = 820 + Math.sin(a) * 100; r.path = []; r.dwell = 0.5 + Math.random() * 2; });
    G.player.x = 1200; G.player.y = 900;
    G.sabCooldown = Math.max(G.sabCooldown, 20);
    G.phase = "play";
    if (!checkNumbers()) toast("La riunione è finita: torniamo al lavoro!");
  }

  // ---------- Inizio e fine ----------
  function endGame(win, text) {
    G.phase = "end"; keys.clear();
    if (taskCleanup) { taskCleanup(); taskCleanup = null; }
    win ? sfx.win() : sfx.lose();
    const s = sab();
    showCard(`<div class="in bigend"><div class="emoji">${win ? "🏆" : "🤖💥"}</div><p class="kicker">${win ? "Vittoria" : "Sconfitta"}</p>
      <h1>${win ? "Ce l'avete fatta!" : "Il sabotatore ha vinto"}</h1><p>${text}</p>
      <div style="display:flex;justify-content:center;margin:10px 0" id="sabp"></div>
      <p class="muted">Il sabotatore era <b style="color:${s.color}">${s.name}</b>. Attività completate: ${Math.round(Math.min(1, progress()) * 100)}%.</p>
      <div class="row" style="justify-content:center"><a class="btn" href="index.html">Torna all'escape room</a><button class="btn primary" id="again">Gioca ancora</button></div></div>`, (root) => {
      root.querySelector("#sabp").appendChild(portrait(s.color));
      root.querySelector("#again").addEventListener("click", () => { hideCard(); newGame(); showIntro(); });
    });
  }
  function showIntro() {
    showCard(`<div class="in"><p class="kicker">Gioco secondario · ITIS Othoca</p><h1>Il Sabotatore dell'Othoca</h1>
      <p>Tra gli 8 robot della scuola si nasconde un <b>sabotatore</b>: quando nessuno guarda, spegne gli altri robot.
      Tu sei il <b style="color:#f0559a">robot rosa</b> con il logo dell'Othoca.</p>
      <div class="rules">
        <div><b>🛠️ Completa le attività</b>In ogni stanza c'è un'attività da fare. Quando la barra arriva al 100% avete vinto.</div>
        <div><b>🔦 Guarda bene</b>Vedi solo i robot vicino a te. Ricorda chi incontri e dove: lo trovi nel diario.</div>
        <div><b>🚨 Segnala</b>Se trovi un robot spento, premi SEGNALA. Nell'Atrio c'è una campanella d'emergenza (1 sola volta).</div>
        <div><b>🗳️ Vota</b>Nella riunione ascolta i robot: il sabotatore mente! Se espellete il sabotatore, avete vinto.</div>
      </div>
      <p class="muted">Comandi: <b>WASD</b> o frecce per muoverti · <b>E</b> usa · <b>R</b> segnala · <b>M</b> mappa. Su tablet usa i pulsanti sullo schermo.
      Non restare da solo troppo a lungo…</p>
      <div class="row"><a class="btn" href="index.html">Escape room</a><button class="btn primary" id="go">Inizia</button></div></div>`, (root) => {
      root.querySelector("#go").addEventListener("click", () => { hideCard(); G.phase = "play"; tone(660, 0, 0.1); toast("Trova le attività: premi <b>M</b> per la mappa"); });
    });
  }

  // comando di prova per verificare il gioco dalla console
  window.Sabotatore = { stato: () => G, sabotatore: () => sab().name, fine: endGame };

  newGame(); showIntro(); requestAnimationFrame(loop);
})();
