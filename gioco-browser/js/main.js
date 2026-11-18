// Flusso del gioco: menu → ingresso 360° → mappa → escape room → vittoria → mappa.
import { THREE, heightAt, renderer, camera, world, gfx, setQuality, preloadImages, newScene, buildShell, door, place, addCollider, addFloor, confetti, camFocus, makeHuman, nameTag, spawnPlayer, updatePlayer, player, input, look, addInteractable, findInteractable, highlight, removeInteractable, beacon, render } from "./world.js";
import { ROOMS, SECRET, SECRET_WORD } from "./rooms.js";
const ALL_ROOMS = [...ROOMS, SECRET];
import * as P from "./props.js";
import { DECOR } from "./decor.js";
import { loadCharacterModel, hasModel, makeSkinned, loadTeacherModel, hasTeacherModel, makeTeacher, makeExplorer, makeBoy } from "./skinned.js";
import { Pano } from "./pano.js";
import { ui, isSpeaking, busy, toast, showPrompt, dialog, dialogAdvance, dialogChoice, modal, closeModal, readDoc, canvasDoc, puzzle, modalKey, showInventory, showHint, showSettings, fmtTime, esc, $ } from "./ui.js";
import { sfx, music, stopMusic, setVolume, setMusic, unlockAudio, ambience, stopAmbience } from "./audio.js";

// ---------- salvataggio e impostazioni ----------
const SAVE_KEY = "othoca-escape-v1", SET_KEY = "othoca-escape-settings";
const load = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || "{}")); } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage non disponibile */ } };
const progress = load(SAVE_KEY, { rooms: {} });
const settings = load(SET_KEY, { volume: 0.7, music: 0.35, sens: 1, fs: 16, invertY: false, quality: "alta" });
function applySettings() {
  setVolume(settings.volume); setMusic(settings.music); input.sens = settings.sens; input.invertY = settings.invertY;
  document.documentElement.style.setProperty("--fs", settings.fs + "px");
  const q = settings.quality; renderer.setPixelRatio(q === "alta" ? Math.min(devicePixelRatio, 1.75) : q === "media" ? 1 : 0.75);
  renderer.shadowMap.enabled = q !== "bassa"; setQuality(q);
  save(SET_KEY, settings);
}
applySettings();

const isTouch = matchMedia("(pointer: coarse)").matches;
let state = "loading"; // loading | menu | hub | map | room | win
const screens = ["loading", "menu", "hub", "map"];
function show(name) { for (const s of screens) $(s).hidden = s !== name; $("hud").hidden = name !== "room"; }

// ---------- stelle, gradi e scintille ----------
const starsFor = (t, hints) => (hints === 0 && t < 240 ? 3 : hints <= 2 && t < 480 ? 2 : 1);
const totalStars = () => ROOMS.reduce((a, r) => a + (progress.rooms[r.id] ? progress.rooms[r.id].stars || 1 : 0), 0);
const roomsDone = () => ROOMS.filter((r) => progress.rooms[r.id]).length;
const lettersStr = () => ROOMS.map((r, i) => (progress.rooms[r.id] ? SECRET_WORD[i] : "_")).join("");
const RANKS = [[0, "Matricola curiosa"], [6, "Apprendista di laboratorio"], [12, "Tecnico in erba"], [18, "Esperto Othoca"], [24, "Leggenda dell'Othoca"]];
const rankOf = (n) => RANKS.filter(([k]) => n >= k).pop()[1];
function refreshMenuStars() { const el = $("menuStars"); if (el) el.innerHTML = `<b>${totalStars()}</b> / ${ROOMS.length * 3} ⭐`; const w = $("menuWho"); if (w) { w.hidden = !progress.name; w.innerHTML = `Ciao <b>${esc(progress.name || "")}</b>! · ${esc(rankOf(totalStars()))} · <a href="#" data-act="look">cambia look</a> · <a href="#" data-act="player">non sei tu?</a>`; } }
(function sparks() { const m = $("menu"); for (let i = 0; i < 22; i++) { const sp = document.createElement("i"); sp.className = "spark"; sp.style.left = Math.random() * 100 + "%"; sp.style.animationDuration = 8 + Math.random() * 10 + "s"; sp.style.animationDelay = -Math.random() * 15 + "s"; const sz = 3 + Math.random() * 5; sp.style.width = sp.style.height = sz + "px"; m.appendChild(sp); } })();
function showBanner(title, sub = "") { const b = $("banner"); b.innerHTML = `<div class="bn">${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ""}</div>`; b.hidden = false; clearTimeout(showBanner.t); showBanner.t = setTimeout(() => (b.hidden = true), 2300); }
function showRoomTitle(def) { const r = $("roomTitle"); r.innerHTML = `<div class="rt"><small>${esc(def.indirizzo)}</small><h2>${esc(def.name)}</h2><div>${def.tasks.length} sfide · ${def.teacher.name}</div></div>`; r.hidden = false; setTimeout(() => (r.hidden = true), 2900); }

