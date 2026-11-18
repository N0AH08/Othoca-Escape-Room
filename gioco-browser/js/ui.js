// Interfaccia: dialoghi, finestre dei puzzle, inventario, aiuti, documenti, pausa, impostazioni, vittoria.
import { sfx } from "./audio.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const ui = { dialogOpen: false, modalOpen: false, onModalClose: null, speaker: null };
export function isSpeaking(name) { return !!(dlg && dlg.typing && ui.speaker === name); }
export function busy() { return ui.dialogOpen || ui.modalOpen || !$("photoView").hidden; }

// ---------- toast e prompt ----------
let toastTimer = 0;
export function toast(text, ms = 2600) { const t = $("toast"); t.textContent = text; t.hidden = false; t.style.animation = "none"; void t.offsetWidth; t.style.animation = ""; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms); }
export function showPrompt(text) { const p = $("prompt"); if (!text) { p.hidden = true; return; } $("promptText").textContent = text; p.hidden = false; }

// ---------- dialoghi con effetto macchina da scrivere ----------
// lines: [{ who, role, text, choices?: [{ t, then?: () => void, next?: lines }] }]
let dlg = null;
export function dialog(lines, onEnd) {
  ui.dialogOpen = true; document.exitPointerLock?.();
  dlg = { lines: lines.slice(), i: -1, typing: false, full: "", shown: 0, timer: 0, onEnd };
  $("dialog").hidden = false; nextLine();
}
function nextLine() {
  if (!dlg) return;
  dlg.i++;
  if (dlg.i >= dlg.lines.length) { const cb = dlg.onEnd; dlg = null; $("dialog").hidden = true; ui.dialogOpen = false; cb && cb(); return; }
  const l = dlg.lines[dlg.i];
  $("dlgWho").textContent = l.who || ""; $("dlgRole").textContent = l.role || "";
  const im = $("dlgImg"); if (l.img) { im.src = l.img; im.hidden = false; } else im.hidden = true;
  $("dlgChoices").innerHTML = ""; $("dlgNext").hidden = false;
  dlg.full = l.text; dlg.shown = 0; dlg.typing = true; ui.speaker = l.who;
  clearInterval(dlg.timer);
  dlg.timer = setInterval(() => {
    if (!dlg) return;
    dlg.shown += 2; $("dlgText").textContent = dlg.full.slice(0, dlg.shown);
    if (dlg.shown % 6 === 0) sfx.blip();
    if (dlg.shown >= dlg.full.length) finishTyping();
  }, 22);
}
function finishTyping() {
  if (!dlg) return; clearInterval(dlg.timer); dlg.typing = false; $("dlgText").textContent = dlg.full;
  const l = dlg.lines[dlg.i];
  if (l.choices) {
    $("dlgNext").hidden = true;
    const box = $("dlgChoices");
    l.choices.forEach((c, k) => {
      const b = document.createElement("button"); b.className = "btn"; b.textContent = `${k + 1}. ${c.t}`;
      b.onclick = (e) => { e.stopPropagation(); sfx.click(); if (c.next) dlg.lines.splice(dlg.i + 1, 0, ...c.next); c.then && c.then(); nextLine(); };
      box.appendChild(b);
    });
  }
}
export function dialogAdvance() {
  if (!dlg) return;
  if (dlg.typing) { finishTyping(); return; }
  if (dlg.lines[dlg.i].choices) return;
  nextLine();
}
export function dialogChoice(n) { const b = $("dlgChoices").children[n]; if (b) b.click(); }
$("dialog").addEventListener("click", dialogAdvance);

