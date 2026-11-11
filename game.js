/* Motore del gioco: di solito non serve modificarlo. Tutto il contenuto è in config.js */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  // Modalità 3D: la camminata la gestisce percorso.js, qui restano enigmi, timer, frammenti e Othy
  const MODE3D = !!window.PERCORSO_3D;
  const SAVE_KEY = MODE3D ? "othoca-percorso-v1" : "othoca-escape-v2";
  const EDITOR = new URLSearchParams(location.search).has("editor");
  const TAU = Math.PI * 2;
  const FOV_NORMAL = 1.45;

  // ---------- Stato (salvato nel browser) ----------
  const fresh = () => ({ seed: Math.floor(Math.random() * 2147483647), solved: [], seen: [], visited: [], found: [], hints: {}, start: null, scene: GAME.startScene, end: null, muted: false, team: "", mode: GAME.defaultMode || null });
  let state = fresh();
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && Array.isArray(saved.solved)) state = Object.assign(fresh(), saved);
  } catch (e) { /* storage non disponibile: si gioca senza salvataggio */ }
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} };
  if (!state.seed) { state.seed = Math.floor(Math.random() * 2147483647); save(); }

  // ---------- Varianti: ogni partita ha enigmi un po' diversi ----------
  const BASE_PUZZLES = GAME.puzzles;
  function applyVariants(seed) {
    let t = seed >>> 0;
    const rnd = () => { t += 0x6D2B79F5; let x = Math.imul(t ^ (t >>> 15), 1 | t); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    const r = {
      int: (a, b) => a + Math.floor(rnd() * (b - a + 1)),
      pick: (arr) => arr[Math.floor(rnd() * arr.length)],
      shuffle: (arr) => { const c = arr.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; }
    };
    const out = {}, ctx = {};
    for (const [id, p] of Object.entries(BASE_PUZZLES)) {
      out[id] = { ...p };
      if (p.reward) out[id].reward = { ...p.reward, fragment: p.reward.fragment && { ...p.reward.fragment, digit: r.int(1, 9) } };
    }
    const variants = GAME.variants || {}, render = GAME.render || {};
    for (const [id, gen] of Object.entries(variants)) {
      if (!out[id]) continue;
      const v = gen(r, ctx) || {};
      Object.assign(out[id], v);
      if (render[id]) Object.assign(out[id], render[id](out[id], v));
    }
    for (const [id, fn] of Object.entries(render)) if (!variants[id] && out[id]) Object.assign(out[id], fn(out[id], ctx));
    // codice finale: cifre dei frammenti nell'ordine dell'alfabeto fenicio
    const frags = Object.values(out).filter((p) => p.reward && p.reward.fragment).map((p) => p.reward.fragment)
      .sort((a, b) => a.symbol.codePointAt(0) - b.symbol.codePointAt(0));
    const fin = Object.values(out).find((p) => p.final);
    if (fin) {
      const code = frags.map((f) => f.digit).join("");
      fin.answer = [code];
      fin.hints = [...fin.hints.slice(0, 2), frags.map((f) => `${f.symbol} = ${f.digit}`).join(", ") + "."];
    }
    GAME.puzzles = out;
  }
  applyVariants(state.seed);

  const isSolved = (id) => state.solved.includes(id);
  const hintsUsed = () => Object.values(state.hints).reduce((a, b) => a + b, 0);

  // ---------- Suoni (generati, nessun file esterno) ----------
  let actx = null;
  function audio() {
    if (state.muted) return null;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(freq, start, dur, type = "sine", vol = 0.18) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, a.currentTime + start);
    g.gain.linearRampToValueAtTime(vol, a.currentTime + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
    o.connect(g).connect(a.destination);
    o.start(a.currentTime + start); o.stop(a.currentTime + start + dur + 0.05);
  }
  function step(start) {
    const a = audio(); if (!a) return;
    const len = 0.12, buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = "lowpass"; f.frequency.value = 420; g.gain.value = 0.9;
    src.connect(f).connect(g).connect(a.destination);
    src.start(a.currentTime + start);
  }
  const sfx = {
    steps: () => [0, 0.28, 0.56].forEach(step),
    ok: () => { tone(660, 0, 0.18); tone(880, 0.12, 0.3); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.45, "triangle", 0.2)),
    err: () => { tone(180, 0, 0.18, "square", 0.08); tone(140, 0.12, 0.22, "square", 0.08); },
    lock: () => tone(220, 0, 0.12, "square", 0.06),
    blip: () => tone(1200, 0, 0.04, "square", 0.03),
    pop: () => tone(520, 0, 0.08, "sine", 0.12),
    sparkle: () => [1320, 1760, 2093].forEach((f, i) => tone(f, i * 0.07, 0.25, "sine", 0.07))
  };

  // ---------- Viewer Marzipano ----------
  const viewer = MODE3D ? null : new Marzipano.Viewer($("#pano"), { controls: { mouseViewMode: "drag" } });
  const scenes = {};
  let busy = false;

  // Marzipano usa "transform" sull'elemento: l'hotspot va avvolto per poterlo centrare
  function wrap(el) { const w = document.createElement("div"); w.className = "hs-wrap"; w.appendChild(el); return w; }

  function buildScene(sc) {
    const base = GAME.tilesBase + "/" + sc.tile;
    const source = Marzipano.ImageUrlSource.fromString(base + "/{z}/{f}/{y}/{x}.jpg", { cubeMapPreviewUrl: base + "/preview.jpg" });
    const geometry = new Marzipano.CubeGeometry(sc.levels || TILE_LEVELS);
    // zoom consentito anche oltre la risoluzione della foto: serve alla telecamera che segue il robot
    const limiter = Marzipano.util.compose(Marzipano.RectilinearView.limit.vfov(0.35, 1.75), Marzipano.RectilinearView.limit.pitch(-1.4, 1.4));
    const view = new Marzipano.RectilinearView({ yaw: sc.startYaw || 0, pitch: sc.startPitch || 0, fov: FOV_NORMAL }, limiter);
    const scene = viewer.createScene({ source, geometry, view, pinFirstLevel: true });
    const container = scene.hotspotContainer();
    const hotspots = [];

    for (const l of sc.links) {
      const el = document.createElement("button");
      el.className = "hs link";
      const target = GAME.scenes.find((s) => s.id === l.target);
      el.innerHTML = `<span class="dot"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 9h-4v8H9v-8H5z"/></svg></span><span class="lbl"></span>`;
      el.querySelector(".lbl").textContent = target ? target.name : l.target;
      el.addEventListener("click", (e) => { e.stopPropagation(); tryLink(l, target); });
      container.createHotspot(wrap(el), { yaw: l.yaw, pitch: l.pitch });
      hotspots.push({ el, refresh: () => el.classList.toggle("locked", !!l.lock && !isSolved(l.lock)) });
    }
    for (const it of sc.items) {
      const el = document.createElement("button");
      el.className = "hs item";
      el.innerHTML = `<span class="dot">${it.icon || "✨"}</span><span class="lbl"></span>`;
      el.querySelector(".lbl").textContent = it.label;
      el.addEventListener("click", (e) => { e.stopPropagation(); if (!el.classList.contains("hidden")) approach(it); });
      container.createHotspot(wrap(el), { yaw: it.yaw, pitch: it.pitch });
      hotspots.push({ el, item: it, refresh: () => el.classList.toggle("done", isSolved(it.puzzle) || state.seen.includes(it.puzzle)) });
    }
    scenes[sc.id] = { data: sc, scene, view, hotspots };
  }
  if (MODE3D) GAME.scenes.forEach((sc) => (scenes[sc.id] = { data: sc, hotspots: [], view: null }));
  else GAME.scenes.forEach(buildScene);

  const current = () => scenes[state.scene];

  // API per il personaggio 3D (avatar.js)
  window.OthocaGame = {
    view: () => current() && current().view,
    scene: () => current().data,
    busy: () => busy,
    modalOpen: () => !document.getElementById("modal").hidden,
    editor: EDITOR,
    fovNormal: FOV_NORMAL,
    step: () => step(0)
  };
  const avatar = () => (window.Avatar && window.Avatar.ready ? window.Avatar : null);
  function refreshHotspots() { Object.values(scenes).forEach((s) => s.hotspots.forEach((h) => h.refresh())); }

  // ---------- Indizi nascosti: compaiono quando il robot si avvicina ----------
  const REVEAL = 2.8; // metri
  function updateReveal() {
    const s = current(); if (!s || MODE3D) return;
    const A = avatar();
    const rp = A && A.pos();
    for (const h of s.hotspots) {
      if (!h.item) continue;
      const id = h.item.puzzle;
      let show = true;
      if (A) {
        const p = A.itemPoint(h.item);
        const near = Math.hypot(p.x - rp.x, p.z - rp.z) < REVEAL;
        if (near && !state.found.includes(id)) {
          state.found.push(id); save(); sfx.sparkle();
          h.el.classList.add("reveal"); setTimeout(() => h.el.classList.remove("reveal"), 900);
        }
        show = near || state.found.includes(id);
      }
      h.el.classList.toggle("hidden", !show);
    }
  }
  setInterval(updateReveal, 150);

  // ---------- Animazioni della telecamera ----------
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  function animateView(view, to, ms, opts = {}) {
    return new Promise((resolve) => {
      const from = { yaw: view.yaw(), pitch: view.pitch(), fov: view.fov() };
      const dy = angDiff(from.yaw, to.yaw ?? from.yaw);
      const t0 = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - t0) / ms), k = ease(t);
        const bob = opts.bob ? Math.sin(t * Math.PI * 6) * 0.012 * (1 - t * 0.5) : 0;
        view.setParameters({
          yaw: from.yaw + dy * k,
          pitch: from.pitch + ((to.pitch ?? from.pitch) - from.pitch) * k + bob,
          fov: from.fov + ((to.fov ?? from.fov) - from.fov) * k
        });
        if (t < 1) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Camminata: ci si gira verso la porta, si avanza (zoom + oscillazione) e si entra nella stanza nuova
  async function walkTo(link, target) {
    if (busy) return;
    const A = avatar();
    if (A) {
      // Passaggio continuo: il robot cammina fino alla porta, la telecamera avanza con lui
      // e la foto nuova si sovrappone alla vecchia senza stacchi.
      busy = true;
      const cur = current(), ov = cur.view;
      document.body.classList.add("walking");
      await A.goToDoor(link);
      A.follow(false);
      A.continueForward(1.6);
      await animateView(ov, { yaw: link.yaw, fov: Math.max(0.5, ov.fov() * 0.82) }, 450);
      const sc = scenes[target.id].data;
      const ny = sc.enterYaw ?? enterYaw(sc, cur.data.id);
      const m = A.matchCut({ yaw: ov.yaw(), pitch: ov.pitch(), fov: ov.fov() }, ny, FOV_NORMAL);
      animateView(ov, { fov: Math.max(0.3, ov.fov() * 0.55) }, 1100);
      enterScene(target.id, cur.data.id, { yaw: ny, pitch: m.pitch, fov: m.fov, duration: 1100 });
      A.follow(true);
      await A.continueForward(1.1);
      document.body.classList.remove("walking");
      busy = false;
      greet();
      return;
    }
    busy = true;
    document.body.classList.add("walking");
    const cur = current();
    sfx.steps();
    await animateView(cur.view, { yaw: link.yaw, pitch: Math.max(-0.1, Math.min(0.1, link.pitch)) }, 450);
    $("#fade").classList.add("on");
    await animateView(cur.view, { fov: 0.5 }, 650, { bob: true });
    enterScene(target.id, cur.data.id);
    const nv = current().view;
    nv.setParameters({ fov: 0.85 });
    $("#fade").classList.remove("on");
    sfx.steps();
    await animateView(nv, { fov: FOV_NORMAL }, 800, { bob: true });
    document.body.classList.remove("walking");
    busy = false;
    greet();
  }

  // Direzione in cui si guarda entrando: si dà le spalle alla porta da cui si arriva
  function enterYaw(sc, fromId) {
    const back = fromId && sc.links.find((l) => l.target === fromId);
    if (back) return angDiff(0, back.yaw + Math.PI);
    return sc.startYaw || 0;
  }

  function enterScene(id, fromId, opts) {
    const s = scenes[id];
    if (!s) return;
    if (MODE3D) { state.scene = id; save(); $("#roomName").textContent = s.data.name; return; }
    if (opts) s.view.setParameters({ yaw: opts.yaw, pitch: opts.pitch, fov: opts.fov });
    else s.view.setParameters({ yaw: fromId ? (s.data.enterYaw ?? enterYaw(s.data, fromId)) : (s.data.startYaw || 0), pitch: fromId ? 0 : (s.data.startPitch || 0), fov: FOV_NORMAL });
    s.scene.switchTo({ transitionDuration: opts ? opts.duration : fromId ? 350 : 0 });
    state.scene = id; save();
    $("#roomName").textContent = s.data.name;
    refreshHotspots();
  }

  function greet() {
    const sc = current().data;
    if (!state.visited.includes(sc.id)) {
      state.visited.push(sc.id); save();
      if (sc.say) guide.say(sc.say);
    }
  }

  function tryLink(l, target) {
    if (busy) return;
    if (l.lock && !isSolved(l.lock)) {
      sfx.lock();
      if (avatar()) avatar().emote("No");
      guide.say(l.lockedSay || "È chiusa! Forse qualcosa in questa stanza può aiutarci.", "think");
      return;
    }
    walkTo(l, target);
  }

  // Avvicinarsi a un oggetto: la telecamera si gira e zooma, poi si apre l'enigma
  let lastLook = null;
  async function approach(it) {
    if (busy) return;
    const A = avatar();
    if (A) {
      busy = true;
      await A.approach(it);
      await animateView(current().view, { yaw: it.yaw, pitch: it.pitch, fov: 0.95 }, 650);
      busy = false;
      openPuzzle(it.puzzle);
      return;
    }
    busy = true;
    const v = current().view;
    lastLook = { yaw: v.yaw(), pitch: v.pitch(), fov: v.fov() };
    sfx.steps();
    document.body.classList.add("walking");
    await animateView(v, { yaw: it.yaw, pitch: it.pitch, fov: 0.6 }, 900, { bob: true });
    document.body.classList.remove("walking");
    busy = false;
    openPuzzle(it.puzzle);
  }
  function stepBack() {
    const v = current().view;
    if (!v) return;
    if (v.fov() < 1.2) animateView(v, { fov: FOV_NORMAL, pitch: Math.max(-0.3, Math.min(0.3, v.pitch())) }, 600).then(() => { const A = avatar(); if (A) A.frameRobot(); });
  }

  // ---------- Guida: Othy ----------
  const guide = (() => {
    const box = $("#guide"), bubble = $("#bubble"), text = $("#bubbleText");
    let timer = null, hideTimer = null, pending = null;
    function say(msg, mood = "idle") {
      if (!$("#modal").hidden) { pending = [msg, mood]; return; }
      clearInterval(timer); clearTimeout(hideTimer);
      box.dataset.mood = mood;
      box.classList.add("talking", "open");
      text.innerHTML = "";
      const plain = msg;
      let i = 0;
      timer = setInterval(() => {
        i += 2;
        text.textContent = plain.slice(0, i);
        if (i % 6 === 0) sfx.blip();
        if (i >= plain.length) {
          clearInterval(timer); text.textContent = plain;
          box.classList.remove("talking");
          hideTimer = setTimeout(() => { box.classList.remove("open"); box.dataset.mood = "idle"; }, Math.max(6000, plain.length * 70));
        }
      }, 30);
    }
    function hide() { pending = null; clearInterval(timer); clearTimeout(hideTimer); box.classList.remove("open", "talking"); }
    function flush() { if (pending) { const [m, md] = pending; pending = null; setTimeout(() => say(m, md), 350); } }
    bubble.addEventListener("click", hide);
    $("#othy").addEventListener("click", () => {
      const hint = currentTip();
      say(hint, "think");
    });
    return { say, hide, flush };
  })();

  // Consiglio di Othy quando la si clicca: cosa fare adesso nella stanza
  function currentTip() {
    const sc = current().data;
    const todo = sc.items.find((it) => GAME.puzzles[it.puzzle].type !== "info" && !isSolved(it.puzzle));
    const hidden = sc.items.find((it) => avatar() && !state.found.includes(it.puzzle));
    if (hidden) return `Esplora la stanza con il robot! Gli indizi brillano solo da vicino. Cerca: "${hidden.label}".`;
    if (todo) return `Dai un'occhiata a "${todo.label}"! Se sei bloccato, dentro l'enigma puoi chiedere un indizio.`;
    const locked = sc.links.find((l) => l.lock && !isSolved(l.lock));
    if (locked) return locked.lockedSay;
    const next = sc.links.find((l) => !state.visited.includes(l.target));
    if (next) return `Qui abbiamo finito! Andiamo verso: ${GAME.scenes.find((s) => s.id === next.target).name}.`;
    return "Sei sulla strada giusta, continua così!";
  }

  // ---------- Timer ----------
  // ---------- Modalità open day: durata della partita ----------
  const MODES = GAME.modes || { unica: { name: "Partita", minutes: GAME.minutes, hintPenalty: GAME.hintPenalty } };
  const mode = () => MODES[state.mode] || MODES[Object.keys(MODES)[0]];
  const penaltyLabel = () => (mode().hintPenalty < 60 ? `${mode().hintPenalty} s` : `${Math.round(mode().hintPenalty / 60)} min`);
  function remaining() {
    if (!state.start) return mode().minutes * 60;
    const now = state.end || Date.now();
    return mode().minutes * 60 - Math.floor((now - state.start) / 1000) - hintsUsed() * mode().hintPenalty;
  }
  const fmt = (s) => { const a = Math.abs(s); return (s < 0 ? "−" : "") + String(Math.floor(a / 60)).padStart(2, "0") + ":" + String(a % 60).padStart(2, "0"); };
  let timeUpShown = false;
  function tick() {
    const r = remaining();
    $("#timer").textContent = fmt(r);
    $("#timer").classList.toggle("warn", r < 180);
    if (r <= 0 && !state.end && !timeUpShown && state.start) {
      timeUpShown = true;
      showModal(`<h2>⏰ Tempo scaduto!</h2><p>Il custode sta chiudendo… Potete finire la partita, ma senza punti per la classifica.</p>
        <div class="actions"><button class="btn" id="nextTeam">Prossima squadra</button><button class="btn primary" data-close>Continua a giocare</button></div>`,
        (root) => root.querySelector("#nextTeam").addEventListener("click", reset));
    }
  }
  setInterval(tick, 1000);

  // ---------- Frammenti ----------
  // in modalità 3D contano solo gli enigmi presenti nelle stanze del percorso
  function fragPuzzles() {
    const used = MODE3D ? new Set(GAME.scenes.flatMap((sc) => (sc.items || []).map((i) => i.puzzle))) : null;
    return Object.entries(GAME.puzzles).filter(([id, p]) => p.reward && p.reward.fragment && (!used || used.has(id)));
  }
  let lastGot = null;
  function renderFragments() {
    const box = $("#fragments");
    box.innerHTML = "";
    fragPuzzles().forEach(([id, p]) => {
      const d = document.createElement("div");
      const got = isSolved(id);
      d.className = "frag" + (got ? " got" : "") + (id === lastGot ? " new" : "");
      d.title = got ? "Frammento trovato" : "Frammento mancante";
      d.innerHTML = got ? `<span class="phn">${p.reward.fragment.symbol}</span><b>${p.reward.fragment.digit}</b>` : `<span>?</span>`;
      box.appendChild(d);
    });
  }

  // ---------- Modale ----------
  const modal = $("#modal"), modalBody = $("#modalBody");
  let nextSkin = null; // aspetto della finestra (bacheca di sughero, monitor, quadro elettrico…)
  function showModal(html, onReady) {
    modalBody.dataset.skin = nextSkin || ""; nextSkin = null;
    modalBody.innerHTML = html;
    modal.hidden = false;
    modalBody.scrollTop = 0;
    modalBody.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
    if (onReady) onReady(modalBody);
    const f = modalBody.querySelector("input,button.primary");
    if (f && matchMedia("(pointer:fine)").matches) setTimeout(() => f.focus(), 50);
  }
  function closeModal() { modal.hidden = true; if (state.start) stepBack(); guide.flush(); }
  modal.addEventListener("click", (e) => { if (e.target === modal && state.start) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden && state.start) closeModal(); });

  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Ruota di Cesare
  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const shiftChar = (c, k) => { const i = ABC.indexOf(c); return i < 0 ? c : ABC[(i - k + 26) % 26]; };
  function caesarHtml(cipher) {
    return `<div class="caesar">
      <div class="paper mono big">${cipher}</div>
      <div class="wheel">
        <button type="button" class="btn ghost" data-shift="-1" aria-label="Sposta indietro">◀</button>
        <div class="strips"><div class="strip-lbl">scritto</div><div class="strip top"></div><div class="strip bottom"></div><div class="strip-lbl">vuol dire</div></div>
        <button type="button" class="btn ghost" data-shift="1" aria-label="Sposta avanti">▶</button>
      </div>
      <div class="decoded"><span class="muted">Spostamento: <b class="k">0</b> → </span><span class="mono out"></span></div>
    </div>`;
  }
  function bindCaesar(root, cipher) {
    let k = 0;
    const top = root.querySelector(".strip.top"), bottom = root.querySelector(".strip.bottom");
    const render = () => {
      top.innerHTML = ABC.split("").map((c) => `<span>${c}</span>`).join("");
      bottom.innerHTML = ABC.split("").map((c) => `<span>${shiftChar(c, k)}</span>`).join("");
      root.querySelector(".k").textContent = k;
      root.querySelector(".out").innerHTML = cipher.split("").map((c) => `<span>${shiftChar(c, k) === " " ? "&nbsp;" : shiftChar(c, k)}</span>`).join("");
    };
    root.querySelectorAll("[data-shift]").forEach((b) => b.addEventListener("click", () => {
      const dir = Number(b.dataset.shift);
      k = (k + dir + 26) % 26; sfx.blip(); render();
      bottom.animate([{ transform: `translateX(${dir * 3.85}%)`, filter: "blur(1px)" }, { transform: "none", filter: "none" }], { duration: 260, easing: "cubic-bezier(.2,.9,.3,1.3)" });
      root.querySelectorAll(".out span").forEach((sp, i) => sp.animate([{ transform: "rotateX(90deg)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 300, delay: i * 12, easing: "ease-out", fill: "backwards" }));
    }));
    render();
  }

  function puzzleHead(id, p) {
    // la stanza è quella dell'oggetto (nel percorso continuo il robot può essere vicino al confine tra due foto)
    const sc = GAME.scenes.find((x) => (x.items || []).some((i) => i.puzzle === id)) || current().data;
    const it = sc.items.find((i) => i.puzzle === id);
    const kind = p.type === "info" ? "Indizio" : p.final ? "Enigma finale" : "Enigma";
    return `<header class="pz-head"><div class="pz-badge">${(it && it.icon) || "✨"}</div>
      <div><p class="pz-kicker">${kind} · ${sc.name}</p><h2>${p.title}</h2></div></header>`;
  }

  // Lucchetto: tastierino per i numeri, caselle per le parole
  function lockHtml(p) {
    const n = norm(p.answer[0]).length, numeric = p.inputmode === "numeric";
    const boxes = Array.from({ length: n }, () => `<span class="cell"></span>`).join("");
    const keypad = numeric ? `<div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<button type="button" data-key="${k}">${k}</button>`).join("")}
        <button type="button" data-key="del" aria-label="Cancella">⌫</button><button type="button" data-key="0">0</button><button type="button" data-key="ok" class="ok">OK</button></div>` : "";
    return `<form class="lock ${numeric ? "numeric" : "word"}" autocomplete="off">
        <svg class="padlock" viewBox="0 0 60 64" aria-hidden="true"><path class="shackle" d="M17 30 V19 a13 13 0 0 1 26 0 V30" fill="none" stroke="#cfd3da" stroke-width="6" stroke-linecap="round"/>
          <rect x="8" y="28" width="44" height="32" rx="8" fill="#e0a83f"/><rect x="8" y="28" width="44" height="8" rx="4" fill="#f2c063"/>
          <circle cx="30" cy="43" r="4.5" fill="#6b4310"/><rect x="28.3" y="44" width="3.4" height="9" rx="1.5" fill="#6b4310"/></svg>
        <label class="lock-display" title="Scrivi la risposta">${boxes}
          <input class="lock-input" type="text" maxlength="${n}" inputmode="${numeric ? "numeric" : "text"}" aria-label="${p.placeholder || "Risposta"}" autocapitalize="characters" spellcheck="false" /></label>
        ${keypad}
        ${numeric ? "" : `<button class="btn primary" type="submit">Prova</button>`}
      </form><p class="feedback" aria-live="polite"></p>`;
  }
  function bindLock(root, id, p) {
    const form = root.querySelector(".lock"), input = form.querySelector(".lock-input"), cells = [...form.querySelectorAll(".cell")];
    const fb = root.querySelector(".feedback"), n = cells.length;
    const render = () => {
      const v = norm(input.value).slice(0, n);
      if (input.value !== v) input.value = v;
      cells.forEach((c, i) => { c.textContent = v[i] || ""; c.classList.toggle("filled", !!v[i]); c.classList.toggle("cursor", i === v.length); });
    };
    const check = () => {
      const v = norm(input.value);
      if (!v) return;
      if (p.answer.map(norm).includes(v)) { form.classList.add("open"); sfx.ok(); setTimeout(() => solve(id), 650); return; }
      sfx.err(); fb.textContent = "Niente da fare… non è la risposta giusta.";
      form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
      setTimeout(() => { input.value = ""; render(); }, 650);
    };
    input.addEventListener("input", () => { sfx.blip(); fb.textContent = ""; render(); if (norm(input.value).length === n) setTimeout(check, 250); });
    form.addEventListener("submit", (e) => { e.preventDefault(); check(); });
    form.querySelectorAll("[data-key]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.key; sfx.blip();
      if (k === "del") input.value = input.value.slice(0, -1);
      else if (k === "ok") return check();
      else if (input.value.length < n) input.value += k;
      render(); if (norm(input.value).length === n) setTimeout(check, 250);
    }));
    render();
    if (matchMedia("(pointer:fine)").matches) setTimeout(() => input.focus(), 80);
  }

  function openPuzzle(id) {
    const p = GAME.puzzles[id];
    if (!p) return;
    const solved = isSolved(id);
    nextSkin = p.skin || null;
    let html = `${puzzleHead(id, p)}<div class="pz-body">${p.body}`;
    if (p.caesar) html += caesarHtml(p.caesar);

    if (p.type === "info") {
      if (!state.seen.includes(id)) { state.seen.push(id); save(); refreshHotspots(); }
      html += `</div><div class="actions"><button class="btn primary" data-close>Chiudi</button></div>`;
      showModal(html, (root) => p.caesar && bindCaesar(root, p.caesar));
      return;
    }
    if (solved) {
      html += `<div class="solved">✔ Risolto. ${p.reward.text || ""}</div></div><div class="actions"><button class="btn primary" data-close>Chiudi</button></div>`;
      showModal(html, (root) => p.caesar && bindCaesar(root, p.caesar));
      return;
    }
    if (p.type === "code") html += lockHtml(p);
    if (p.type === "switches") {
      html += `<div class="board">
          <div class="switches">${p.switches.map((s) => `<button type="button" class="sw" data-sw="${s}" aria-pressed="false"><span class="knob"></span><b>${s}</b><i>spento</i></button>`).join("")}</div>
          <div class="leds">${p.leds.map((l, i) => `<div class="led" data-led="${i}"><span class="bulb"></span><span>${l.label}</span></div>`).join("")}</div>
        </div><p class="feedback ok" aria-live="polite"></p>`;
    }
    if (p.type === "pixels") {
      html += `<div class="pixwrap"><div class="crt"><div class="boot mono">OTHOCA-OS v1.0<br>MEMORIA OK<br>SCHERMO… PRONTO_</div><div class="pixgrid" style="--cols:${p.rows[0].length}">${p.rows.map((r, y) =>
          r.split("").map((_, x) => `<button type="button" class="px" data-x="${x}" data-y="${y}" aria-label="Pixel riga ${y + 1} colonna ${x + 1}"></button>`).join("") +
          `<code class="rowcode">${r}</code>`).join("")}</div></div></div><p class="feedback ok" aria-live="polite"></p>`;
    }
    if (p.type === "chest") {
      const all = fragPuzzles(), got = all.filter(([fid]) => isSolved(fid)).map(([, q]) => q.reward.fragment);
      const mix = got.slice(); for (let i = mix.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [mix[i], mix[j]] = [mix[j], mix[i]]; }
      html += `<div class="chest"><div class="chest-glow"></div><div class="chest-lid"><i class="tanit-plate"></i></div>
          <div class="chest-box"><div class="slots">${all.map((_, i) => `<div class="slot" data-i="${i}"></div>`).join("")}</div></div></div>
        <div class="shards">${mix.map((f) => `<button type="button" class="shard" data-s="${f.symbol}"><span class="phn">${f.symbol}</span><b>${f.digit}</b></button>`).join("")}</div>
        <p class="feedback" aria-live="polite">${got.length < all.length ? `Ti mancano ancora ${all.length - got.length} frammenti: cercali lungo il percorso!` : ""}</p>`;
    }
    if (p.type === "simon") {
      html += `<div class="simon">
          <div class="lights">${["#ff4d4d", "#4d9dff", "#ffd84d", "#5ee07a"].map((c, i) => `<button type="button" class="spot" data-i="${i}" style="--c:${c}" aria-label="Riflettore ${["rosso", "blu", "giallo", "verde"][i]}" disabled></button>`).join("")}</div>
          <div class="simon-bar"><span class="round">Spettacolo 1 di ${p.rounds.length}</span><button type="button" class="btn primary" data-play>▶ Guarda</button></div>
        </div><p class="feedback" aria-live="polite"></p>`;
    }
    html += hintsHtml(id, p);
    html += `</div><div class="actions"><button class="btn" data-close>Chiudi</button></div>`;

    showModal(html, (root) => {
      if (p.caesar) bindCaesar(root, p.caesar);
      bindHints(root, id, p);
      const fb = root.querySelector(".feedback");
      if (p.type === "code") bindLock(root, id, p);
      if (p.type === "switches") {
        const s = Object.fromEntries(p.switches.map((k) => [k, false]));
        let done = false;
        const update = () => {
          let all = true;
          p.leds.forEach((l, i) => {
            const on = !!l.fn(s);
            all = all && on;
            root.querySelector(`[data-led="${i}"]`).classList.toggle("on", on);
          });
          if (all && !done) { done = true; fb.textContent = "Tutte accese!"; setTimeout(() => solve(id), 700); }
        };
        root.querySelectorAll(".sw").forEach((b) => b.addEventListener("click", () => {
          if (done) return;
          const k = b.dataset.sw; s[k] = !s[k]; sfx.blip();
          b.setAttribute("aria-pressed", s[k]); b.querySelector("i").textContent = s[k] ? "acceso" : "spento";
          update();
        }));
        update();
      }
      if (p.type === "pixels") {
        const target = p.rows.map((r) => r.split("").map((c) => c === "1"));
        const grid = p.rows.map((r) => r.split("").map(() => false));
        let done = false;
        root.querySelectorAll(".px").forEach((b) => b.addEventListener("click", () => {
          if (done) return;
          const x = +b.dataset.x, y = +b.dataset.y;
          grid[y][x] = !grid[y][x]; b.classList.toggle("on", grid[y][x]); sfx.blip();
          if (grid.every((row, yy) => row.every((v, xx) => v === target[yy][xx]))) {
            done = true; root.querySelector(".pixgrid").classList.add("won");
            fb.textContent = "Il disegno è completo!"; setTimeout(() => solve(id), 1100);
          }
        }));
      }
      if (p.type === "simon") bindSimon(root, id, p, fb);
      if (p.type === "chest") bindChest(root, id, fb);
    });
  }

  // Cassa finale: si inseriscono i cocci nelle conche nell'ordine dell'alfabeto fenicio
  function bindChest(root, id, fb) {
    const slots = [...root.querySelectorAll(".slot")], shards = [...root.querySelectorAll(".shard")];
    const order = fragPuzzles().map(([, q]) => q.reward.fragment.symbol).sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
    let placed = [], busy = false;
    shards.forEach((b) => b.addEventListener("click", () => {
      if (busy || b.classList.contains("in")) return;
      const slot = slots[placed.length]; if (!slot) return;
      sfx.blip(); placed.push(b.dataset.s); b.classList.add("in"); slot.appendChild(b);
      if (placed.length < slots.length) return;
      busy = true;
      if (placed.every((s, i) => s === order[i])) {
        fb.className = "feedback ok"; fb.textContent = "Clic! I cocci combaciano…";
        setTimeout(() => { root.querySelector(".chest").classList.add("open"); sfx.ok(); }, 500);
        setTimeout(() => solve(id), 2300);
      } else {
        sfx.err(); fb.className = "feedback"; fb.textContent = "Il coperchio non si muove: l'ordine non è giusto.";
        const ch = root.querySelector(".chest"); ch.classList.remove("shake"); void ch.offsetWidth; ch.classList.add("shake");
        setTimeout(() => { const box = root.querySelector(".shards"); shards.forEach((x) => { x.classList.remove("in"); box.appendChild(x); }); placed = []; busy = false; }, 900);
      }
    }));
  }

  // Spettacolo di luci: si guarda una sequenza e la si ripete
  function bindSimon(root, id, p, fb) {
    const spots = [...root.querySelectorAll(".spot")];
    const notes = [330, 415, 494, 659];
    const roundLbl = root.querySelector(".round"), playBtn = root.querySelector("[data-play]");
    // sequenza casuale senza due colori uguali di fila
    const seq = [];
    while (seq.length < p.rounds[p.rounds.length - 1]) { const n = Math.floor(Math.random() * 4); if (n !== seq[seq.length - 1]) seq.push(n); }
    let round = 0, pos = 0, listening = false;
    const flash = (i, ms = 420) => { spots[i].classList.add("lit"); tone(notes[i], 0, ms / 1000, "triangle", 0.16); setTimeout(() => spots[i].classList.remove("lit"), ms); };
    const setEnabled = (on) => spots.forEach((b) => (b.disabled = !on));
    async function play() {
      listening = false; setEnabled(false); playBtn.disabled = true; fb.className = "feedback"; fb.textContent = "Guarda bene…";
      await wait(400);
      for (let k = 0; k < p.rounds[round]; k++) { flash(seq[k]); await wait(650); }
      pos = 0; listening = true; setEnabled(true); playBtn.disabled = false;
      fb.textContent = "Tocca a te! Ripeti la sequenza.";
    }
    playBtn.addEventListener("click", play);
    spots.forEach((b) => b.addEventListener("click", async () => {
      if (!listening) return;
      const i = +b.dataset.i; flash(i, 250);
      if (i !== seq[pos]) {
        listening = false; setEnabled(false); sfx.err();
        fb.className = "feedback"; fb.textContent = "Ops, sequenza sbagliata! Premi Guarda per rivederla.";
        return;
      }
      pos++;
      if (pos === p.rounds[round]) {
        listening = false; setEnabled(false);
        round++;
        if (round === p.rounds.length) { fb.className = "feedback ok"; fb.textContent = "Spettacolo perfetto!"; setTimeout(() => solve(id), 900); return; }
        fb.className = "feedback ok"; fb.textContent = "Bravo! Ora uno spettacolo più lungo…";
        roundLbl.textContent = `Spettacolo ${round + 1} di ${p.rounds.length}`;
        await wait(1100); play();
      }
    }));
  }

  function hintsHtml(id, p) {
    if (!p.hints || !p.hints.length) return "";
    const used = state.hints[id] || 0;
    const shown = p.hints.slice(0, used).map((h, i) => `<li><b>Indizio ${i + 1}:</b> ${h}</li>`).join("");
    const more = used < p.hints.length
      ? `<button class="btn ghost" type="button" data-hint>💡 Chiedi un indizio (−${penaltyLabel()})</button>` : "";
    return `<div class="hints"><ul>${shown}</ul>${more}</div>`;
  }
  function bindHints(root, id, p) {
    const b = root.querySelector("[data-hint]");
    if (!b) return;
    b.addEventListener("click", () => {
      state.hints[id] = (state.hints[id] || 0) + 1; save(); tick(); sfx.pop();
      const box = root.querySelector(".hints");
      box.outerHTML = hintsHtml(id, p);
      bindHints(root, id, p);
    });
  }

  function solve(id) {
    const p = GAME.puzzles[id];
    if (!isSolved(id)) state.solved.push(id);
    if (p.final || p.endsGame) { state.end = Date.now(); save(); refreshHotspots(); sfx.win(); if (avatar()) avatar().emote("Dance", 3); guide.say("Ce l'avete fatta! Il sigillo è salvo. Grazie, amici!", "happy"); return win(); }
    lastGot = p.reward && p.reward.fragment ? id : null;
    save(); renderFragments(); refreshHotspots(); sfx.ok();
    if (avatar()) avatar().emote(p.reward.fragment ? "ThumbsUp" : "Yes");
    const frag = p.reward.fragment
      ? `<div class="newfrag"><span class="phn">${p.reward.fragment.symbol}</span><b>${p.reward.fragment.digit}</b></div><p class="center big-ok">Hai trovato un frammento del sigillo!</p>` : `<div class="unlock-ico">🔓</div>`;
    const got = fragPuzzles().filter(([x]) => state.solved.includes(x)).length;
    const tot = fragPuzzles().length;
    showModal(`<div class="success"><div class="confetti">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
      <p class="pz-kicker center">Enigma risolto · ${current().data.name}</p><h2 class="center">${p.title}</h2>${frag}
      <p class="center">${p.reward.text}</p>${p.reward.fragment ? `<p class="center muted">Frammenti: ${got} di ${tot}</p>` : ""}
      <div class="actions center"><button class="btn primary big" data-close>Avanti</button></div></div>`);
    if (p.reward.say) guide.say(p.reward.say, "happy");
  }

  // ---------- Classifica (salvata su questo computer) ----------
  const LB_KEY = "othoca-classifica-v1";
  function loadLB() { try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; } catch (e) { return []; } }
  function saveLB(a) { try { localStorage.setItem(LB_KEY, JSON.stringify(a)); } catch (e) {} }
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function rankedLB(modeKey) { return loadLB().filter((e) => e.mode === modeKey).sort((a, b) => b.score - a.score || a.time - b.time); }
  function lbHtml(modeKey, highlightId, n = 8) {
    const list = rankedLB(modeKey);
    if (!list.length) return `<div class="lb-empty">Nessuna squadra in classifica: sarete i primi!</div>`;
    const medal = (i) => ["🥇", "🥈", "🥉"][i] || `${i + 1}°`;
    let rows = list.slice(0, n).map((e, i) => `<tr class="${e.id === highlightId ? "me" : ""}"><td>${medal(i)}</td><td>${esc(e.team)}</td><td>${e.score}</td><td>${fmt(e.time)}</td><td>${e.hints}</td></tr>`).join("");
    const myIdx = list.findIndex((e) => e.id === highlightId);
    if (myIdx >= n) { const e = list[myIdx]; rows += `<tr class="me"><td>${myIdx + 1}°</td><td>${esc(e.team)}</td><td>${e.score}</td><td>${fmt(e.time)}</td><td>${e.hints}</td></tr>`; }
    return `<table class="lb"><thead><tr><th></th><th>Squadra</th><th>Punti</th><th>Tempo</th><th>💡</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  let idleTimer = null;
  function armIdleReturn() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (state.end) reset(); }, 120000); // dopo 2 minuti torna da sola all'inizio
  }
  ["pointerdown", "keydown"].forEach((ev) => addEventListener(ev, () => { if (state.end) armIdleReturn(); }));

  function win() {
    const used = Math.floor((state.end - state.start) / 1000);
    const r = remaining();
    const id = `${state.seed}-${state.start}`;
    let lb = loadLB();
    if (!lb.some((e) => e.id === id)) { lb.push({ id, team: state.team || "Squadra", mode: state.mode || Object.keys(MODES)[0], score: Math.max(0, r), time: used, hints: hintsUsed(), date: Date.now() }); saveLB(lb); }
    const ranked = rankedLB(state.mode || Object.keys(MODES)[0]), pos = ranked.findIndex((e) => e.id === id) + 1;
    armIdleReturn();
    showModal(`<div class="win">${heroHtml()}
      <p class="eyebrow center">Squadra ${esc(state.team || "")} · partita ${mode().name.toLowerCase()}</p>
      <div class="seal phn">${fragPuzzles().map(([, q]) => q.reward.fragment.symbol).sort().join("")}</div>
      <h2>${GAME.winTitle || "Il sigillo è salvo!"}</h2>${GAME.outro}
      <dl class="stats">
        <div><dt>Tempo impiegato</dt><dd>${fmt(used)}</dd></div>
        <div><dt>Indizi usati</dt><dd>${hintsUsed()}</dd></div>
        <div><dt>Punteggio</dt><dd>${Math.max(0, r)}</dd></div>
      </dl>
      <div class="rank-badge">${r > 0 ? `Siete al <b>${pos}° posto</b> su ${ranked.length} nella classifica ${mode().name.toLowerCase()}!` : "Avete finito fuori tempo: niente punti, ma il sigillo è salvo!"}</div>
      ${lbHtml(state.mode || Object.keys(MODES)[0], id)}
      <div class="actions"><button class="btn" data-close>Guarda in giro</button><button class="btn primary" id="again">Prossima squadra ➜</button></div>
    </div>`, (root) => root.querySelector("#again").addEventListener("click", reset));
  }
  function reset() {
    clearTimeout(idleTimer);
    const muted = state.muted, lastMode = state.mode;
    state = fresh(); state.muted = muted; state.mode = lastMode || state.mode; save(); timeUpShown = false;
    renderTeam();
    applyVariants(state.seed);
    guide.hide(); renderFragments(); enterScene(GAME.startScene);
    if (MODE3D) { if (window.Percorso3D) window.Percorso3D.reset(); }
    else if (avatar()) avatar().place(current().view.yaw());
    showIntro();
  }

  // logo della scuola + mascotte (copia del disegno di Othy)
  const heroHtml = () => `<div class="hero"><img src="lib/img/logoOthoca.png" alt="Logo Othoca">${(document.querySelector("#othy svg") || { outerHTML: "" }).outerHTML}</div>`;
  function showIntro() {
    const modeKeys = Object.keys(MODES);
    let sel = state.mode && MODES[state.mode] ? state.mode : modeKeys[0];
    const teamsSoFar = loadLB().length;
    showModal(`${heroHtml()}<p class="eyebrow">Escape room · ITIS Othoca · Open Day</p><h1>${GAME.title}</h1>
      <div class="tanit-row"><i></i><i></i><i></i></div>${GAME.intro}
      <div class="openday">
        <label class="team-field"><span>Nome della squadra</span>
          <input id="teamName" maxlength="24" placeholder="Squadra ${teamsSoFar + 1}" value="${esc(state.team || "")}" autocomplete="off"></label>
        ${modeKeys.length > 1 ? `<div class="modes">${modeKeys.map((k) => `<button type="button" class="mode${k === sel ? " on" : ""}" data-mode="${k}"><b>${MODES[k].name}</b><span>${MODES[k].desc || MODES[k].minutes + " minuti"}</span></button>`).join("")}</div>` : ""}
        <div class="lb-wrap"><p class="kicker-lb">🏆 Classifica <span id="lbMode">${MODES[sel].name.toLowerCase()}</span></p><div id="lbBox">${lbHtml(sel, null, 5)}</div></div>
      </div>
      <div class="actions"><button class="btn primary big" id="startBtn">Inizia l'avventura</button></div>`, (root) => {
      root.querySelectorAll(".mode").forEach((b) => b.addEventListener("click", () => {
        sel = b.dataset.mode; sfx.blip();
        root.querySelectorAll(".mode").forEach((x) => x.classList.toggle("on", x === b));
        root.querySelector("#lbMode").textContent = MODES[sel].name.toLowerCase();
        root.querySelector("#lbBox").innerHTML = lbHtml(sel, null, 5);
      }));
      const input = root.querySelector("#teamName");
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") root.querySelector("#startBtn").click(); });
      root.querySelector("#startBtn").addEventListener("click", () => {
        state.team = (input.value.trim() || input.placeholder).slice(0, 24);
        state.mode = sel;
        if (!state.start) { state.start = Date.now(); }
        save(); renderTeam();
        audio(); closeModal(); tick(); greet();
        if (avatar()) setTimeout(() => avatar().emote("Wave"), 400);
      });
    });
  }

  // nome della squadra nella barra in alto
  const teamTag = document.createElement("div"); teamTag.id = "teamTag";
  const timerEl = $("#timer"); if (timerEl) timerEl.parentNode.insertBefore(teamTag, timerEl);
  function renderTeam() { teamTag.textContent = state.team ? `👥 ${state.team}` : ""; teamTag.hidden = !state.team; }
  renderTeam();

  // ---------- Pannello del gestore (Ctrl+Shift+G oppure 5 tocchi sul logo) ----------
  function solutionOf(id, p) {
    if (p.type === "code") return p.answer[0];
    if (p.type === "switches") {
      for (let m = 0; m < 16; m++) { const s = { A: !!(m & 1), B: !!(m & 2), C: !!(m & 4), D: !!(m & 8) }; if (p.leds.every((l) => l.fn(s))) return "accesi: " + (Object.keys(s).filter((k) => s[k]).join(", ") || "nessuno"); }
      return "?";
    }
    if (p.type === "pixels") return `disegnare il numero ${p.reward && p.reward.fragment ? p.reward.fragment.digit : "?"}`;
    if (p.type === "simon") return "sequenza casuale: ripetere le luci";
    if (p.type === "chest") return fragPuzzles().map(([, q]) => q.reward.fragment).sort((a, b) => a.symbol.codePointAt(0) - b.symbol.codePointAt(0)).map((f) => `${f.symbol} ${f.digit}`).join(" → ");
    return "";
  }
  function nextUnsolved() {
    for (const sc of GAME.scenes) for (const it of sc.items || []) { const p = GAME.puzzles[it.puzzle]; if (p && p.type !== "info" && !isSolved(it.puzzle)) return it.puzzle; }
    return null;
  }
  function openAdmin() {
    const rows = [];
    for (const sc of GAME.scenes) for (const it of sc.items || []) {
      const p = GAME.puzzles[it.puzzle]; if (!p || p.type === "info") continue;
      rows.push(`<tr class="${isSolved(it.puzzle) ? "ok" : ""}"><td>${sc.name}</td><td>${it.icon || ""} ${it.label}</td><td><b>${esc(solutionOf(it.puzzle, p))}</b></td><td>${isSolved(it.puzzle) ? "✔" : ""}</td></tr>`);
    }
    const nu = nextUnsolved();
    showModal(`<div class="admin"><p class="eyebrow">Solo per chi gestisce il gioco</p><h2>🔧 Pannello del gestore</h2>
      <div class="admin-state">Squadra: <b>${esc(state.team || "—")}</b> · Partita: <b>${mode().name}</b> · Tempo: <b>${fmt(remaining())}</b> · Indizi: <b>${hintsUsed()}</b></div>
      <table class="sol"><thead><tr><th>Dove</th><th>Oggetto</th><th>Soluzione di questa partita</th><th></th></tr></thead><tbody>${rows.join("")}</tbody></table>
      <div class="admin-actions">
        <button class="btn" id="aSolve" ${nu ? "" : "disabled"}>⏭️ Risolvi l'enigma attuale${nu ? ` (${esc(GAME.puzzles[nu].title)})` : ""}</button>
        <button class="btn" id="aNew">🔄 Nuova partita</button>
        <button class="btn" id="aCsv">⬇️ Esporta classifica (CSV)</button>
        <button class="btn" id="aClear">🗑️ Azzera classifica</button>
        <button class="btn" id="aQr">📱 QR code per il telefono</button>
      </div>
      <div id="qrBox"></div>
      <div class="actions"><button class="btn primary" data-close>Chiudi</button></div></div>`, (root) => {
      root.querySelector("#aSolve").addEventListener("click", () => { const id = nextUnsolved(); if (id) { closeModal(); setTimeout(() => solve(id), 150); } });
      root.querySelector("#aNew").addEventListener("click", reset);
      root.querySelector("#aCsv").addEventListener("click", () => {
        const lines = [["posizione", "squadra", "partita", "punti", "tempo", "indizi", "data"]];
        for (const k of Object.keys(MODES)) rankedLB(k).forEach((e, i) => lines.push([i + 1, e.team, MODES[k].name, e.score, fmt(e.time), e.hints, new Date(e.date).toLocaleString("it-IT")]));
        const csv = lines.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" })); a.download = "classifica-othoca.csv"; a.click();
      });
      const clr = root.querySelector("#aClear");
      clr.addEventListener("click", () => {
        if (clr.dataset.sure) { saveLB([]); clr.textContent = "✔ Classifica azzerata"; clr.disabled = true; return; }
        clr.dataset.sure = "1"; clr.textContent = "Sicuro? Clicca di nuovo per azzerare";
      });
      root.querySelector("#aQr").addEventListener("click", () => {
        const box = root.querySelector("#qrBox"), url = location.href.split("#")[0];
        const local = /localhost|127\.0\.0\.1/.test(location.hostname);
        box.innerHTML = `<div class="qr"><div id="qrCode"></div><p class="muted">${esc(url)}${local ? "<br>⚠️ Questo indirizzo funziona solo su questo computer: per i telefoni usate l'indirizzo IP del computer (es. http://192.168.x.x:8000) o il sito della scuola." : ""}</p></div>`;
        const draw = () => { try { new window.QRCode(box.querySelector("#qrCode"), { text: url, width: 180, height: 180, colorDark: "#1d0a12", colorLight: "#ffffff" }); } catch (e) { box.querySelector("#qrCode").textContent = "QR non disponibile"; } };
        if (window.QRCode) draw();
        else { const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"; sc.onload = draw; sc.onerror = () => (box.querySelector("#qrCode").textContent = "Serve internet per generare il QR code."); document.head.appendChild(sc); }
      });
    });
  }
  addEventListener("keydown", (e) => { if (e.ctrlKey && e.shiftKey && e.code === "KeyG") { e.preventDefault(); openAdmin(); } });
  let logoTaps = [];
  const brandLogo = document.querySelector(".brand img, .brand");
  if (brandLogo) brandLogo.addEventListener("click", () => {
    const now = Date.now(); logoTaps = logoTaps.filter((t) => now - t < 2500); logoTaps.push(now);
    if (logoTaps.length >= 5) { logoTaps = []; openAdmin(); }
  });

  // ---------- Pulsanti in alto ----------
  $("#resetBtn").addEventListener("click", () => {
    showModal(`<h2>Nuova partita?</h2><p>Si perdono i frammenti trovati e il timer riparte da capo.</p>
      <div class="actions"><button class="btn" data-close>Annulla</button><button class="btn primary" id="yesReset">Ricomincia</button></div>`,
      (root) => root.querySelector("#yesReset").addEventListener("click", reset));
  });
  $("#introBtn").addEventListener("click", () => showModal(`<h2>${GAME.title}</h2>${GAME.intro}<div class="actions"><button class="btn primary" data-close>Torna al gioco</button></div>`));
  const muteBtn = $("#muteBtn");
  const renderMute = () => { muteBtn.textContent = state.muted ? "🔇" : "🔊"; muteBtn.setAttribute("aria-label", state.muted ? "Attiva audio" : "Disattiva audio"); };
  muteBtn.addEventListener("click", () => { state.muted = !state.muted; save(); renderMute(); });
  renderMute();
  $("#fsBtn").addEventListener("click", () => {
    try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) {}
  });

  // ---------- Modalità editor: ?editor ----------
  if (EDITOR && !MODE3D) {
    document.body.classList.add("editor");
    const out = $("#editorOut");
    $("#pano").addEventListener("click", (e) => {
      const s = current();
      const r = $("#pano").getBoundingClientRect();
      const c = s.view.screenToCoordinates({ x: e.clientX - r.left, y: e.clientY - r.top });
      const txt = `yaw: ${c.yaw.toFixed(3)}, pitch: ${c.pitch.toFixed(3)}`;
      out.textContent = `${s.data.id}: { ${txt} }  (copiato)`;
      try { navigator.clipboard.writeText(txt); } catch (err) {}
    });
  }

  // ---------- API per il prototipo 3D ----------
  if (MODE3D) {
    Object.assign(window.OthocaGame, {
      openPuzzle: (id) => openPuzzle(id),
      isSolved,
      isFound: (id) => state.found.includes(id),
      markFound: (id) => { if (!state.found.includes(id)) { state.found.push(id); save(); sfx.sparkle(); } },
      isDone: (id) => isSolved(id) || state.seen.includes(id),
      setRoom: (id) => { if (state.scene !== id && scenes[id]) { enterScene(id); greet(); } },
      say: (msg, mood) => guide.say(msg, mood),
      lockSound: () => sfx.lock(),
      started: () => !!state.start,
      admin: () => openAdmin(),
      room: () => state.scene
    });
  }

  // ---------- Avvio ----------
  renderFragments();
  enterScene(scenes[state.scene] ? state.scene : GAME.startScene);
  tick();
  if (!state.start) showIntro();
  else if (state.end) win();
})();