// ---------- giocatore, classifica dell'open day e trofei ----------
const BOARD_KEY = "othoca-escape-board";
const board = load(BOARD_KEY, { runs: [] });
const TROPHIES = [
  { id: "first", icon: "🚪", t: "Primo passo", d: "Esci dalla prima stanza", ok: (r) => r.rooms >= 1 },
  { id: "nohint", icon: "🧠", t: "Cervellone", d: "Esci da una stanza senza aiuti", ok: (r) => r.hints === 0 },
  { id: "fast", icon: "⚡", t: "Fulmine", d: "Esci in meno di 2 minuti", ok: (r) => r.time < 120 },
  { id: "three", icon: "⭐", t: "Perfetto", d: "Prendi 3 stelle in una stanza", ok: (r) => r.stars === 3 },
  { id: "half", icon: "🗺️", t: "Mezza scuola", d: "Completa 4 stanze", ok: (r) => r.rooms >= 4 },
  { id: "all", icon: "🏫", t: "Tutta l'Othoca", d: "Completa tutte le 8 stanze", ok: (r) => r.rooms >= 8 },
  { id: "stars", icon: "👑", t: "Leggenda", d: "Raccogli tutte le 24 stelle", ok: (r) => r.total >= 24 },
  { id: "secret", icon: "🗝️", t: "Il segreto dell'Othoca", d: "Apri lo scrigno dell'Archivio segreto", ok: (r) => r.secret },
];
if (!progress.trophies) progress.trophies = [];
function checkTrophies(run) {
  const got = TROPHIES.filter((x) => !progress.trophies.includes(x.id) && x.ok(run));
  got.forEach((x, i) => { progress.trophies.push(x.id); setTimeout(() => { sfx.ok(); showBanner(`${x.icon} TROFEO SBLOCCATO!`, x.t); }, 2600 + i * 2500); });
  save(SAVE_KEY, progress); return got;
}
const LOOKS = {
  shirt: [0x2f6fd6, 0xe0245e, 0x2e9d5b, 0xf2a71b, 0x7b3fc4, 0x1d1f26, 0xf4f4f4],
  hair: [0x3a2516, 0x14110f, 0x8a5a2b, 0xd9a441, 0xb5432a],
  skinTone: [0xf3cba5, 0xe8b48e, 0xc98e66, 0x9c6644, 0x6b4430],
  pants: [0x3c5a85, 0x23262e, 0x6b6f78, 0x5c4a3a],
};
const css = (n) => "#" + n.toString(16).padStart(6, "0");
function avatarSvg(l) {
  return `<svg viewBox="0 0 100 120" width="110" height="132"><rect x="30" y="92" width="16" height="26" rx="5" fill="${css(l.pants)}"/><rect x="54" y="92" width="16" height="26" rx="5" fill="${css(l.pants)}"/>
  <rect x="22" y="58" width="56" height="40" rx="14" fill="${css(l.shirt)}"/><rect x="12" y="62" width="14" height="30" rx="7" fill="${css(l.skinTone)}"/><rect x="74" y="62" width="14" height="30" rx="7" fill="${css(l.skinTone)}"/>
  <rect x="11" y="60" width="16" height="14" rx="7" fill="${css(l.shirt)}"/><rect x="73" y="60" width="16" height="14" rx="7" fill="${css(l.shirt)}"/>
  <rect x="26" y="10" width="48" height="50" rx="20" fill="${css(l.skinTone)}"/><path d="M24 34 Q24 6 50 6 Q76 6 76 34 L72 24 Q60 16 40 20 L28 30 Z" fill="${css(l.hair)}"/>
  <circle cx="41" cy="36" r="3.2" fill="#222"/><circle cx="59" cy="36" r="3.2" fill="#222"/><path d="M43 48 Q50 53 57 48" stroke="#7a3b2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <circle cx="50" cy="76" r="8" fill="#fff"/><circle cx="50" cy="76" r="5" fill="#f0559a"/></svg>`;
}
function askName(then) {
  const l = Object.assign({ shirt: LOOKS.shirt[0], hair: LOOKS.hair[0], skinTone: LOOKS.skinTone[1], pants: LOOKS.pants[0] }, progress.look || {});
  const row = (k, label) => `<div class="pick"><span>${label}</span><div>${LOOKS[k].map((c) => `<button class="sw ${c === l[k] ? "on" : ""}" data-k="${k}" data-c="${c}" style="background:${css(c)}"></button>`).join("")}</div></div>`;
  const p = modal(`<div class="eyebrow">Nuovo giocatore</div><h2>Crea il tuo personaggio</h2>
    <div class="creator"><div class="avatar" data-av>${avatarSvg(l)}</div><div class="picks">${row("shirt", "Maglietta")}${row("hair", "Capelli")}${row("skinTone", "Pelle")}${row("pants", "Pantaloni")}</div></div>
    <input class="name-in" data-n maxlength="14" placeholder="Come ti chiami?" autocomplete="off" spellcheck="false" value="${esc(progress.name || "")}">
    <p class="muted" style="text-align:center;margin:4px 0 0;font-size:13px">Il tuo nome comparirà nella classifica dell'open day.</p>
    <div class="row"><button class="btn primary" data-ok>Iniziamo! →</button></div>`, { closable: false });
  p.querySelectorAll(".sw").forEach((b) => (b.onclick = () => { sfx.click(); l[b.dataset.k] = +b.dataset.c; p.querySelectorAll(`.sw[data-k="${b.dataset.k}"]`).forEach((x) => x.classList.toggle("on", x === b)); p.querySelector("[data-av]").innerHTML = avatarSvg(l); }));
  const inp = p.querySelector("[data-n]"); setTimeout(() => inp.focus(), 50);
  const go = () => { const v = inp.value.trim().replace(/\s+/g, " ").slice(0, 14); if (!v) { inp.classList.add("shake"); setTimeout(() => inp.classList.remove("shake"), 400); return; } progress.name = v; progress.look = l; save(SAVE_KEY, progress); closeModal(); refreshMenuStars(); then && then(); };
  p.querySelector("[data-ok]").onclick = go; inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") go(); });
}
// ---------- come si gioca: 3 schede illustrate ----------
function showHowTo(then) {
  const T = isTouch;
  const cards = [
    { ico: "🕹️", t: "Muoviti", d: T ? "Usa il <b>joystick</b> in basso a sinistra per camminare nella stanza." : "<kbd>W</kbd> avanti · <kbd>S</kbd> indietro · <kbd>A</kbd> <kbd>D</kbd> per girarti. Tieni <kbd>Shift</kbd> per correre.", art: `<div class="ht-keys">${T ? `<div class="ht-stick"><i></i></div>` : `<span></span><kbd>W</kbd><span></span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>`}</div>` },
    { ico: "💬", t: "Parla e usa", d: T ? "Avvicinati al prof o a un oggetto e tocca il pulsante <b>E</b>." : "Avvicinati al prof o a un oggetto e premi <kbd>E</kbd>. Il <b>rombo rosa</b> ti indica cosa usare.", art: `<div class="ht-diamond">◆</div>` },
    { ico: "🔓", t: "Risolvi ed esci", d: "Completa le 2 sfide del prof e raggiungi la porta <b>USCITA</b>. Meno tempo e meno aiuti 💡 = più stelle ⭐", art: `<div class="ht-stars"><i>★</i><i>★</i><i>★</i></div>` },
  ];
  let i = 0;
  const p = modal(`<div class="eyebrow">Come si gioca</div><div class="howto" data-h></div><div class="ht-dots" data-d></div>
    <div class="row"><button class="btn ghost" data-prev>←</button><button class="btn primary" data-next>Avanti →</button></div>`, { onClose: () => then && then() });
  const draw = () => {
    const c = cards[i];
    p.querySelector("[data-h]").innerHTML = `<div class="ht-card" style="animation:htIn .35s ease"><div class="ht-art">${c.art}</div><div class="ht-n">${i + 1}</div><h2>${c.ico} ${c.t}</h2><p>${c.d}</p></div>`;
    p.querySelector("[data-d]").innerHTML = cards.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("");
    p.querySelector("[data-prev]").style.visibility = i ? "visible" : "hidden";
    p.querySelector("[data-next]").textContent = i === cards.length - 1 ? "Ho capito, si parte! 🚀" : "Avanti →";
  };
  p.querySelector("[data-prev]").onclick = () => { sfx.click(); i = Math.max(0, i - 1); draw(); };
  p.querySelector("[data-next]").onclick = () => { sfx.click(); if (i < cards.length - 1) { i++; draw(); } else closeModal(); };
  draw();
}
function newPlayer() {
  const p = modal(`<div class="eyebrow">Cambia giocatore</div><h2>Tocca a un altro?</h2><p>I progressi di <b>${esc(progress.name || "questo giocatore")}</b> ripartono da zero. La classifica resta salvata.</p>
    <div class="row"><button class="btn ghost" data-no>Annulla</button><button class="btn primary" data-yes>Nuovo giocatore</button></div>`);
  p.querySelector("[data-no]").onclick = () => closeModal();
  p.querySelector("[data-yes]").onclick = () => { progress.rooms = {}; progress.trophies = []; progress.name = ""; save(SAVE_KEY, progress); closeModal(); refreshMenuStars(); setTimeout(() => askName(), 50); };
}
const rankRuns = (id) => board.runs.filter((r) => r.room === id).sort((a, b) => b.stars - a.stars || a.time - b.time);
function showBoard(sel) {
  sel = sel || ROOMS[0].id;
  const rows = rankRuns(sel).slice(0, 10);
  const medal = (i) => ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
  const p = modal(`<div class="eyebrow">Open day · Othoca</div><h2>🏆 Classifica</h2>
    <div class="chips">${ROOMS.map((r) => `<button class="chip ${r.id === sel ? "on" : ""}" data-r="${r.id}">${esc(r.name.replace(/^Laboratorio (di )?/, ""))}</button>`).join("")}</div>
    <div class="board">${rows.length ? rows.map((r, i) => `<div class="brow ${r.name === progress.name ? "me" : ""}"><span class="pos">${medal(i)}</span><span class="nm">${esc(r.name)}</span><span class="st">${"★".repeat(r.stars)}<i>${"★".repeat(3 - r.stars)}</i></span><span class="tm">${fmtTime(r.time)}</span></div>`).join("") : `<p class="muted" style="text-align:center;padding:18px 0">Ancora nessuno: sarai il primo?</p>`}</div>
    <div class="eyebrow" style="margin-top:14px">I tuoi trofei · ${progress.trophies.length} / ${TROPHIES.length}</div>
    <div class="trophies">${TROPHIES.map((x) => `<div class="tro ${progress.trophies.includes(x.id) ? "got" : ""}" title="${esc(x.d)}"><b>${x.icon}</b><span>${esc(x.t)}</span><small>${esc(x.d)}</small></div>`).join("")}</div>
    <div class="row"><button class="btn primary" data-x>Chiudi</button></div>`, { wide: true });
  p.querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => { sfx.click(); closeModal(); showBoard(b.dataset.r); }));
  p.querySelector("[data-x]").onclick = () => closeModal();
}