// ---------- finestra generica ----------
export function modal(html, { wide = false, onClose = null, closable = true } = {}) {
  ui.modalOpen = true; ui.onModalClose = onClose; ui.closable = closable; document.exitPointerLock?.();
  const p = $("modalPanel"); p.className = "panel" + (wide ? " wide" : ""); p.innerHTML = html; $("modal").hidden = false;
  return p;
}
export function closeModal(result) {
  if (!ui.modalOpen) return;
  $("modal").hidden = true; $("modalPanel").innerHTML = ""; ui.modalOpen = false;
  const cb = ui.onModalClose; ui.onModalClose = null; cb && cb(result);
}
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal" && ui.closable) closeModal(false); });

export function readDoc(title, html, img = null) {
  return new Promise((res) => {
    const p = modal(`<div class="eyebrow">Documento</div><div class="doc"><h3>${esc(title)}</h3>${img ? `<img src="${img}" style="width:100%;border-radius:8px;margin-bottom:8px">` : ""}${html}</div><div class="row"><button class="btn primary" data-x>Chiudi</button></div>`, { onClose: () => res() });
    p.querySelector("[data-x]").onclick = () => closeModal();
  });
}
export function canvasDoc(title, canvas, note = "") {
  return new Promise((res) => {
    const p = modal(`<div class="eyebrow">Guardi da vicino</div><h2>${esc(title)}</h2><div data-c></div>${note ? `<p class="muted" style="margin-top:10px">${note}</p>` : ""}<div class="row"><button class="btn primary" data-x>Chiudi</button></div>`, { wide: true, onClose: () => res() });
    const c = null; const img = document.createElement("img"); img.src = canvas.toDataURL ? canvas.toDataURL() : canvas.src; img.style.cssText = "width:100%;border-radius:12px;background:#fff";
    p.querySelector("[data-c]").appendChild(img); void c;
    p.querySelector("[data-x]").onclick = () => closeModal();
  });
}

