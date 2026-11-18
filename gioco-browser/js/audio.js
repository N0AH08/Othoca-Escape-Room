// Suoni sintetizzati con WebAudio (nessun file audio esterno).
let ctx = null, master = null, musicGain = null, musicNodes = [];
export const audio = { volume: 0.7, music: 0.35 };

function ensure() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = audio.volume; master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = audio.music * 0.25; musicGain.connect(master);
  return ctx;
}
export function setVolume(v) { audio.volume = v; if (master) master.gain.value = v; }
export function setMusic(v) { audio.music = v; if (musicGain) musicGain.gain.value = v * 0.25; }

function tone(freq, dur = 0.15, type = "sine", vol = 0.25, when = 0, slide = 0) {
  const c = ensure(); const t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur = 0.08, vol = 0.15, freq = 800, when = 0) {
  const c = ensure(); const t = c.currentTime + when;
  const buf = c.createBuffer(1, Math.max(1, c.sampleRate * dur), c.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq;
  const g = c.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(t);
}

export const sfx = {
  click: () => tone(660, 0.06, "square", 0.08),
  coin: () => { tone(988, 0.08, "square", 0.12); tone(1319, 0.3, "square", 0.12, 0.07); tone(1760, 0.25, "triangle", 0.1, 0.14); },
  pick: () => { tone(520, 0.1, "triangle", 0.2); tone(780, 0.14, "triangle", 0.2, 0.08); },
  ok: () => { tone(523, 0.12, "triangle", 0.22); tone(659, 0.12, "triangle", 0.22, 0.1); tone(784, 0.25, "triangle", 0.22, 0.2); },
  bad: () => { tone(220, 0.18, "sawtooth", 0.12); tone(180, 0.25, "sawtooth", 0.12, 0.12); },
  door: () => { noise(0.35, 0.2, 300); tone(110, 0.3, "sine", 0.15, 0, -40); },
  lock: () => { noise(0.05, 0.25, 2000); tone(300, 0.06, "square", 0.08, 0.02); },
  step: () => noise(0.05, 0.05, 500 + Math.random() * 300),
  blip: () => tone(900 + Math.random() * 200, 0.03, "square", 0.03),
  hint: () => { tone(880, 0.1, "sine", 0.15); tone(1175, 0.18, "sine", 0.15, 0.1); },
  win: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, "triangle", 0.22, i * 0.13)); },
  whistle: () => { tone(2200, 0.35, "sine", 0.12, 0, 150); tone(2600, 0.2, "sine", 0.06, 0.05); },
  note: (i) => tone([262, 330, 392, 523, 659, 784][i % 6], 0.3, "triangle", 0.2),
};

// musica ambiente: accordo lento e morbido, diverso per stanza
export function music(seed = 0) {
  stopMusic(); const c = ensure();
  const roots = [196, 220, 174.6, 233, 207.6, 185, 246.9, 164.8];
  const r = roots[seed % roots.length];
  [1, 1.25, 1.5, 2].forEach((m, i) => {
    const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = i === 3 ? "triangle" : "sine"; o.frequency.value = r * m;
    lfo.frequency.value = 0.05 + i * 0.03; lg.gain.value = 0.25; lfo.connect(lg); lg.connect(g.gain);
    g.gain.value = 0.35; o.connect(g); g.connect(musicGain); o.start(); lfo.start();
    musicNodes.push(o, lfo);
  });
}
export function stopMusic() { for (const n of musicNodes) try { n.stop(); } catch (e) { /* già fermo */ } musicNodes = []; }
export function unlockAudio() { const c = ensure(); if (c.state === "suspended") c.resume(); }

// suoni d'ambiente per stanza (sintetizzati): ronzio delle macchine, brusio, eco della palestra
let ambNodes = [], ambTimer = 0;
export function ambience(kind) {
  stopAmbience(); const c = ensure();
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = c.createBiquadFilter(); const g = c.createGain();
  const cfg = { officina: ["lowpass", 260, 0.09], chimica: ["lowpass", 500, 0.03], pneumatica: ["bandpass", 900, 0.025], informatica: ["lowpass", 700, 0.025], aula: ["bandpass", 600, 0.02], zoomate: ["lowpass", 400, 0.02], palestra: ["lowpass", 350, 0.03], teatro: ["lowpass", 300, 0.015] }[kind] || ["lowpass", 400, 0.02];
  f.type = cfg[0]; f.frequency.value = cfg[1]; g.gain.value = cfg[2];
  src.connect(f); f.connect(g); g.connect(master); src.start(); ambNodes.push(src);
  if (kind === "officina") { const o = c.createOscillator(), og = c.createGain(); o.type = "sawtooth"; o.frequency.value = 50; og.gain.value = 0.012; o.connect(og); og.connect(master); o.start(); ambNodes.push(o); }
  if (kind === "palestra") ambTimer = setInterval(() => { if (Math.random() < 0.5) { tone(120, 0.12, "sine", 0.12); tone(110, 0.25, "sine", 0.05, 0.12); } }, 2600);
  if (kind === "pneumatica") ambTimer = setInterval(() => { if (Math.random() < 0.4) noise(0.35, 0.05, 3000); }, 3500);
}
export function stopAmbience() { for (const n of ambNodes) try { n.stop(); } catch (e) { /* già fermo */ } ambNodes = []; clearInterval(ambTimer); }