// ---------- menu ----------
$("menu").addEventListener("click", (e) => {
  const a = e.target.closest("[data-act]")?.dataset.act; if (!a) return; e.preventDefault();
  unlockAudio(); sfx.click();
  if (a === "play") { if (progress.name) openHub(); else askName(() => showHowTo(openHub)); }
  if (a === "board") showBoard();
  if (a === "player") newPlayer();
  if (a === "look") askName();
  if (a === "howto") showHowTo();
  if (a === "settings") showSettings(settings, applySettings);
  if (a === "credits") showCredits();
});
function showCredits() {
  const p = modal(`<div class="eyebrow">Crediti</div><h2>Othoca Escape</h2>
    <p>Gioco realizzato per l'open day dell'<b>I.T.I. "Othoca" di Oristano</b>.</p>
    <p><b>Foto 360°</b>: studenti dell'Othoca e tour Othoca360 della scuola.</p>
    <p><b>Personaggi</b>: modello umano e animazioni di Kenney (kenney.nl, licenza CC0); tuta da esploratore sul modello Soldier degli esempi di Three.js (animazioni Mixamo). <b>Stanze e suoni</b>: generati nel codice.</p>
    <p><b>Tecnologia</b>: Three.js r160 con post-produzione GTAO e bloom (licenza MIT) · font Baloo 2 e Inter (Google Fonts, licenza OFL).</p>
    <p class="muted">I prof Martini (aula), Mocci (informatica) e Siotto (palestra) compaiono con nome e foto veri; gli altri professori e tutti i dialoghi sono inventati.</p>
    <div class="row"><button class="btn primary" data-x>Chiudi</button></div>`);
  p.querySelector("[data-x]").onclick = () => closeModal();
}

// ---------- ingresso 360° ----------
const hubPano = new Pano($("pano"), $("panoMarkers"));
const INFO = {
  scuola: { t: "L'I.T.I. Othoca", h: `<p>L'<b>Istituto Tecnico Industriale "Othoca"</b> di Oristano prepara tecnici e futuri ingegneri: si studia tanto in aula quanto nei <b>laboratori</b>.</p><p>Il nome viene da <b>Othoca</b>, un'antica città fondata dai Fenici vicino a Santa Giusta, quasi 3000 anni fa.</p>` },
  indirizzi: { t: "Gli indirizzi", h: `<p>💻 <b>Informatica e Telecomunicazioni</b></p><p>⚡ <b>Elettronica ed Elettrotecnica</b></p><p>⚙️ <b>Meccanica, Meccatronica ed Energia</b></p><p>🔬 <b>Liceo Scientifico opzione Scienze Applicate</b></p><p class="muted">E c'è anche un laboratorio di robotica!</p>` },
  laboratori: { t: "I laboratori", h: `<p>Chimica, officina meccanica, pneumatica, informatica, il museo ZooMate, la palestra e l'aula magna: in questo gioco puoi visitarli tutti.</p><p>In ogni stanza un professore ti affida una sfida: risolvila per uscire!</p>` },
  curiosita: { t: "Lo sapevi?", h: `<p>Il <b>logo</b> della scuola è un <b>fenicottero rosa</b>, l'uccello simbolo degli stagni di Oristano.</p><p>A scuola c'è perfino un museo sugli animali delle zone umide: lo <b>ZooMate</b>.</p>` },
};
const HUB_VIEWS = [
  { img: "foto/entrance_01.jpg", title: "Ingresso · pensilina", lon: 166, hots: [["scuola", 166, 22, "La scuola", "i"], ["indirizzi", 236, 4, "Gli indirizzi", "i"], ["curiosita", 300, 18, "Lo sapevi?", "?"], ["laboratori", 172, -6, "Entra nei laboratori", "→"]] },
  { img: "foto/entrance_02.jpg", title: "Ingresso · piazzale", lon: 178, hots: [["scuola", 178, 15, "La scuola", "i"], ["indirizzi", 236, 6, "Gli indirizzi", "i"], ["curiosita", 282, 14, "Lo sapevi?", "?"]] },
];
let hubIdx = 0;
async function openHub() {
  state = "hub"; show("hub"); stopMusic(); music(7);
  hubPano.start(); await setHubView(hubIdx);
}
async function setHubView(i) {
  hubIdx = (i + HUB_VIEWS.length) % HUB_VIEWS.length; const v = HUB_VIEWS[hubIdx];
  $("panoTitle").textContent = v.title;
  await hubPano.load(v.img, { lon: v.lon, lat: 2 });
  hubPano.setHotspots(v.hots.map(([k, lon, lat, label, icon]) => ({ lon, lat, label, icon, onClick: () => { sfx.click(); if (k === "laboratori") { openMap(); return; } readDoc(INFO[k].t, INFO[k].h); } })));
}
$("panoPrev").onclick = () => { sfx.click(); setHubView(hubIdx - 1); };
$("panoNext").onclick = () => { sfx.click(); setHubView(hubIdx + 1); };
$("panoBack").onclick = () => { hubPano.stop(); state = "menu"; show("menu"); refreshMenuStars(); };
$("enterBtn").onclick = () => { sfx.click(); openMap(); };

