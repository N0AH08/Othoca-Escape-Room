/*
 * DEMO "LABORATORIO IN QUARANTENA" — escape room di una sola stanza
 * Foto: Laboratorio di Chimica dal tour Othoca360 (classe 4E Informatica, a.s. 2020-21).
 * Due enigmi obbligatori per uscire:
 *   1) neutralizzare la soluzione sotto la cappa (serve il kit dell'armadio)  -> prime 2 cifre
 *   2) ripristinare la corrente dal quadro (serve il fusibile della cattedra)  -> ultime 2 cifre sui computer
 */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Partita (un po' diversa ogni volta) ----------
  const LINES = [
    { n: 1, name: "Linea 1" }, { n: 2, name: "Linea 2" }, { n: 3, name: "Linea 3" }, { n: 4, name: "Linea 4" }
  ];
  function newGame() {
    const pcPair = [[1, 3], [2, 4], [1, 4], [2, 3]][rnd(0, 3)];
    const others = [1, 2, 3, 4].filter((x) => !pcPair.includes(x));
    return {
      start: null, end: null, hints: 0,
      codeA: String(rnd(10, 99)), codeB: String(rnd(10, 99)),
      startPH: rnd(1, 3), ph: 0,
      doses: { soda: 1, bic: 3, ace: 2 },
      pcLines: pcPair, hoodLine: others[0], acLine: others[1],
      kit: false, fuse: false, fuseIn: false, levers: [false, false, false, false],
      beakerDone: false, power: false, pcRead: false, seen: new Set(), muted: false
    };
  }
  let S = newGame();
  S.ph = S.startPH;

  // ---------- Suoni ----------
  let ac = null;
  const audio = () => { if (S.muted) return null; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) { return null; } return ac; };
  function tone(f, t0, d, type = "sine", v = 0.15, f2) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, a.currentTime + t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, a.currentTime + t0 + d);
    g.gain.setValueAtTime(0.0001, a.currentTime + t0); g.gain.exponentialRampToValueAtTime(v, a.currentTime + t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + d);
    o.connect(g).connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + d + 0.05);
  }
  function noise(d, v = 0.2, freq = 1200) {
    const a = audio(); if (!a) return;
    const b = a.createBuffer(1, a.sampleRate * d, a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; f.type = "bandpass"; f.frequency.value = freq; g.gain.value = v;
    s.connect(f).connect(g).connect(a.destination); s.start();
  }
  const sfx = {
    click: () => tone(900, 0, 0.05, "square", 0.04),
    drop: () => { tone(1400, 0, 0.12, "sine", 0.12, 500); tone(700, 0.08, 0.1, "sine", 0.06, 300); },
    pick: () => { tone(660, 0, 0.12); tone(990, 0.08, 0.2); },
    ok: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.1, 0.35, "triangle", 0.14)),
    err: () => { tone(200, 0, 0.18, "square", 0.07); tone(150, 0.12, 0.22, "square", 0.07); },
    spark: () => { noise(0.35, 0.35, 2500); tone(120, 0, 0.3, "sawtooth", 0.08); },
    power: () => { tone(60, 0, 1.4, "sawtooth", 0.06, 120); tone(240, 0.3, 1.2, "sine", 0.05, 480); },
    beep: () => tone(1046, 0, 0.09, "square", 0.05),
    alarm: () => { tone(880, 0, 0.18, "square", 0.025); tone(660, 0.22, 0.18, "square", 0.025); },
    door: () => { noise(0.6, 0.25, 400); tone(300, 0.2, 0.5, "sine", 0.1, 600); },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.5, "triangle", 0.15))
  };
  setInterval(() => { if (!S.power && S.start && $("#ov").hidden) sfx.alarm(); }, 7000);

  // ---------- Foto 360° ----------
  const LEVELS = [{ tileSize: 256, size: 256, fallbackOnly: true }, { tileSize: 512, size: 512 }, { tileSize: 512, size: 1024 }, { tileSize: 512, size: 2048 }];
  const viewer = new Marzipano.Viewer($("#pano"), { controls: { mouseViewMode: "drag" } });
  const base = "tiles/21-22laboratoriochimica";
  const view = new Marzipano.RectilinearView({ yaw: -0.25, pitch: 0.05, fov: 1.45 },
    Marzipano.util.compose(Marzipano.RectilinearView.limit.vfov(0.55, 1.75), Marzipano.RectilinearView.limit.pitch(-1.2, 1.2)));
  const scene = viewer.createScene({
    source: Marzipano.ImageUrlSource.fromString(base + "/{z}/{f}/{y}/{x}.jpg", { cubeMapPreviewUrl: base + "/preview.jpg" }),
    geometry: new Marzipano.CubeGeometry(LEVELS), view, pinFirstLevel: true
  });
  scene.switchTo({ transitionDuration: 0 });
  // leggero movimento iniziale, come guardarsi intorno
  let idle = true;
  $("#pano").addEventListener("pointerdown", () => (idle = false));

  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  function lookAt(to, ms = 700) {
    return new Promise((res) => {
      const f = { yaw: view.yaw(), pitch: view.pitch(), fov: view.fov() }, dy = angDiff(f.yaw, to.yaw ?? f.yaw), t0 = performance.now();
      (function step(now) {
        const k = ease(Math.min(1, (now - t0) / ms));
        view.setParameters({ yaw: f.yaw + dy * k, pitch: f.pitch + ((to.pitch ?? f.pitch) - f.pitch) * k, fov: f.fov + ((to.fov ?? f.fov) - f.fov) * k });
        if (k < 1) requestAnimationFrame(step); else res();
      })(t0);
    });
  }

  // ---------- Oggetti della stanza ----------
  const HOTSPOTS = [
    { id: "porta", yaw: -2.22, pitch: 0.02, label: "Porta del laboratorio", door: true, open: openDoor },
    { id: "cappa", yaw: 0.02, pitch: 0.08, label: "Cappa aspirante", open: openHood },
    { id: "armadio", yaw: -0.56, pitch: 0.06, label: "Armadio dei reagenti", open: openCabinet },
    { id: "lavagna", yaw: -0.31, pitch: 0.03, label: "Lavagna", open: openBoard },
    { id: "cattedra", yaw: -2.67, pitch: 0.24, label: "Cattedra del professore", open: openDesk },
    { id: "quadro", yaw: 1.76, pitch: -0.06, label: "Quadro elettrico", open: openPanel },
    { id: "schema", yaw: -1.47, pitch: -0.1, label: "Schema dell'impianto", open: openSchema },
    { id: "computer", yaw: -1.62, pitch: 0.16, label: "Computer", open: openPC },
    { id: "emergenza", yaw: 0.8, pitch: 0.08, label: "Uscita di emergenza", open: openEmergency }
  ];
  const hsEls = {};
  for (const h of HOTSPOTS) {
    const wrap = document.createElement("div"); wrap.className = "hs-wrap";
    const b = document.createElement("button");
    b.className = "hs" + (h.door ? " door" : "");
    b.innerHTML = `<span class="ring"></span><span class="lbl"></span>`;
    b.querySelector(".lbl").textContent = h.label;
    b.setAttribute("aria-label", h.label);
    b.addEventListener("click", async (e) => {
      e.stopPropagation(); if (!S.start) return;
      idle = false; sfx.click();
      await lookAt({ yaw: h.yaw, pitch: h.pitch, fov: 0.85 }, 650);
      S.seen.add(h.id); refresh();
      h.open();
    });
    wrap.appendChild(b);
    scene.hotspotContainer().createHotspot(wrap, { yaw: h.yaw, pitch: h.pitch });
    hsEls[h.id] = b;
  }
  function refresh() {
    for (const h of HOTSPOTS) hsEls[h.id].classList.toggle("seen", S.seen.has(h.id));
    hsEls.cappa.classList.toggle("done", S.beakerDone);
    hsEls.quadro.classList.toggle("done", S.power);
    hsEls.computer.classList.toggle("done", S.pcRead);
    hsEls.armadio.classList.toggle("done", S.kit);
    hsEls.cattedra.classList.toggle("done", S.fuse);
    $("#o1").classList.toggle("done", S.beakerDone);
    $("#o2").classList.toggle("done", S.power);
    renderInv();
  }

  // ---------- Inventario ----------
  const ICONS = {
    kit: { name: "Kit di neutralizzazione", svg: `<svg viewBox="0 0 40 40"><rect x="5" y="12" width="30" height="22" rx="4" fill="#f2f2f2" stroke="#999"/><rect x="15" y="7" width="10" height="6" rx="2" fill="none" stroke="#999" stroke-width="2"/><rect x="17" y="17" width="6" height="12" fill="#2bb673"/><rect x="14" y="20" width="12" height="6" fill="#2bb673"/></svg>` },
    fuse: { name: "Fusibile da 16 A", svg: `<svg viewBox="0 0 40 40"><rect x="4" y="15" width="7" height="10" rx="1" fill="#b8b8b8"/><rect x="29" y="15" width="7" height="10" rx="1" fill="#b8b8b8"/><rect x="10" y="12" width="20" height="16" rx="4" fill="#efe6c8" stroke="#a89660"/><line x1="12" y1="20" x2="28" y2="20" stroke="#c0392b" stroke-width="2"/><text x="20" y="27" font-size="5" text-anchor="middle" fill="#555" font-family="sans-serif">16A</text></svg>` }
  };
  function renderInv() {
    const items = [];
    if (S.kit && !S.beakerDone) items.push("kit");
    if (S.fuse && !S.fuseIn) items.push("fuse");
    [...document.querySelectorAll("#inv .slot")].forEach((sl, i) => {
      const it = items[i];
      const was = sl.dataset.it || "";
      sl.className = "slot" + (it ? " full" : "");
      if (was !== (it || "")) sl.innerHTML = it ? `${ICONS[it].svg}<span class="tip">${ICONS[it].name}</span>` : "";
      sl.dataset.it = it || "";
    });
  }

  // ---------- Finestre ----------
  const ov = $("#ov"), card = $("#card");
  function show(html, onReady) {
    card.innerHTML = html; ov.hidden = false; card.scrollTop = 0;
    card.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    if (onReady) onReady(card);
  }
  function close() { ov.hidden = true; if (S.start && !S.end) lookAt({ fov: 1.4 }, 500); }
  ov.addEventListener("click", (e) => { if (e.target === ov && S.start && !S.end) close(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !ov.hidden && S.start && !S.end) close(); });
  const head = (kick, title) => `<div class="in"><p class="kick">${kick}</p><h2>${title}</h2>`;
  const foot = (extra = "") => `<div class="row">${extra}<button class="btn" data-close>Chiudi</button></div></div>`;
  function toast(msg) { const t = $("#toast"); t.innerHTML = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 3200); }

  // ---------- Armadio: kit ----------
  function openCabinet() {
    if (S.kit) return show(head("Armadio dei reagenti", "Armadio dei reagenti") + `<p>Barattoli, provette, imbuti… Hai già preso il kit di neutralizzazione.</p>` + foot());
    show(head("Armadio dei reagenti", "Armadio dei reagenti") +
      `<p>Dietro il vetro ci sono flaconi ordinati per scaffale. In basso, una valigetta bianca con la croce verde:
       <strong>Kit di neutralizzazione d'emergenza</strong>. Contiene tre flaconi contagocce.</p>
       <div class="note hand">"In caso di versamento acido: neutralizzare SOTTO LA CAPPA. Dosi limitate, non sprecarle!"</div>` +
      foot(`<button class="btn primary" id="take">Prendi il kit</button>`), (c) =>
      c.querySelector("#take").addEventListener("click", () => { S.kit = true; sfx.pick(); refresh(); close(); toast("🧰 Hai preso il <b>kit di neutralizzazione</b>"); }));
  }

  // ---------- Lavagna: scala del pH ----------
  const PH_COLORS = { 1: "#d7263d", 2: "#e8344e", 3: "#f0617a", 4: "#f58fb0", 5: "#c587d6", 6: "#a46fd0", 7: "#8e4fc4", 8: "#4f6fe0", 9: "#3f8fd6", 10: "#2fae8f", 11: "#4cc35a", 12: "#b9d13a", 13: "#e3d23a", 14: "#f2c23a" };
  function openBoard() {
    show(head("Lavagna", "Appunti della lezione") +
      `<div class="board">
        <div><b>Indicatore al cavolo rosso</b> — il colore dice il pH:</div>
        <div class="phstrip">${[1, 3, 5, 7, 9, 11, 13].map((p) => `<div style="background:${PH_COLORS[p]}">${p}</div>`).join("")}</div>
        <div>ACIDI ⟵ 7 = NEUTRO (viola) ⟶ BASI</div>
        <div style="margin-top:8px">Per <u>neutralizzare un acido</u> si aggiunge una <b>BASE</b>:<br>la base fa <b>salire</b> il pH, l'acido lo fa <b>scendere</b>.</div>
        <div style="margin-top:8px;text-align:right">— prof. di Chimica</div>
      </div>` + foot());
  }

  // ---------- Cappa: becher da neutralizzare ----------
  const REAG = {
    soda: { name: "Soda caustica diluita", sub: "base forte · pH +3", d: 3, c: "#4f6fe0" },
    bic: { name: "Bicarbonato di sodio", sub: "base debole · pH +1", d: 1, c: "#2fae8f" },
    ace: { name: "Aceto", sub: "acido debole · pH −2", d: -2, c: "#f0617a" }
  };
  function openHood() {
    if (!S.kit) return show(head("Cappa aspirante", "Cappa aspirante") +
      `<p>Sotto la cappa c'è un becher pieno di un liquido rosso acceso che fuma leggermente. Una targhetta dice
       <em>"Soluzione acida — NON toccare a mani nude"</em>.</p>
       <p class="muted">Ti serve qualcosa per neutralizzarla. Forse nell'armadio dei reagenti…</p>` + foot());
    if (S.beakerDone) return show(head("Cappa aspirante", "Soluzione neutralizzata") +
      `<p>Il liquido è viola e tranquillo. Sul fondo del becher si legge:</p><div class="reveal">${S.codeA} _ _</div>` + foot());
    show(head("Enigma 1 · Cappa aspirante", "Neutralizza la soluzione") +
      `<p>Porta il liquido a <b>pH 7</b> (neutro). Le dosi di ogni flacone sono limitate: ragiona prima di versare!</p>
       <div class="lab">
         <div class="beaker-wrap"><canvas id="beaker" width="440" height="520"></canvas></div>
         <div>
           <div class="bottles">${Object.entries(REAG).map(([k, r]) => `
             <button class="bottle" data-r="${k}" style="--c:${r.c}">
               <svg viewBox="0 0 46 46" width="46" height="46"><rect x="17" y="2" width="12" height="9" rx="2" fill="#333"/><path d="M14 11h18v6l4 6v18a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V23l4-6z" fill="${r.c}" opacity=".85"/><rect x="13" y="26" width="20" height="10" rx="2" fill="#fff" opacity=".85"/></svg>
               <span>${r.name}<small>${r.sub}</small></span><span class="doses"></span>
             </button>`).join("")}
           </div>
           <div class="meter"><span>Colore attuale:</span><span class="sw" id="sw"></span><span id="phtxt" class="muted"></span></div>
           <div class="row" style="justify-content:flex-start"><button class="btn ghost" id="reset">↺ Svuota e ricomincia</button><button class="btn ghost" id="seeBoard">📋 Guarda la lavagna</button></div>
         </div>
       </div>` + foot(), bindHood);
  }
  let beakerRAF = 0;
  function bindHood(c) {
    const cv = c.querySelector("#beaker"), g = cv.getContext("2d");
    let shown = S.ph, drops = [], bubbles = [], revealT = 0;
    const colorOf = (p) => { const lo = Math.max(1, Math.min(14, Math.floor(p))), hi = Math.min(14, lo + 1), t = p - lo; return mix(PH_COLORS[lo], PH_COLORS[hi], t); };
    function mix(a, b, t) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; }
    function render() {
      c.querySelectorAll(".bottle").forEach((b) => {
        const k = b.dataset.r, total = { soda: 1, bic: 3, ace: 2 }[k];
        b.querySelector(".doses").innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < total - S.doses[k] ? "used" : ""}"></i>`).join("");
        b.disabled = S.doses[k] <= 0 || S.beakerDone;
      });
      c.querySelector("#sw").style.background = PH_COLORS[Math.max(1, Math.min(14, S.ph))];
      const p = S.ph;
      c.querySelector("#phtxt").textContent = p < 7 ? "ancora acida" : p > 7 ? "troppo basica!" : "neutra!";
    }
    function draw(t) {
      shown += (S.ph - shown) * 0.05;
      g.clearRect(0, 0, 440, 520);
      const x0 = 90, x1 = 350, top = 70, bot = 470, lvl = 210;
      // vapori se acida
      if (shown < 5) for (let i = 0; i < 3; i++) {
        const k = ((t / 2400 + i / 3) % 1);
        g.fillStyle = `rgba(220,255,220,${0.18 * (1 - k)})`;
        g.beginPath(); g.ellipse(220 + Math.sin(t / 700 + i * 2) * 30, top - k * 60, 40 + k * 30, 18 + k * 10, 0, 0, Math.PI * 2); g.fill();
      }
      // liquido
      const col = colorOf(shown);
      g.save();
      g.beginPath(); g.moveTo(x0 + 6, lvl); for (let x = x0 + 6; x <= x1 - 6; x += 8) g.lineTo(x, lvl + Math.sin(x / 26 + t / 300) * 4);
      g.lineTo(x1 - 6, bot - 22); g.quadraticCurveTo(x1 - 6, bot - 4, x1 - 26, bot - 4); g.lineTo(x0 + 26, bot - 4); g.quadraticCurveTo(x0 + 6, bot - 4, x0 + 6, bot - 22); g.closePath();
      const lg = g.createLinearGradient(0, lvl, 0, bot); lg.addColorStop(0, col); lg.addColorStop(1, "rgba(0,0,0,.35)");
      g.fillStyle = col; g.fill(); g.fillStyle = lg; g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1;
      g.clip();
      // cifre sul fondo quando è neutra
      if (S.beakerDone) {
        revealT = Math.min(1, revealT + 0.01);
        g.font = "700 74px JetBrains Mono, monospace"; g.textAlign = "center";
        g.fillStyle = `rgba(255,255,255,${0.85 * revealT})`; g.shadowColor = "#fff"; g.shadowBlur = 20 * revealT;
        g.fillText(S.codeA, 220, 420); g.shadowBlur = 0;
      }
      // bollicine
      if (Math.random() < 0.25) bubbles.push({ x: x0 + 20 + Math.random() * (x1 - x0 - 40), y: bot - 10, r: 2 + Math.random() * 4, v: 0.6 + Math.random() * 1.2 });
      bubbles = bubbles.filter((b) => (b.y -= b.v) > lvl + 4);
      g.fillStyle = "rgba(255,255,255,.35)"; for (const b of bubbles) { g.beginPath(); g.arc(b.x + Math.sin(b.y / 12) * 2, b.y, b.r, 0, Math.PI * 2); g.fill(); }
      g.restore();
      // gocce che cadono
      for (const d of drops) {
        d.y += d.v; d.v += 0.6;
        if (d.y < lvl) { g.fillStyle = d.c; g.beginPath(); g.ellipse(220, d.y, 7, 11, 0, 0, Math.PI * 2); g.fill(); }
        else if (!d.splash) { d.splash = 1; }
        if (d.splash) { d.splash += 1; g.strokeStyle = `rgba(255,255,255,${1 - d.splash / 30})`; g.lineWidth = 3; g.beginPath(); g.ellipse(220, lvl, d.splash * 3, d.splash, 0, 0, Math.PI * 2); g.stroke(); }
      }
      drops = drops.filter((d) => !d.splash || d.splash < 30);
      // vetro
      g.strokeStyle = "rgba(220,240,255,.85)"; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x0 - 14, top); g.lineTo(x0, top + 14); g.lineTo(x0, bot - 20); g.quadraticCurveTo(x0, bot, x0 + 20, bot); g.lineTo(x1 - 20, bot); g.quadraticCurveTo(x1, bot, x1, bot - 20); g.lineTo(x1, top); g.stroke();
      g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 10; g.beginPath(); g.moveTo(x0 + 22, top + 40); g.lineTo(x0 + 22, bot - 60); g.stroke();
      g.fillStyle = "rgba(220,240,255,.7)"; g.font = "600 16px Inter"; g.textAlign = "left";
      for (let i = 0; i < 5; i++) { const y = bot - 50 - i * 50; g.fillRect(x1 - 30, y, 22, 2); g.fillText(`${(i + 1) * 100}`, x1 - 74, y + 6); }
      beakerRAF = requestAnimationFrame(draw);
    }
    cancelAnimationFrame(beakerRAF); beakerRAF = requestAnimationFrame(draw);
    c.querySelectorAll(".bottle").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.r; if (S.doses[k] <= 0 || S.beakerDone) return;
      S.doses[k]--; drops.push({ y: 20, v: 2, c: REAG[k].c }); sfx.drop();
      setTimeout(() => {
        S.ph = Math.max(1, Math.min(14, S.ph + REAG[k].d)); render();
        if (S.ph === 7) {
          S.beakerDone = true; render(); refresh(); setTimeout(sfx.ok, 300);
          setTimeout(() => {
            const r = document.createElement("div");
            r.innerHTML = `<p style="margin-top:12px"><b>Il liquido diventa viola e smette di fumare.</b> Sul fondo del becher compaiono due cifre incise:</p><div class="reveal">${S.codeA} _ _</div>`;
            c.querySelector(".lab").after(r);
            toast("✅ Enigma 1 risolto: prima parte del codice <b>" + S.codeA + "</b>");
          }, 900);
        } else if (Object.values(S.doses).every((x) => x <= 0) || !canStillSolve()) {
          setTimeout(() => toast("Con le dosi rimaste non arrivi a pH 7: <b>svuota e ricomincia</b>."), 500);
        }
      }, 450);
    }));
    c.querySelector("#reset").addEventListener("click", () => { if (S.beakerDone) return; S.ph = S.startPH; S.doses = { soda: 1, bic: 3, ace: 2 }; sfx.click(); render(); });
    c.querySelector("#seeBoard").addEventListener("click", openBoard);
    render();
  }
  // esiste ancora una combinazione di dosi che porta a 7?
  function canStillSolve() {
    for (let s = 0; s <= S.doses.soda; s++) for (let b = 0; b <= S.doses.bic; b++) for (let a = 0; a <= S.doses.ace; a++) if (S.ph + 3 * s + b - 2 * a === 7) return true;
    return false;
  }

  // ---------- Cattedra: cassetti ----------
  function openDesk() {
    show(head("Cattedra del professore", "I cassetti della cattedra") + `<p>Tre cassetti. Apriamoli uno alla volta…</p>
      <div class="drawers">
        <button class="drawer" data-d="1">Cassetto 1</button>
        <button class="drawer" data-d="2">Cassetto 2</button>
        <button class="drawer" data-d="3">Cassetto 3</button>
      </div><div id="found" style="margin-top:12px"></div>` + foot(), (c) => {
      const out = c.querySelector("#found");
      c.querySelectorAll(".drawer").forEach((d) => d.addEventListener("click", () => {
        d.classList.add("open"); sfx.click(); noise(0.25, 0.12, 300);
        const n = d.dataset.d;
        if (n === "1") out.innerHTML = `<div class="note hand">Registro di classe. Sull'ultima pagina, a matita: <em>"Promemoria: lo schema dell'impianto elettrico è appeso vicino ai computer."</em></div>`;
        if (n === "3") out.innerHTML = `<div class="note">Matite, una gomma a forma di molecola e un vecchio badge della gita a Tharros. Niente di utile… o forse sì, ma non oggi.</div>`;
        if (n === "2") {
          if (S.fuse) out.innerHTML = `<div class="note">Il cassetto è vuoto: il fusibile l'hai già preso.</div>`;
          else {
            out.innerHTML = `<div class="note">In fondo al cassetto, in una scatolina: un <strong>fusibile di ricambio da 16 A</strong>.</div><div class="row" style="justify-content:center"><button class="btn primary" id="takeFuse">Prendi il fusibile</button></div>`;
            out.querySelector("#takeFuse").addEventListener("click", () => { S.fuse = true; sfx.pick(); refresh(); close(); toast("🔌 Hai preso il <b>fusibile da 16 A</b>"); });
          }
        }
      }));
    });
  }

  // ---------- Schema dell'impianto ----------
  function openSchema() {
    const lbl = (n) => (S.pcLines.includes(n) ? "COMPUTER e PORTA" : n === S.hoodLine ? "CAPPA (guasta!)" : "CONDIZIONATORE");
    const col = (n) => (S.pcLines.includes(n) ? "#7dffb0" : "#ff8a8a");
    show(head("Schema dell'impianto", "Schema elettrico del laboratorio") +
      `<div class="schema"><svg viewBox="0 0 520 250" font-family="JetBrains Mono, monospace" font-size="13">
        <rect x="10" y="95" width="90" height="60" rx="8" fill="none" stroke="#cfe6ff" stroke-width="2"/><text x="55" y="122" fill="#cfe6ff" text-anchor="middle">QUADRO</text><text x="55" y="140" fill="#cfe6ff" text-anchor="middle">16 A</text>
        ${[1, 2, 3, 4].map((n, i) => {
          const y = 30 + i * 62;
          return `<path d="M100 125 C 150 125, 150 ${y}, 200 ${y} L 300 ${y}" fill="none" stroke="${col(n)}" stroke-width="2" stroke-dasharray="${S.pcLines.includes(n) ? "0" : "6 5"}"/>
            <circle cx="215" cy="${y}" r="13" fill="#0d2a44" stroke="${col(n)}" stroke-width="2"/><text x="215" y="${y + 5}" fill="${col(n)}" text-anchor="middle">${n}</text>
            <text x="310" y="${y + 5}" fill="${col(n)}">${lbl(n)}</text>`;
        }).join("")}
      </svg></div>
      <div class="note hand" style="margin-top:12px">⚠️ "Il fusibile regge solo DUE linee. La cappa è guasta e il condizionatore assorbe troppo: tenerli SPENTI, altrimenti il generale salta!"</div>` + foot());
  }

  // ---------- Quadro elettrico ----------
  function openPanel() {
    if (S.power) return show(head("Quadro elettrico", "Corrente ripristinata") + `<p>Le spie verdi sono accese. Il laboratorio ha di nuovo la corrente.</p>` + foot());
    show(head("Enigma 2 · Quadro elettrico", "Ripristina la corrente") +
      `<div class="panel">
        <div class="plate"><span>QUADRO LAB. CHIMICA</span><b>⚡ 230 V</b></div>
        <div class="fuse"><span>Portafusibile:</span><button class="socket ${S.fuseIn ? "in" : ""}" id="socket">${S.fuseIn ? "16 A" : "VUOTO"}</button><span class="muted" id="fmsg" style="color:#aaa;font-size:13px">${S.fuseIn ? "Fusibile inserito." : S.fuse ? "Clicca per inserire il fusibile." : "Manca il fusibile!"}</span></div>
        <div class="levers">${[1, 2, 3, 4].map((n, i) => `<button class="lever ${S.levers[i] ? "on" : ""}" data-i="${i}" ${S.fuseIn ? "" : "disabled"}><span class="led"></span><span class="track"><span class="knob"></span></span>Linea ${n}</button>`).join("")}</div>
        <div class="main"><button class="btn primary" id="main" ${S.fuseIn ? "" : "disabled"}>⚡ Riarma il generale</button></div>
        <div class="spark" id="spark"></div>
      </div>
      <p class="muted" style="margin-top:10px">Quali linee accendere? Lo schema dell'impianto è appeso in laboratorio.</p>` + foot(), (c) => {
      const socket = c.querySelector("#socket");
      socket.addEventListener("click", () => {
        if (S.fuseIn) return;
        if (!S.fuse) { sfx.err(); c.querySelector("#fmsg").textContent = "Non hai un fusibile. Cercalo in laboratorio!"; return; }
        S.fuseIn = true; sfx.pick(); refresh(); openPanel();
        toast("🔌 Fusibile inserito");
      });
      c.querySelectorAll(".lever").forEach((b) => b.addEventListener("click", () => {
        const i = +b.dataset.i; S.levers[i] = !S.levers[i]; b.classList.toggle("on", S.levers[i]); tone(S.levers[i] ? 500 : 320, 0, 0.06, "square", 0.06);
      }));
      c.querySelector("#main")?.addEventListener("click", () => {
        const on = S.levers.map((v, i) => (v ? i + 1 : 0)).filter(Boolean);
        const sp = c.querySelector("#spark");
        const bad = on.filter((n) => !S.pcLines.includes(n));
        if (bad.length || on.length > 2) {
          sfx.spark(); sp.classList.remove("go"); void sp.offsetWidth; sp.classList.add("go");
          c.querySelector(".panel").classList.remove("shake"); void c.offsetWidth; c.querySelector(".panel").classList.add("shake");
          toast(`💥 <b>Sovraccarico!</b> Il generale è saltato. ${bad.includes(S.hoodLine) ? "La cappa è guasta!" : "Troppe linee accese."}`);
          return;
        }
        if (on.length < 2) { sfx.err(); toast("La corrente torna per un attimo… ma i <b>computer</b> e la <b>porta</b> restano spenti."); return; }
        powerOn();
      });
    });
  }
  async function powerOn() {
    S.power = true; refresh(); close();
    sfx.power();
    document.body.classList.add("flicker"); document.body.classList.remove("dark");
    await wait(1400); document.body.classList.remove("flicker");
    sfx.ok();
    toast("✅ Enigma 2 risolto: <b>la corrente è tornata!</b> I computer si stanno accendendo…");
  }

  // ---------- Computer ----------
  function openPC() {
    if (!S.power) return show(head("Computer", "Computer del laboratorio") + `<div class="crt off"><p>Lo schermo è nero.</p><p>Premi il pulsante di accensione… niente. Manca la corrente.</p></div>` + foot());
    show(head("Computer", "Computer del laboratorio") + `<div class="crt" id="crt"></div>` + foot(), async (c) => {
      const el = c.querySelector("#crt");
      const lines = ["OTHOCA-LAB OS v2.3", "Controllo memoria...... OK", "Rete della scuola...... OK", "Sistema di sicurezza... ALLARME ATTIVO", "", "Procedura di sblocco della porta:", "1) soluzione neutralizzata", "2) corrente ripristinata", "", "Codice di sblocco, seconda parte:"];
      el.innerHTML = "";
      for (const l of lines) { const p = document.createElement("div"); p.style.minHeight = "1.4em"; el.appendChild(p); for (const ch of l) { p.textContent += ch; if (ch !== " ") sfx.beep(); await wait(14); } await wait(60); }
      const big = document.createElement("div"); big.className = "big"; big.textContent = `_ _ ${S.codeB}`; el.appendChild(big);
      if (!S.pcRead) { S.pcRead = true; refresh(); toast("💾 Seconda parte del codice: <b>" + S.codeB + "</b>"); }
    });
  }

  // ---------- Uscita di emergenza ----------
  function openEmergency() {
    show(head("Uscita di emergenza", "Uscita di emergenza") + `<p>La porta a vetri sul cortile è <b>sigillata</b> dal sistema di allarme: le maniglie non si muovono.</p>
      <p class="muted">Si esce solo dalla porta principale, con il codice di sblocco.</p>` + foot());
  }

  // ---------- Porta: tastierino ----------
  function openDoor() {
    const ready = S.power;
    show(head("Porta del laboratorio", "Porta bloccata dall'allarme") +
      `<div class="door">
        <div class="status">
          <div class="${S.beakerDone ? "on" : ""}"><span class="l"></span>Soluzione neutralizzata</div>
          <div class="${S.power ? "on" : ""}"><span class="l"></span>Corrente ripristinata</div>
          <p class="muted" style="margin:4px 0 0">${ready ? "Il tastierino è acceso: inserisci il codice di 4 cifre." : "Il tastierino è spento: senza corrente non funziona."}</p>
        </div>
        <div class="keypad">
          <div class="disp" id="disp">${"<span></span>".repeat(4)}</div>
          <div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<button data-k="${k}" ${ready ? "" : "disabled"}>${k}</button>`).join("")}<button data-k="del" ${ready ? "" : "disabled"}>⌫</button><button data-k="0" ${ready ? "" : "disabled"}>0</button><button data-k="ok" class="ok" ${ready ? "" : "disabled"}>OK</button></div>
        </div>
      </div>` + foot(), (c) => {
      let v = "";
      const disp = c.querySelector("#disp");
      const render = () => disp.querySelectorAll("span").forEach((s, i) => (s.textContent = v[i] || ""));
      const check = async () => {
        if (v.length < 4) return;
        if (v === S.codeA + S.codeB && S.beakerDone) { disp.classList.add("ok"); sfx.ok(); await wait(500); return escape(); }
        disp.classList.add("err"); disp.classList.remove("shake"); void disp.offsetWidth; disp.classList.add("shake"); sfx.err();
        if (v === S.codeA + S.codeB && !S.beakerDone) toast("Il codice è giusto, ma la soluzione non è ancora neutralizzata!");
        await wait(700); disp.classList.remove("err"); v = ""; render();
      };
      c.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => {
        const k = b.dataset.k; sfx.beep();
        if (k === "del") v = v.slice(0, -1); else if (k === "ok") return check(); else if (v.length < 4) v += k;
        render(); if (v.length === 4) setTimeout(check, 250);
      }));
      addEventListener("keydown", function kd(e) {
        if (ov.hidden || !c.querySelector("#disp")) return removeEventListener("keydown", kd);
        if (!ready) return;
        if (/^\d$/.test(e.key) && v.length < 4) { v += e.key; sfx.beep(); render(); if (v.length === 4) setTimeout(check, 250); }
        if (e.key === "Backspace") { v = v.slice(0, -1); render(); }
      });
    });
  }

  async function escape() {
    S.end = Date.now(); close();
    sfx.door();
    await lookAt({ yaw: -2.22, pitch: 0.02, fov: 0.6 }, 1400);
    $("#fadeout").classList.add("on"); sfx.win();
    await wait(1700);
    const t = Math.floor((S.end - S.start) / 1000);
    show(`<div class="in" style="text-align:center"><p class="kick">Demo completata</p><h1>Sei uscito dal laboratorio!</h1>
      <p>L'allarme si spegne, la serratura scatta e la porta si apre sul corridoio. Ottimo lavoro, chimico ed elettricista!</p>
      <dl class="stats"><div><dt>Tempo</dt><dd>${fmt(t)}</dd></div><div><dt>Suggerimenti</dt><dd>${S.hints}</dd></div><div><dt>Codice</dt><dd>${S.codeA}${S.codeB}</dd></div></dl>
      <div class="row" style="justify-content:center"><button class="btn primary" id="again">Gioca di nuovo</button></div></div>`, (c) =>
      c.querySelector("#again").addEventListener("click", () => location.reload()));
    $("#fadeout").classList.remove("on");
  }

  // ---------- Suggerimenti ----------
  $("#hintBtn").addEventListener("click", () => {
    if (!S.start || S.end) return;
    let h;
    if (!S.kit) h = "Per lavorare sotto la <b>cappa</b> serve qualcosa dall'<b>armadio dei reagenti</b>.";
    else if (!S.beakerDone) h = `La soluzione è acida (pH ${S.startPH}). Devi arrivare a <b>pH 7</b>: aggiungi basi. Conta: ti mancano ${7 - S.startPH} punti. Combina le dosi senza sprecarle.`;
    else if (!S.fuse) h = "Il <b>quadro elettrico</b> ha un fusibile mancante. Le cattedre hanno sempre i cassetti pieni di cose…";
    else if (!S.power) h = "Lo <b>schema dell'impianto</b> (sulla parete vicino ai computer) dice quali linee accendere: solo quelle dei computer e della porta.";
    else if (!S.pcRead) h = "Ora che c'è corrente, guarda i <b>computer</b>.";
    else h = `Vai alla <b>porta</b>: prima le cifre del becher, poi quelle del computer.`;
    S.hints++;
    show(head("Suggerimento", "💡 Un aiutino") + `<div class="hintbox">${h}</div>` + foot());
  });

  // ---------- Timer, pulsanti, intro ----------
  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  setInterval(() => { if (S.start && !S.end) $("#timer").textContent = fmt(Math.floor((Date.now() - S.start) / 1000)); }, 500);
  $("#muteBtn").addEventListener("click", () => { S.muted = !S.muted; $("#muteBtn").textContent = S.muted ? "🔇" : "🔊"; });
  $("#fsBtn").addEventListener("click", () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) {} });

  // lenta rotazione finché il giocatore non tocca nulla
  (function drift() { if (idle && ov.hidden) view.setYaw(view.yaw() + 0.0006); requestAnimationFrame(drift); })();

  async function intro() {
    show(`<div class="in"><p class="kick">Escape room · ITIS Othoca · Demo</p><h1>Laboratorio in quarantena</h1>
      <div class="typer" id="typer"></div>
      <div class="goal" id="goal" style="opacity:0;transition:opacity .6s">
        <div><b>1 · Neutralizza la soluzione</b>Sotto la cappa c'è un becher di acido da portare a pH neutro.</div>
        <div><b>2 · Ripristina la corrente</b>Il quadro elettrico è saltato: senza corrente la porta non si apre.</div>
      </div>
      <p class="muted">Trascina per guardarti intorno, clicca sui cerchi bianchi per esaminare gli oggetti.</p>
      <div class="row"><button class="btn primary" id="go">Entra nel laboratorio</button></div></div>`, async (c) => {
      c.querySelector("#go").addEventListener("click", () => { S.start = Date.now(); audio(); close(); sfx.alarm(); toast("🚨 Allarme attivo: trova il modo di uscire!"); });
      const txt = "Ore 13:58. Durante l'esperimento qualcosa è andato storto: un becher di acido ha iniziato a fumare, l'allarme è scattato e il laboratorio è finito in quarantena. La porta si è bloccata e la corrente è saltata. Per uscire devi completare la procedura di sicurezza.";
      const el = c.querySelector("#typer");
      for (let i = 0; i <= txt.length; i += 2) { if (!el.isConnected) return; el.innerHTML = txt.slice(0, i) + '<span class="cursor"></span>'; await wait(16); }
      el.textContent = txt; c.querySelector("#goal").style.opacity = 1;
    });
  }
  refresh();
  intro();

  // per le prove: Demo.stato()
  window.Demo = { stato: () => ({ ...S, seen: [...S.seen] }), guarda: (yaw, pitch, fov) => view.setParameters({ yaw, pitch, fov }) };
})();