// ---------- puzzle ----------
// ritorna una Promise: true se risolto, false se chiuso
export function puzzle(def) {
  return new Promise((resolve) => {
    const head = `<div class="eyebrow">${esc(def.kind || "Enigma")}</div><h2>${esc(def.title)}</h2>${def.body || ""}`;
    const fb = `<div class="feedback" data-fb></div>`;
    const foot = `<div class="row"><button class="btn ghost" data-x>Chiudi</button></div>`;
    let p;
    const done = (ok) => { if (ok) { sfx.ok(); setTimeout(() => closeModal(true), 700); } };
    const setFb = (t, good) => { const f = p.querySelector("[data-fb]"); f.textContent = t; f.className = "feedback " + (good ? "good" : "bad"); p.classList.remove("pz-bad", "pz-good"); void p.offsetWidth; p.classList.add(good ? "pz-good" : "pz-bad"); };
    const open = (inner, wide = false) => { p = modal(head + inner + fb + foot, { wide, onClose: (r) => resolve(!!r) }); p.classList.add("pz", "pz-" + def.type); p.querySelector("[data-x]").onclick = () => closeModal(false); return p; };

    if (def.type === "code") {
      const keys = def.keys || ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"];
      open(`<div class="lock"><div class="shackle"></div><div class="lock-body"><div class="code-display" data-d></div></div></div><div class="keypad">${keys.map((k) => `<button class="btn" data-k="${k}">${k}</button>`).join("")}</div>`);
      let val = ""; const d = p.querySelector("[data-d]");
      const render = () => (d.innerHTML = def.answer.split("").map((_, i) => `<span class="dial ${i < val.length ? "set" : ""}">${i < val.length ? esc(val[i]) : "•"}</span>`).join(""));
      render();
      const press = (k) => {
        sfx.click();
        if (k === "⌫") val = val.slice(0, -1);
        else if (k === "OK") {
          if (val.toUpperCase() === def.answer.toUpperCase()) { setFb(def.okText || "Esatto! Si sblocca.", true); p.querySelector(".lock")?.classList.add("open"); sfx.lock(); done(true); }
          else { setFb(def.badText || "Codice sbagliato, riprova.", false); sfx.bad(); val = ""; }
        } else if (val.length < def.answer.length) val += k;
        render();
      };
      p.querySelectorAll("[data-k]").forEach((b) => (b.onclick = () => press(b.dataset.k)));
      p._key = (e) => { const k = e.key.toUpperCase(); if (e.key === "Backspace") press("⌫"); else if (e.key === "Enter") press("OK"); else if (keys.includes(k)) press(k); };
    }

    if (def.type === "sequence") {
      open(`<div class="seq-grid">${def.items.map((it, i) => `<button class="seq-btn" data-i="${i}" style="background:${it.color || "#444"}">${it.icon ? `<div style="font-size:28px">${it.icon}</div>` : ""}${esc(it.label)}</button>`).join("")}</div><div class="seq-progress" data-pr></div>`);
      let pos = 0; const pr = p.querySelector("[data-pr]");
      const render = () => (pr.textContent = def.answer.map((_, i) => (i < pos ? "●" : "○")).join(" "));
      render();
      p.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => {
        const i = +b.dataset.i; b.classList.add("lit"); setTimeout(() => b.classList.remove("lit"), 220);
        if (def.sound) def.sound(i); else sfx.click();
        if (i === def.answer[pos]) { pos++; render(); if (pos === def.answer.length) { setFb(def.okText || "Sequenza corretta!", true); done(true); } }
        else { pos = 0; render(); setFb(def.badText || "Ordine sbagliato: si ricomincia.", false); sfx.bad(); }
      }));
    }

    if (def.type === "wiring") {
      const n = def.left.length;
      const rows = def.left.map((l, i) => `<button class="btn" data-l="${i}">${esc(l)}</button><span></span><button class="btn" data-r="${i}">${esc(def.right[i])}</button>`).join("");
      open(`<p class="muted">Clicca un elemento a sinistra e poi quello giusto a destra.</p><div class="wire" data-w>${rows}<svg data-svg></svg></div>`);
      const links = {}; let sel = null; const svg = p.querySelector("[data-svg]"); const wrap = p.querySelector("[data-w]");
      const colors = ["#f0559a", "#4fc3f7", "#ffd54f", "#81c784", "#ba68c8"];
      const draw = () => {
        const R = wrap.getBoundingClientRect(); svg.innerHTML = "";
        Object.entries(links).forEach(([l, r], k) => {
          const a = p.querySelector(`[data-l="${l}"]`).getBoundingClientRect(), b = p.querySelector(`[data-r="${r}"]`).getBoundingClientRect();
          const x1 = a.right - R.left, y1 = a.top + a.height / 2 - R.top, x2 = b.left - R.left, y2 = b.top + b.height / 2 - R.top;
          svg.innerHTML += `<path d="M${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}" stroke="${colors[+l % colors.length]}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
        });
        p.querySelectorAll("[data-l]").forEach((b) => b.classList.toggle("linked", b.dataset.l in links));
        p.querySelectorAll("[data-r]").forEach((b) => b.classList.toggle("linked", Object.values(links).includes(+b.dataset.r)));
      };
      p.querySelectorAll("[data-l]").forEach((b) => (b.onclick = () => { sfx.click(); p.querySelectorAll("[data-l]").forEach((x) => x.classList.remove("sel")); sel = +b.dataset.l; b.classList.add("sel"); }));
      p.querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => {
        if (sel === null) return; sfx.click(); const r = +b.dataset.r;
        for (const k of Object.keys(links)) if (links[k] === r) delete links[k];
        links[sel] = r; p.querySelector(`[data-l="${sel}"]`).classList.remove("sel"); sel = null; draw();
        if (Object.keys(links).length === n) {
          const wrong = Object.entries(links).filter(([l, r2]) => def.pairs[l] !== r2);
          if (!wrong.length) { setFb(def.okText || "Collegamenti corretti!", true); done(true); }
          else { setFb(`${wrong.length} collegament${wrong.length > 1 ? "i sbagliati" : "o sbagliato"}: li ho staccati.`, false); sfx.bad(); wrong.forEach(([l]) => delete links[l]); setTimeout(draw, 250); }
        }
      }));
    }

    if (def.type === "quiz") {
      const qs = def.questions || [{ q: def.question, options: def.options, correct: def.correct, explain: def.explain }];
      let qi = 0;
      open(`<div data-q></div>`);
      const show = () => {
        const q = qs[qi]; const box = p.querySelector("[data-q]");
        box.innerHTML = `${qs.length > 1 ? `<div class="muted" style="font-size:13px">Domanda ${qi + 1} di ${qs.length}</div>` : ""}<p style="font-size:18px;font-weight:600">${esc(q.q)}</p><div class="quiz-opts">${q.options.map((o, i) => `<button class="btn" data-o="${i}">${String.fromCharCode(65 + i)}. ${esc(o)}</button>`).join("")}</div>`;
        box.querySelectorAll("[data-o]").forEach((b) => (b.onclick = () => {
          if (+b.dataset.o === q.correct) {
            sfx.click(); setFb((q.explain ? "Giusto! " + q.explain : "Giusto!"), true);
            if (qi < qs.length - 1) { qi++; setTimeout(show, 1100); } else done(true);
          } else { sfx.bad(); setFb(q.wrong || "Non è questa: rileggi bene e riprova.", false); b.disabled = true; }
        }));
      };
      show();
    }

    if (def.type === "terminal") {
      open(`<div class="term" data-t></div>`, true);
      const t = p.querySelector("[data-t]");
      const print = (s, c = "") => { const d = document.createElement("div"); d.innerHTML = c ? `<span style="color:${c}">${esc(s)}</span>` : esc(s); t.insertBefore(d, t.lastChild); t.scrollTop = 1e6; };
      t.innerHTML = `<div>&gt; <input data-in autocomplete="off" spellcheck="false"></div>`;
      (def.intro || []).forEach((l) => print(l));
      const inp = p.querySelector("[data-in]"); setTimeout(() => inp.focus(), 50);
      inp.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key !== "Enter") return;
        const v = inp.value.trim(); inp.value = ""; print("> " + v, "#c9ffd6"); sfx.click();
        const r = def.run(v.toLowerCase(), print);
        if (r === true) { setFb(def.okText || "Accesso consentito!", true); done(true); }
      });
    }

    if (def.type === "blocks") {
      open(`<p class="muted">Clicca i blocchi nell'ordine giusto: finiscono nel programma. Clicca un blocco del programma per toglierlo.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div><b>Blocchi</b><div class="blocks" data-src></div></div><div><b>Programma</b><div class="slots" data-dst></div></div></div>
        <div class="row" style="justify-content:center"><button class="btn primary" data-run>▶ Esegui</button></div>`, true);
      const src = p.querySelector("[data-src]"), dst = p.querySelector("[data-dst]"); const prog = [];
      const render = () => {
        src.innerHTML = def.blocks.map((b, i) => prog.includes(i) ? "" : `<div class="blk" data-b="${i}" style="background:${b.color}">${esc(b.t)}</div>`).join("");
        dst.innerHTML = prog.map((i, k) => `<div class="blk" data-p="${k}" style="background:${def.blocks[i].color}">${k + 1}. ${esc(def.blocks[i].t)}</div>`).join("") || `<span class="muted">vuoto</span>`;
        src.querySelectorAll("[data-b]").forEach((b) => (b.onclick = () => { sfx.click(); prog.push(+b.dataset.b); render(); }));
        dst.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => { sfx.click(); prog.splice(+b.dataset.p, 1); render(); }));
      };
      render();
      p.querySelector("[data-run]").onclick = () => {
        const ok = prog.length === def.answer.length && prog.every((v, i) => v === def.answer[i]);
        if (ok) { setFb(def.okText || "Il programma funziona!", true); done(true); }
        else { sfx.bad(); setFb(def.badText || "Il robot si blocca: l'ordine non è giusto.", false); }
      };
    }
  });
}
export function modalKey(e) { const p = $("modalPanel"); if (p && p._key) p._key(e); }

// ---------- inventario ----------
export function showInventory(items) {
  const html = items.length
    ? `<div class="inv-grid">${items.map((it) => `<div class="inv-item"><div class="ic">${it.icon}</div><b>${esc(it.name)}</b><small>${esc(it.desc || "")}</small></div>`).join("")}</div><p class="muted" style="margin-top:12px">Gli oggetti si usano da soli quando interagisci con la cosa giusta (E).</p>`
    : `<p class="muted">Lo zaino è vuoto. Cerca oggetti utili nella stanza!</p>`;
  const p = modal(`<div class="eyebrow">Zaino</div><h2>Inventario</h2>${html}<div class="row"><button class="btn primary" data-x>Chiudi</button></div>`);
  p.querySelector("[data-x]").onclick = () => closeModal();
}

// ---------- aiuti ----------
export function showHint(task, level, onMore) {
  if (!task) { const p = modal(`<div class="eyebrow">Aiuto</div><h2>Tutto fatto!</h2><p>Hai completato tutte le sfide: vai verso la porta d'uscita.</p><div class="row"><button class="btn primary" data-x>Ok</button></div>`); p.querySelector("[data-x]").onclick = () => closeModal(); return; }
  const shown = task.hints.slice(0, level);
  const p = modal(`<div class="eyebrow">Aiuto · ${esc(task.title)}</div><h2>💡 Un suggerimento</h2>
    ${shown.length ? shown.map((h, i) => `<p><b>${i + 1}.</b> ${esc(h)}</p>`).join("") : `<p class="muted">Vuoi un aiuto per questa sfida? Ogni aiuto viene contato nel punteggio finale.</p>`}
    <div class="row">${level < task.hints.length ? `<button class="btn primary" data-more>${level ? "Un altro aiuto" : "Sì, dammi un aiuto"}</button>` : ""}<button class="btn" data-x>Chiudi</button></div>`);
  p.querySelector("[data-x]").onclick = () => closeModal();
  const m = p.querySelector("[data-more]"); if (m) m.onclick = () => { sfx.hint(); onMore(); };
}

// ---------- impostazioni ----------
export function showSettings(s, onChange) {
  const p = modal(`<div class="eyebrow">Impostazioni</div><h2>⚙ Impostazioni</h2>
    <div class="set-row"><label>Volume effetti</label><input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-s="volume"></div>
    <div class="set-row"><label>Volume musica</label><input type="range" min="0" max="1" step="0.05" value="${s.music}" data-s="music"></div>
    <div class="set-row"><label>Sensibilità del mouse</label><input type="range" min="0.3" max="2.5" step="0.1" value="${s.sens}" data-s="sens"></div>
    <div class="set-row"><label>Dimensione del testo</label><input type="range" min="14" max="22" step="1" value="${s.fs}" data-s="fs"></div>
    <div class="set-row"><label>Inverti asse Y</label><input type="checkbox" ${s.invertY ? "checked" : ""} data-s="invertY"></div>
    <div class="set-row"><label>Qualità grafica</label><select data-s="quality" class="btn small">${["alta", "media", "bassa"].map((q) => `<option ${s.quality === q ? "selected" : ""}>${q}</option>`).join("")}</select></div>
    <p class="muted">I sottotitoli dei dialoghi sono sempre attivi.</p>
    <div class="row"><button class="btn primary" data-x>Fatto</button></div>`);
  p.querySelectorAll("[data-s]").forEach((el) => el.addEventListener("input", () => { const k = el.dataset.s; s[k] = el.type === "checkbox" ? el.checked : el.tagName === "SELECT" ? el.value : +el.value; onChange(s); }));
  p.querySelector("[data-x]").onclick = () => closeModal();
}

export const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export { esc, $ };