// ---------- mappa ----------
function openMap() {
  hubPano.stop(); state = "map"; show("map"); if (!musicOn) { music(7); }
  const done = ROOMS.filter((r) => progress.rooms[r.id]).length;
  $("mapProgress").innerHTML = `${done} / ${ROOMS.length} stanze · <span class="map-total">${totalStars()} ⭐</span> · ${rankOf(totalStars())}`;
  $("roomCards").innerHTML = ROOMS.map((r) => {
    const pr = progress.rooms[r.id];
    return `<div class="card" data-room="${r.id}">
      <div class="img" style="background-image:url(foto/${r.cardPhoto}.jpg)"></div>
      <div class="peek"><div class="peek-av">${r.teacher.photo ? `<img src="${r.teacher.photo}" alt="">` : `<span>${esc(r.teacher.name.replace(/^(Prof\.(ssa)?|Dott\.(ssa)?) /, "")[0])}</span>`}</div>
        <div class="peek-tx"><b>${esc(r.teacher.name)}</b> ti aspetta<small>${esc(r.tasks.map((t) => t.title).join(" · "))}</small>
        <em>${pr ? `🏆 Il tuo record: ${fmtTime(pr.best)}` : "▶ Entra e gioca"}</em></div></div>
      ${pr ? `<span class="stars-won">${[1, 2, 3].map((k) => `<span class="${k <= (pr.stars || 1) ? "star-on" : "star-off"}">★</span>`).join("")}</span>` : ""}
      <span class="badge ${pr ? "done" : ""}">${pr ? "✓ Completata · " + fmtTime(pr.best) : "Da fare"}</span>
      <div class="body"><h3>${esc(r.name)}</h3><div class="ind">${esc(r.indirizzo)}</div>
      <div class="meta"><span>Difficoltà <span class="stars">${"★".repeat(r.difficulty)}${"☆".repeat(3 - r.difficulty)}</span></span><span>${r.tasks.length} sfide</span></div></div></div>`;
  }).join("");
  const open = roomsDone() === ROOMS.length, sp = progress.rooms[SECRET.id];
  $("roomCards").insertAdjacentHTML("beforeend", `<div class="card secret ${open ? "open" : "locked"}" ${open ? `data-room="${SECRET.id}"` : ""}>
    <div class="img secret-img"><span>${open ? "🗝️" : "🔒"}</span></div>
    ${sp ? `<span class="badge done">✓ Svelato · ${fmtTime(sp.best)}</span>` : `<span class="badge">${open ? "Aperto!" : "Bloccato"}</span>`}
    <div class="body"><h3>${esc(SECRET.name)}</h3><div class="ind">${open ? "Stanza segreta · ultima sfida" : "Completa tutte le stanze per entrare"}</div>
    <div class="letters">${lettersStr().split("").map((ch) => `<i class="${ch === "_" ? "" : "got"}">${ch === "_" ? "?" : ch}</i>`).join("")}</div></div></div>`);
  $("roomCards").querySelectorAll("[data-room]").forEach((el) => (el.onclick = () => { sfx.click(); startRoom(el.dataset.room); }));
}
let musicOn = false;
$("mapBack").onclick = () => { sfx.click(); openHub(); };

