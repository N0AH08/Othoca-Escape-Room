/*
 * ESCAPE ROOM NELLA SCUOLA 3D
 * ---------------------------
 * Si carica dopo config.js e percorso-config.js: usa gli stessi enigmi (con le varianti a ogni partita),
 * ma le "zone" sono le stanze della scuola ricostruita in 3D (scuola3d-mappa.js).
 * Gli oggetti degli enigmi e le porte chiuse sono in SCUOLA.items e SCUOLA.doors.
 */
window.SCUOLA_MODE = "escape";
GAME.saveKey = "othoca-scuola3d-v1";
GAME.startScene = "ingresso";
GAME.winTitle = "Il sigillo è salvo!";

GAME.intro = `
  <p>Durante i lavori nel cortile è riemerso un <strong>sigillo punico in terracotta</strong>, un ricordo
  dell'antica <em>Othoca</em>. Il professore di storia l'ha spezzato in <strong>quattro frammenti</strong>
  e li ha nascosti nell'ala nuova della scuola. La cassa del sigillo è in <strong>palestra</strong>.</p>
  <p>Ogni enigma apre una porta: dall'ingresso all'atrio, poi l'andito, la vetrata, il corridoio e la palestra. Vi accompagna <strong>Othy</strong>.</p>
  <p class="muted"><b>W</b> avanti, <b>S</b> indietro, <b>A</b>/<b>D</b> per girare, <b>Shift</b> per correre, <b>V</b> per la visuale in prima persona.
  Potete anche cliccare sul pavimento o trascinare per guardarvi intorno. Gli oggetti si vedono <b>solo da vicino</b>:
  quando il robot ci arriva davanti l'enigma si apre (per riaprirlo premete <b>E</b>). Il riquadro <b>Obiettivo</b> e le frecce rosa vi indicano la strada.</p>`;

const SAY = {
  ingresso: "Ciao! Io sono Othy. Guarda l'insegna sulla pensilina: OTHOCA, come la mia città! Usa W, A, S, D per camminare ed entriamo.",
  vestibolo: "Siamo entrati! La porta a vetri verso l'atrio è chiusa con un tastierino. Cerchiamo un promemoria qui intorno!",
  atrio: "Che bello l'atrio con le colonne! Ma l'andito è bloccato… su quella bacheca blu c'è un messaggio strano.",
  andito: "Ecco i distributori e la scala rossa! Su quella scrivania c'è un vecchio monitor collegato alla vetrata.",
  anditoF: "La fioriera sotto il lucernario e il murale con la rosa! Sulla bacheca rossa c'è qualcosa di antico… e la vetrina dei trofei ha un cartellino strano.",
  corrPal: "Un corridoio pieno di quadri elettrici… quello grande ha degli interruttori!",
  corrPal2: "Siamo davanti al palazzetto! Quel pannello accanto alla porta comanda le luci.",
  palestra: "Che spazio enorme! La cassa del sigillo dev'essere qui… guarda sotto il tabellone!"
};
const NAMES = { ingresso: "Ingresso", vestibolo: "Ingresso", atrio: "Atrio", andito: "Andito", anditoF: "Andito · fioriera", corrPal: "Corridoio della palestra", corrPal2: "Ingresso del palazzetto", palestra: "Palazzetto" };
const ITEM_ZONE = { piazzale: "ingresso" };
GAME.scenes = Object.keys(SAY).map((id) => ({
  id, name: NAMES[id], say: SAY[id], links: [],
  items: Object.entries(SCUOLA.items).filter(([, it]) => (ITEM_ZONE[it.room] || it.room) === id).map(([puzzle, it]) => ({ puzzle, label: it.label, icon: it.icon }))
}));

// nei testi degli enigmi il "palazzetto" diventa la palestra
for (const p of Object.values(GAME.puzzles)) {
  const fix = (s) => typeof s === "string" ? s.replace(/del palazzetto/g, "della palestra").replace(/nel palazzetto/g, "in palestra").replace(/al palazzetto/g, "alla palestra").replace(/il palazzetto/g, "la palestra").replace(/palazzetto/g, "palestra") : s;
  for (const k of ["title", "body", "intro"]) p[k] = fix(p[k]);
  if (p.reward) p.reward.text = fix(p.reward.text);
  if (Array.isArray(p.hints)) p.hints = p.hints.map(fix);
}
GAME.outro = GAME.outro.replace(/sotto il tabellone/g, "sotto il tabellone della palestra");