// ---------- stanza ----------
let room = null, ctx = null, exitDoor = null, teacher = null, guide = null, timer = 0, timing = false, introDone = false;
function startRoom(id) {
  const def = ALL_ROOMS.find((r) => r.id === id);
  state = "room"; show("room"); $("loading").hidden = false; $("loadText").textContent = "Entro in: " + def.name; $("loadBar").style.width = "40%";
  // precarica le texture prese dalle foto 360° della stanza, poi costruisce
  preloadImages(def.preload || []).then(() => setTimeout(() => buildRoom(def), 30));
}
function buildRoom(def) {
  room = def; timer = 0; timing = false; introDone = false;
  newScene({ bg: 0x15101a });
  const [W, D] = def.size;
  const shell = def.shell(); buildShell(Object.assign({ size: def.size }, shell));
  const st = { done: {}, inv: [], hints: {}, hintsUsed: 0, letters: lettersStr() };
  // contesto passato alle stanze
  ctx = {
    W, D, H: def.size[2], scene: world.scene, state: st, THREE,
    place: (g, x, z, ry = 0, o = {}) => place(g, x, z, ry, o),
    interact: (obj, o) => addInteractable(obj, o),
    remove: (it) => removeInteractable(it),
    colliderBox: (x0, z0, x1, z1) => addCollider(x0, z0, x1, z1),
    floor: (f) => addFloor(f),
    camBlock: (m) => world.camColliders.push(m),
    anim: (fn) => world.animated.push(fn),
    give: (it) => { if (!st.inv.find((x) => x.id === it.id)) { st.inv.push(it); sfx.pick(); refreshHud(); } },
    has: (id) => !!st.inv.find((x) => x.id === id),
    take: (id) => { st.inv = st.inv.filter((x) => x.id !== id); refreshHud(); },
    items: () => st.inv.slice(),
    done: (tid) => { if (st.done[tid]) return; st.done[tid] = true; sfx.ok(); confetti(player.pos.x, player.y + 2.2, player.pos.y); const t = def.tasks.find((x) => x.id === tid); showBanner("SFIDA COMPLETATA!", t.title); teacher.cheer?.(); player.model?.cheer?.(); extras.forEach((e, i) => setTimeout(() => e.h.cheer(), 150 + i * 120)); refreshHud(); },
    isDone: (tid) => !!st.done[tid],
    toast, refresh: () => refreshHud(),
    doc: (t, h) => readDoc(t, h), canvasDoc: (t, cnv, note) => canvasDoc(t, cnv, note),
    puzzle: (d) => (window.__autoSolve ? Promise.resolve(true) : puzzle(d)),
    prof: (text) => talkLines([text]),
  };
  // porte
  const doorPos = (spec) => {
    if (spec.side === "n") return [spec.x, -D / 2 + 0.02, 0];
    if (spec.side === "s") return [spec.x, D / 2 - 0.02, Math.PI];
    if (spec.side === "w") return [-W / 2 + 0.02, spec.z, Math.PI / 2];
    return [W / 2 - 0.02, spec.z, -Math.PI / 2];
  };
  const [ex, ez, er] = doorPos(def.exit);
  exitDoor = door(ex, ez, er, { color: def.exit.color || 0x2f5f4a, glass: !!def.exit.glass, label: "USCITA", labelBg: "#2e7d32" });
  if (def.entry) { const [nx, nz, nr] = doorPos(def.entry); const dd = door(nx, nz, nr, { color: def.entry.color || 0x2f5f4a, glass: !!def.entry.glass }); if (def.entry.y) dd.group.position.y = def.entry.y; }
  const exitPoint = new THREE.Vector3(ex + Math.sin(er) * 0.9, 0, ez + Math.cos(er) * 0.9);
  { const sg = P.exitSign(); sg.position.set(ex + Math.sin(er) * 0.06, 2.9, ez + Math.cos(er) * 0.06); sg.rotation.y = er; world.scene.add(sg); }
  addInteractable(exitDoor.group, { label: "Porta d'uscita", point: exitPoint, range: 1.8, when: () => !exitDoor.isOpen, use: () => tryExit() });
  // professore
  const T = def.teacher;
  teacher = (hasTeacherModel() ? makeTeacher : hasModel() ? makeSkinned : makeHuman)(Object.assign({}, T.look, T.face ? { face: T.face } : {}));
  teacher.root.position.set(T.at[0], 0, T.at[1]); world.scene.add(teacher.root);
  const tag = nameTag(T.name, T.role); tag.position.y = 2.3; teacher.root.add(tag);
  addCollider(T.at[0] - 0.28, T.at[1] - 0.28, T.at[0] + 0.28, T.at[1] + 0.28);
  addInteractable(teacher.root, { label: "Parla con " + T.name, range: 2.3, use: () => talkLines(def.talk(ctx)) });
  world.npcs.push({ h: teacher, x: T.at[0], z: T.at[1] });
  def.build(ctx);
  if (DECOR[def.id]) DECOR[def.id](ctx);
  spawnPlayer(def.spawn[0], def.spawn[1], def.spawn[2], hasTeacherModel() ? () => makeBoy(progress.look || {}) : hasModel() ? makeSkinned : null);
  addExtras(def, exitPoint);
  buildMarkers();
  guide = beacon();
  $("hudRoom").textContent = def.name; $("hudIndirizzo").textContent = def.indirizzo;
  refreshHud();
  $("loadBar").style.width = "100%";
  renderer.compile(world.scene, camera);
  setTimeout(() => { $("loading").hidden = true; }, 150);
  stopMusic(); music(def.secret ? 7 : ROOMS.indexOf(def)); ambience(def.id);
  // la porta si chiude dietro al giocatore, poi il prof si presenta
  setTimeout(() => { sfx.door(); showRoomTitle(def); }, 300);
  setTimeout(() => {
    if (state !== "room" || room !== def) return;
    talkLines(def.intro, () => { introDone = true; timing = true; refreshHud(); });
  }, 1700);
}
// ---------- compagni di classe: 2-3 studenti che lavorano nella stanza ----------
let extras = [];
const EX_SHIRTS = [0xe0245e, 0x2e9d5b, 0xf2a71b, 0x7b3fc4, 0x1d1f26, 0x4fa3e0, 0xc0392b, 0x8d6e63], EX_HAIR = [0x14110f, 0x3a2516, 0x8a5a2b, 0xd9a441], EX_SKIN = [0xf3cba5, 0xe8b48e, 0xc98e66, 0x9c6644];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function distToRect(x, z, c) { const dx = Math.max(c.x0 - x, 0, x - c.x1), dz = Math.max(c.z0 - z, 0, z - c.z1); return Math.hypot(dx, dz); }
// tutti gli obiettivi restano raggiungibili? (griglia da 20 cm, giocatore largo 30 cm)
function reachableAll(targets, spawn) {
  const b = world.bounds, S = 0.2, nx = Math.ceil((b.x1 - b.x0) / S) + 1, nz = Math.ceil((b.z1 - b.z0) / S) + 1;
  const free = new Uint8Array(nx * nz), seen = new Uint8Array(nx * nz);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = b.x0 + i * S, z = b.z0 + j * S; let ok = true; for (const c of world.colliders) if (distToRect(x, z, c) < 0.29) { ok = false; break; } free[i * nz + j] = ok ? 1 : 0; }
  const cell = (x, z) => [Math.round((x - b.x0) / S), Math.round((z - b.z0) / S)];
  let [si, sj] = cell(spawn[0], spawn[1]); const q = [];
  // il punto di partenza può essere vicino a un arredo: prendi la cella libera più vicina
  let best = null, bd = 1e9; for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (free[i * nz + j]) { const d = (i - si) ** 2 + (j - sj) ** 2; if (d < bd) { bd = d; best = [i, j]; } }
  if (!best) return false; q.push(best); seen[best[0] * nz + best[1]] = 1;
  while (q.length) { const [i, j] = q.pop(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, c = j + dj; if (a < 0 || c < 0 || a >= nx || c >= nz) continue; const k = a * nz + c; if (seen[k] || !free[k]) continue; seen[k] = 1; q.push([a, c]); } }
  return targets.every(([x, z, r]) => { for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (seen[i * nz + j] && Math.hypot(b.x0 + i * S - x, b.z0 + j * S - z) <= r) return true; return false; });
}
function addExtras(def, exitPoint) {
  extras = [];
  if (!hasTeacherModel() || !world.bounds || def.secret) return;
  const v = new THREE.Vector3();
  const targets = world.interactables.filter((it) => !it.removed).map((it) => { const p = it.point || it.obj.getWorldPosition(v); return [p.x, p.z, Math.min(it.range, 1.8) - 0.1]; });
  targets.push([exitPoint.x, exitPoint.z, 1.2]);
  if (!reachableAll(targets, def.spawn)) return; // stanza già stretta: niente comparse
  const want = def.id === "palestra" || def.id === "teatro" ? 3 : 2, b = world.bounds;
  const busy = [[def.spawn[0], def.spawn[1], 2.4], [def.teacher.at[0], def.teacher.at[1], 1.8], [exitPoint.x, exitPoint.z, 1.8], ...targets.map(([x, z]) => [x, z, 1.4])];
  for (let tries = 0; tries < 260 && extras.length < want; tries++) {
    const x = b.x0 + 0.5 + Math.random() * (b.x1 - b.x0 - 1), z = b.z0 + 0.5 + Math.random() * (b.z1 - b.z0 - 1);
    if (Math.abs(heightAt(x, z)) > 0.01) continue;
    if (busy.some(([bx, bz, r]) => Math.hypot(x - bx, z - bz) < r)) continue;
    let near = null, nd = 9; for (const c of world.colliders) { const d = distToRect(x, z, c); if (d < 0.42) { near = "x"; break; } if (d < nd) { nd = d; near = c; } }
    if (near === "x" || !near || nd > 1.0) continue; // accanto a un banco, non in mezzo alla stanza
    const col = { x0: x - 0.24, z0: z - 0.24, x1: x + 0.24, z1: z + 0.24 }; world.colliders.push(col);
    if (!reachableAll(targets, def.spawn)) { world.colliders.pop(); continue; }
    const female = Math.random() < 0.5;
    const h = makeTeacher({ female, hairLong: female, shirt: pick(EX_SHIRTS), sleeves: Math.random() < 0.5 ? "short" : undefined, pants: pick([0x3c5a85, 0x23262e, 0x6b6f78]), shoes: pick([0xf2f2f2, 0x1c1c1c, 0xe0245e]), hair: pick(EX_HAIR), skinTone: pick(EX_SKIN) });
    h.root.scale.setScalar(0.92 + Math.random() * 0.05);
    const cx = (near.x0 + near.x1) / 2, cz = (near.z0 + near.z1) / 2; const px = Math.max(near.x0, Math.min(near.x1, x)), pz = Math.max(near.z0, Math.min(near.z1, z));
    h.root.position.set(x, 0, z); h.root.rotation.y = Math.atan2(px - x, pz - z) || Math.atan2(cx - x, cz - z);
    world.scene.add(h.root); busy.push([x, z, 1.3]);
    const ex = { h, x, z, base: h.root.rotation.y, t: Math.random() * 6 };
    world.animated.push((dt) => {
      ex.t += dt; h.animate(dt, 0);
      // ogni tanto alza lo sguardo verso il giocatore, poi torna al lavoro
      const dx = player.pos.x - x, dz = player.pos.y - z, d = Math.hypot(dx, dz);
      const curious = d < 3.5 && Math.sin(ex.t * 0.5) > 0.2;
      if (curious) { const rel = Math.atan2(dx, dz) - h.root.rotation.y; h.lookAt(Math.atan2(Math.sin(rel), Math.cos(rel)), 0); } else h.lookAt(0, 0.25);
    });
    extras.push(ex);
  }
}
function talkLines(arr, onEnd) {
  const T = room.teacher; const thens = [];
  // prima persona: la camera guarda il viso del prof per tutto il dialogo
  const hp = new THREE.Vector3(); teacher.head.getWorldPosition(hp); hp.y += 0.1; camFocus.target = hp;
  const endFocus = () => { camFocus.target = null; };
  const lines = arr.map((x) => { if (typeof x === "string") return { who: T.name, role: T.role, img: T.photo, text: x }; if (x.then) thens.push(x.then); return { who: T.name, role: T.role, img: T.photo, text: x.text }; });
  if (window.__autoSolve) { endFocus(); onEnd && onEnd(); thens.forEach((f) => f()); return; }
  dialog(lines, () => { endFocus(); onEnd && onEnd(); thens.forEach((f) => f()); });
}
function currentTask() { return room.tasks.find((t) => !ctx.state.done[t.id]) || null; }
function refreshHud() {
  if (!room) return;
  const t = currentTask();
  $("objText").textContent = !introDone ? `Ascolta ${room.teacher.name}` : t ? (t.step ? t.step(ctx) : t.title) : "Tutto fatto! Vai alla porta USCITA";
  const nDone = room.tasks.filter((x) => ctx.state.done[x.id]).length;
  document.querySelector("#objective .eyebrow").textContent = introDone && t ? `Obiettivo · sfida ${nDone + 1} di ${room.tasks.length}` : "Obiettivo";
  $("objBar").style.width = (nDone / room.tasks.length * 100) + "%";
  $("taskList").innerHTML = room.tasks.map((x) => `<div class="${ctx.state.done[x.id] ? "done" : ""}">${ctx.state.done[x.id] ? "✓" : "○"} ${esc(x.title)}</div>`).join("");
  $("invCount").textContent = ctx.state.inv.length || "";
  $("hintCount").textContent = ctx.state.hintsUsed || "";
}
function tryExit() {
  const left = room.tasks.filter((t) => !ctx.state.done[t.id]).length;
  if (left) { sfx.lock(); toast(`La porta è chiusa. Completa prima le sfide (${room.tasks.length - left}/${room.tasks.length}).`); return; }
  exitDoor.open(); sfx.door(); timing = false; player.model.cheer?.(); teacher.cheer?.(); confetti(player.pos.x, player.y + 2.4, player.pos.y, 160);
  setTimeout(win, 1300);
}
function win() {
  state = "win"; document.exitPointerLock?.(); sfx.win();
  const prev = progress.rooms[room.id]; const t = timer; const record = !prev || t < prev.best;
  const stars = starsFor(t, ctx.state.hintsUsed); const xp = 100 * stars + Math.max(0, 300 - Math.round(t));
  progress.rooms[room.id] = { best: record ? t : prev.best, hints: ctx.state.hintsUsed, stars: Math.max(stars, prev?.stars || 0) }; save(SAVE_KEY, progress);
  const me = { name: progress.name || "Anonimo", room: room.id, time: Math.round(t), stars, hints: ctx.state.hintsUsed, at: Date.now() };
  board.runs.push(me); board.runs = board.runs.slice(-600); save(BOARD_KEY, board);
  const pos = rankRuns(room.id).indexOf(me) + 1;
  checkTrophies({ secret: room.id === SECRET.id, rooms: roomsDone(), hints: ctx.state.hintsUsed, time: t, stars, total: totalStars() });
  const p = modal(`<div class="eyebrow">${esc(room.name)}</div><h2 style="text-align:center">🎉 Sei uscito!</h2>
    <div class="win-stars">${[1, 2, 3].map((k) => `<i class="${k <= stars ? "on" : ""}" style="animation-delay:${0.25 + k * 0.25}s">★</i>`).join("")}</div>
    <div class="win-xp">+${xp} XP</div>${pos ? `<div class="win-pos">${pos === 1 ? "🥇 Primo posto in classifica!" : pos <= 3 ? `${["", "", "🥈", "🥉"][pos]} ${pos}° in classifica!` : `${pos}° in classifica`}</div>` : ""}<div class="win-rank">${esc(rankOf(totalStars()))}</div>
    <div class="win-stats"><div><b>${fmtTime(t)}</b>tempo</div><div><b>${ctx.state.hintsUsed}</b>aiuti usati</div><div><b>${record ? "🏆" : fmtTime(prev.best)}</b>${record ? "nuovo record!" : "record"}</div></div>
    ${room.secret ? `<div class="diploma"><div class="eyebrow">Diploma d'onore</div><b>${esc(progress.name || "Campione")}</b><span>ha svelato il segreto dell'Othoca</span></div>` : `<div class="win-letter">🔑 Lettera segreta: <b>${SECRET_WORD[ROOMS.indexOf(room)]}</b> <small>${roomsDone()} / ${ROOMS.length} ${roomsDone() === ROOMS.length ? "· l'Archivio segreto è aperto!" : ""}</small></div>`}
    <div class="curio"><div class="eyebrow">Lo sapevi? · ${esc(room.indirizzo)}</div><p style="margin:6px 0 0">${esc(room.curiosity)}</p></div>
    <div class="row"><button class="btn ghost" data-board>🏆 Classifica</button><button class="btn" data-again>↺ Rigioca</button><button class="btn primary" data-map>Scegli un'altra stanza →</button></div>`, { closable: false });
  p.querySelector("[data-map]").onclick = () => { closeModal(); leaveRoom(); openMap(); };
  p.querySelector("[data-board]").onclick = () => { const id = room.id; closeModal(); leaveRoom(); openMap(); setTimeout(() => showBoard(id), 30); };
  p.querySelector("[data-again]").onclick = () => { closeModal(); const id = room.id; leaveRoom(); startRoom(id); };
}
function leaveRoom() { stopAmbience(); camFocus.target = null; camFocus.t = 0; room = null; world.scene = null; showPrompt(null); $("clickToPlay").hidden = true; document.exitPointerLock?.(); }

// ---------- segnalini delle sfide: rombo rosa sopra le cose da usare per l'obiettivo corrente ----------
const TASK_TARGETS = {
  segreta: { parola: ["lavagna", "Scrigno"], quiz: ["Computer"] },
  chimica: { sicurezza: (c) => c.has("camice") ? ["Parla con"] : ["armadio delle protezioni"], ph: ["portaprovette", "cartellone del pH", "Lucchetto"] },
  officina: { disegno: ["disegno tecnico", "CNC"], tornio: ["cartello di sicurezza", "Tornio n.1"] },
  pneumatica: { schema: ["schema pneumatico", "Collega i tubi"], ciclo: ["START"] },
  zoomate: { uccelli: ["Guarda la foto", "tavolo touch", "Abbina"], catena: ["catena alimentare"] },
  informatica: { password: ["post-it", "PC del prof"], stampa: ["Stampante 3D"] },
  aula: { verifica: ["Domanda", "Libro", "Cartellone di inglese"], cassetto: ["registro", "Cassetto"] },
  palestra: { percorso: ["lavagnetta", "Tocca il cono"], palloni: ["Raccogli", "Carrello"] },
  teatro: { oggetti: ["Prendi:", "Tavolo degli oggetti"], luci: ["copione", "Consolle"] },
};
const markerTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.translate(64, 64); g.rotate(Math.PI / 4); g.fillStyle = "#f0559a"; g.strokeStyle = "#fff"; g.lineWidth = 8; g.fillRect(-34, -34, 68, 68); g.strokeRect(-34, -34, 68, 68); g.rotate(-Math.PI / 4); g.fillStyle = "#fff"; g.font = "900 52px Inter"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", 0, 3); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
let markers = [];
function buildMarkers() {
  markers = world.interactables.map((it) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex, depthTest: false, sizeAttenuation: false, transparent: true }));
    sp.scale.set(0.034, 0.034, 1); sp.renderOrder = 12; sp.visible = false; world.scene.add(sp);
    const b = new THREE.Box3().setFromObject(it.obj); const top = isFinite(b.max.y) ? b.max.y : 1;
    return { it, sp, top };
  });
}
function wantedLabels() {
  if (!room || !introDone) return [];
  const t = currentTask(); if (!t) return ["Porta d'uscita"];
  const m = TASK_TARGETS[room.id]?.[t.id]; return typeof m === "function" ? m(ctx) : m || [];
}
function updateMarkers(time) {
  const want = wantedLabels(); const v = new THREE.Vector3();
  for (const mk of markers) {
    const on = !mk.it.removed && mk.it.when() && want.some((w) => mk.it.label.includes(w));
    mk.sp.visible = on;
    if (on) { mk.it.obj.getWorldPosition(v); mk.sp.position.set(v.x, mk.top + 0.35 + Math.sin(time * 3 + v.x) * 0.06, v.z); }
  }
}

// ---------- pausa ----------
function pause() {
  if (state !== "room" || busy()) return;
  const p = modal(`<div class="eyebrow">Pausa</div><h2>⏸ Gioco in pausa</h2><div class="menu-btns" style="margin-top:8px">
    <button class="btn primary" data-a="resume">▶ Riprendi</button><button class="btn" data-a="photo">📷 Foto 360° reale</button>
    <button class="btn" data-a="settings">⚙ Impostazioni</button><button class="btn" data-a="map">🗺 Torna alla mappa</button><button class="btn" data-a="hub">🏫 Torna all'ingresso</button></div>`);
  p.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => {
    const a = b.dataset.a; sfx.click(); closeModal();
    if (a === "photo") openPhoto();
    if (a === "settings") showSettings(settings, applySettings);
    if (a === "map") { leaveRoom(); openMap(); }
    if (a === "hub") { leaveRoom(); openHub(); }
  }));
}

// ---------- foto 360° reale ----------
const photoPano = new Pano($("photoCanvas")); let photoIdx = 0;
function openPhoto() {
  if (!room) return; document.exitPointerLock?.(); $("photoView").hidden = false; photoPano.start(); setPhoto(0);
}
function setPhoto(i) { const list = room.photos; photoIdx = (i + list.length) % list.length; $("photoTitle").textContent = `${room.name} · foto reale ${photoIdx + 1}/${list.length}`; photoPano.load(`foto/${list[photoIdx]}.jpg`, { lon: 180 }); }
$("photoPrev").onclick = () => setPhoto(photoIdx - 1); $("photoNext").onclick = () => setPhoto(photoIdx + 1);
$("photoClose").onclick = () => { $("photoView").hidden = true; photoPano.stop(); };

// ---------- HUD e input ----------
$("btnPhoto").onclick = () => openPhoto();
$("btnHint").onclick = () => openHint();
$("btnInv").onclick = () => { if (ctx && !busy()) showInventory(ctx.state.inv); };
$("btnPause").onclick = () => pause();
function openHint() {
  if (!ctx || busy() || !introDone) return;
  const t = currentTask();
  const render = () => showHint(t, ctx.state.hints[t?.id] || 0, () => { ctx.state.hints[t.id] = (ctx.state.hints[t.id] || 0) + 1; ctx.state.hintsUsed++; refreshHud(); closeModal(); render(); });
  render();
}
let current = null;
function useCurrent() { if (current && !busy()) { sfx.click(); current.use(current); } }

addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  if (ui.modalOpen) {
    if (e.code === "Escape" && ui.closable !== false) { closeModal(false); e.preventDefault(); return; }
    modalKey(e); return;
  }
  if (!$("photoView").hidden) { if (e.code === "Escape" || e.code === "KeyF") $("photoClose").click(); return; }
  if (ui.dialogOpen) {
    if (["KeyE", "Space", "Enter"].includes(e.code)) { dialogAdvance(); e.preventDefault(); }
    if (/^Digit[1-4]$/.test(e.code)) dialogChoice(+e.code.slice(5) - 1);
    return;
  }
  if (state !== "room") return;
  input.keys.add(e.code);
  if (e.code === "KeyE") useCurrent();
  if (e.code === "Tab") { e.preventDefault(); $("btnInv").click(); }
  if (e.code === "KeyH") openHint();
  if (e.code === "KeyF") openPhoto();
  if (e.code === "Escape") pause();
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
});
addEventListener("keyup", (e) => input.keys.delete(e.code));
addEventListener("blur", () => input.keys.clear());

// mouse: pointer lock (clic sul gioco) oppure trascinamento
const canvas = $("game");
// niente cattura del mouse: la visuale segue il personaggio; trascinando col mouse si può comunque guardare intorno
document.addEventListener("pointerlockchange", () => {
  input.locked = document.pointerLockElement === canvas;
  $("clickToPlay").hidden = input.locked || state !== "room" || isTouch || !introDone;
  if (!input.locked && state === "room" && !busy()) pause();
});
document.addEventListener("mousemove", (e) => { if (input.locked && !busy()) look(e.movementX, e.movementY); });
let drag = null;
canvas.addEventListener("pointerdown", (e) => { if (!input.locked) drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
addEventListener("pointermove", (e) => { if (drag && drag.id === e.pointerId && !busy()) { look((e.clientX - drag.x) * 1.4, (e.clientY - drag.y) * 1.4); drag.x = e.clientX; drag.y = e.clientY; } });
addEventListener("pointerup", (e) => { if (drag && drag.id === e.pointerId) drag = null; });

// comandi touch: joystick a sinistra, pulsante E a destra
if (isTouch) {
  $("touchPad").hidden = false;
  const stick = $("stick"), knob = stick.querySelector("i"); let sid = null, c0 = null;
  stick.addEventListener("pointerdown", (e) => { sid = e.pointerId; const r = stick.getBoundingClientRect(); c0 = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; stick.setPointerCapture(e.pointerId); e.stopPropagation(); });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId !== sid) return; let dx = e.clientX - c0.x, dy = e.clientY - c0.y; const l = Math.hypot(dx, dy), m = 45; if (l > m) { dx *= m / l; dy *= m / l; } knob.style.transform = `translate(${dx}px, ${dy}px)`; input.touch.x = dx / m; input.touch.y = -dy / m; });
  const end = () => { sid = null; knob.style.transform = ""; input.touch.x = input.touch.y = 0; };
  stick.addEventListener("pointerup", end); stick.addEventListener("pointercancel", end);
  $("touchUse").addEventListener("click", () => (ui.dialogOpen ? dialogAdvance() : useCurrent()));
  $("hud").querySelector(".keys").hidden = true;
}

// ---------- ciclo principale ----------
const clock = new THREE.Clock(); let stepT = 0; const perf = { n: 0, t: 0, lowered: new Set() };
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  if (state !== "room" && state !== "win") return;
  if (!world.scene || !player.model) return;
  input.enabled = !busy() && state === "room";
  updatePlayer(dt);
  for (const f of world.animated) f(dt);
  // il prof si gira verso il giocatore
  for (const n of world.npcs) {
    const dx = player.pos.x - n.x, dz = player.pos.y - n.z, d = Math.hypot(dx, dz);
    const want = d < 6 ? Math.atan2(dx, dz) : n.h.root.rotation.y;
    let diff = want - n.h.root.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); n.h.root.rotation.y += diff * Math.min(1, dt * 4);
    n.h.animate(dt, 0);
    if (d < 5) { const rel = Math.atan2(dx, dz) - n.h.root.rotation.y; n.h.lookAt(Math.atan2(Math.sin(rel), Math.cos(rel)), (player.y - 0.1) * 0.15); }
    if (!introDone && !ui.dialogOpen) n.h.wave(t); else n.h.rest();
    if (room && isSpeaking(room.teacher.name)) n.h.talk();
  }
  if (input.enabled && player.speed > 1.2) { stepT -= dt * player.speed; if (stepT < 0) { sfx.step(); stepT = 1.6; } }
  // interazione
  current = input.enabled ? findInteractable() : null;
  highlight(current, t);
  showPrompt(current ? current.label : null);
  // freccia guida: sul prof all'inizio, sulla porta alla fine
  if (guide) {
    const allDone = room && room.tasks.every((x) => ctx.state.done[x.id]);
    const target = !introDone ? teacher.root.position : allDone && !exitDoor.isOpen ? exitDoor.group.position : null;
    guide.visible = !!target && !ui.dialogOpen;
    if (target) guide.position.set(target.x, (target === teacher.root.position ? 2.75 : 2.85) + Math.sin(t * 3) * 0.08, target.z);
  }
  updateMarkers(t);
  if (timing && !busy()) { timer += dt; $("hudTimer").textContent = fmtTime(timer); }
  // se il computer fatica (meno di 28 fps per qualche secondo) abbassa da solo la qualità grafica
  if (state === "room" && !document.hidden) {
    perf.n++; perf.t += dt;
    if (perf.t > 4) { const fps = perf.n / perf.t; perf.n = 0; perf.t = 0;
      if (fps < 28 && settings.quality !== "bassa" && !perf.lowered.has(settings.quality)) { perf.lowered.add(settings.quality); settings.quality = settings.quality === "alta" ? "media" : "bassa"; applySettings(); toast(`Grafica impostata su "${settings.quality}" per andare più fluido`); } }
  }
  render();
}

// ---------- avvio ----------
const T0 = performance.now();
(async function boot() {
  $("loadBar").style.width = "30%";
  try { await document.fonts.ready; } catch (e) { /* font non critici */ }
  $("loadBar").style.width = "70%";
  await Promise.all([new Promise((r) => { const img = new Image(); img.onload = img.onerror = r; img.src = "foto/entrance_01.jpg"; }), loadCharacterModel(), loadTeacherModel()]);
  $("loadBar").style.width = "100%";
  const skipIntro = /stanza=/.test(location.hash); setTimeout(() => { if (state === "loading") { state = "menu"; show("menu"); refreshMenuStars(); } }, skipIntro ? 200 : Math.max(200, 2400 - (performance.now() - T0)));
  loop();
  // scorciatoia per i test: index.html#stanza=chimica
  const m = location.hash.match(/stanza=(\w+)/); if (m && ROOMS.find((r) => r.id === m[1])) setTimeout(() => startRoom(m[1]), 300);
  window.__game = { startRoom, get ctx() { return ctx; }, get state() { return state; }, get introDone() { return introDone; }, player, input, world, ROOMS, tryExit, closeModal };
})();
$("mapBoard").onclick = () => { sfx.click(); showBoard(); };
