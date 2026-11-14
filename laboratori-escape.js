/*
 * ESCAPE DEI LABORATORI — configurazione del gioco (si carica dopo config.js e laboratori-mappa.js)
 * Quattro laboratori separati: chimica → officina → pneumatica → museo ZooMate.
 * Ogni laboratorio ha un enigma che apre la porta verso il successivo e dà un frammento del sigillo;
 * nello ZooMate i frammenti aprono la cassa finale.
 */
window.PERCORSO_3D = true;
window.SCUOLA_MODE = "escape";
GAME.saveKey = "othoca-laboratori-v1";
GAME.title = "Fuga dai laboratori";
GAME.winTitle = "Sei uscito dai laboratori!";
GAME.minutes = 20;
GAME.modes = {
  breve: { name: "Breve", minutes: 15, hintPenalty: 30, desc: "15 minuti · indizi −30 s" },
  lunga: { name: "Lunga", minutes: 25, hintPenalty: 60, desc: "25 minuti · indizi −1 min" }
};
GAME.defaultMode = "breve";
GAME.startScene = "chimica";

GAME.solo = true;                                   // partite a persona
GAME.leaderboardKey = "othoca-classifica-laboratori-v1";

GAME.intro = `
  <p>Il professore di storia ha nascosto i <strong>quattro frammenti</strong> di un antico sigillo di <em>Othoca</em>
  nei laboratori della scuola. Sei chiuso nel <strong>laboratorio di chimica</strong>: ogni laboratorio si apre solo
  risolvendo l'enigma nascosto negli oggetti che ci sono dentro.</p>
  <p>Chimica → officina meccanica → pneumatica → museo ZooMate, dove ti aspetta la cassa del sigillo. Ti accompagna <strong>Othy</strong>.</p>
  <p class="muted"><b>W</b> avanti, <b>S</b> indietro, <b>A</b>/<b>D</b> per girare, <b>Shift</b> per correre, <b>V</b> per la prima persona.
  Guarda bene gli oggetti dei laboratori: cartelloni, provette, disegni, quadri elettrici, schermi. Quando il robot ci arriva davanti
  l'enigma si apre (per riaprirlo premi <b>E</b>). Le frecce rosa indicano dove andare; la porta con la scritta USCITA porta al laboratorio successivo.</p>`;

GAME.outro = `
  <p>La cassa si apre con uno scatto: dentro c'è il <strong>sigillo di Othoca</strong>, finalmente ricomposto.</p>
  <p>Chimica, meccanica, automazione e tecnologia: sono proprio le cose che si imparano nei laboratori dell'Othoca.
  <strong>Benvenuto!</strong></p>`;

const LAB_SAY = {
  chimica: "Sei chiuso nel laboratorio di chimica! Sul bancone c'è un portaprovette con tre provette colorate… e sulla parete un cartellone del pH.",
  officina: "L'officina meccanica! Torni, fresa, CNC… sul banco da lavoro c'è un disegno tecnico, e il lucchetto della porta chiede una lunghezza.",
  pneumatica: "Il laboratorio di pneumatica! La porta è collegata al quadro elettrico sulla parete: quattro interruttori e tre lampadine.",
  zoomate: "Il museo ZooMate! Gli schermi interattivi sopra la cassa lampeggiano… guardali da vicino!"
};
const LAB_NAMES = { chimica: "Laboratorio di chimica", officina: "Officina meccanica", pneumatica: "Laboratorio di pneumatica", zoomate: "Museo ZooMate" };
GAME.scenes = Object.keys(LAB_SAY).map((id) => ({
  id, name: LAB_NAMES[id], say: LAB_SAY[id], links: [],
  items: Object.entries(SCUOLA.items).filter(([, it]) => it.room === id).map(([puzzle, it]) => ({ puzzle, label: it.label, icon: it.icon }))
}));

// frammenti con il simbolo del laboratorio (nell'ordine dei laboratori: niente alfabeto da decifrare)
const FRAG = { chimica: "⚗", tornio: "⚙", circuito: "💨", simon: "🦩" };

GAME.puzzles.phchart.title = "Il cartellone del pH";
GAME.puzzles.chimica.body = GAME.puzzles.chimica.body.replace("Sul bancone ci sono tre provette", "Nel portaprovette sul bancone ci sono tre provette");
GAME.puzzles.chimica.hints = ["Sulla parete c'è il cartellone che collega ogni colore a un numero (il pH).", GAME.puzzles.chimica.hints[1], GAME.puzzles.chimica.hints[2]];
Object.assign(GAME.puzzles.chimica.reward, { fragment: { ...GAME.puzzles.chimica.reward.fragment, symbol: FRAG.chimica },
  text: "Il lucchetto si apre: in fondo al portaprovette c'era un frammento del sigillo! Si sente uno scatto: la porta con la scritta USCITA è aperta.",
  say: "Sei un vero chimico! Vai verso l'uscita: ti aspetta l'officina." });
GAME.puzzles.tornio.body = GAME.puzzles.tornio.body.replace("Tra i fogli appesi c'è il disegno di un pezzo da fare al tornio.", "Sul banco da lavoro c'è il disegno di un pezzo da fare al tornio.");
Object.assign(GAME.puzzles.tornio.reward, { fragment: { ...GAME.puzzles.tornio.reward.fragment, symbol: FRAG.tornio },
  text: "Il lucchetto si apre. Arrotolato sotto il disegno c'era un altro frammento! La porta dell'officina si sblocca.",
  say: "In officina le misure devono essere precisissime. Avanti, verso la pneumatica!" });
GAME.puzzles.circuito.title = "Il quadro elettrico del laboratorio";
GAME.puzzles.circuito.body = `<p>Sul quadro elettrico accanto alla porta ci sono 4 interruttori (A, B, C, D) e 3 lampadine. Un cartello dice:
  <em>"Accendile tutte e tre e la porta si sblocca."</em></p>`;
Object.assign(GAME.puzzles.circuito.reward, { fragment: { ...GAME.puzzles.circuito.reward.fragment, symbol: FRAG.circuito },
  text: "Clic! Tutte accese. Dal quadro scivola fuori un frammento del sigillo e la porta del laboratorio si sblocca.",
  say: "Logica e circuiti, come un tecnico dell'automazione! Ultima tappa: il museo ZooMate." });
GAME.puzzles.simon = {
  ...GAME.puzzles.simon,
  title: "Gli schermi interattivi",
  unit: "Schermo", roundName: "Sequenza", doneText: "Sequenza perfetta!", nextText: "Bravo! Ora una sequenza più lunga…",
  body: `<p>I quattro schermi del museo si accendono uno alla volta. Sotto c'è scritto:
    <em>"Ripeti la sequenza e la cassa si sbloccherà."</em></p>
    <p class="muted">Premi "Guarda" e poi ripeti la sequenza cliccando gli schermi. Sono 3 sequenze, ognuna un po' più lunga.</p>`,
  hints: ["Guarda bene l'ordine dei colori, puoi riguardarlo quante volte vuoi.", "Ripeti a voce i colori mentre li vedi: \"rosso, blu, giallo…\"", "Non c'è fretta: se sbagli, la sequenza riparte dallo stesso punto."],
  reward: { fragment: { symbol: FRAG.simon, digit: 5 },
    text: "Gli schermi si illuminano tutti insieme e dal mobiletto sotto esce l'ultimo frammento del sigillo!",
    say: "Che memoria! Hai tutti i frammenti: apri la cassa!" }
};
GAME.puzzles.finale = {
  ...GAME.puzzles.finale,
  type: "chest",
  title: "La cassa del sigillo",
  body: `<p>Sotto gli schermi c'è una vecchia cassa di legno con quattro conche a forma di coccio e una scritta incisa:
    <em>"Rimetti i cocci nell'ordine del tuo viaggio."</em></p>
    <p class="muted">Clicca i cocci che hai raccolto per inserirli nelle conche, da sinistra a destra.</p>`,
  hints: [
    "Ogni coccio ha il simbolo del laboratorio dove l'hai trovato.",
    "L'ordine è quello dei laboratori che hai attraversato.",
    "⚗ chimica, poi ⚙ officina, poi 💨 pneumatica, infine 🦩 ZooMate."
  ]
};
// aspetto delle finestre degli enigmi
Object.assign(GAME.puzzles.circuito, { skin: "cabinet" });
Object.assign(GAME.puzzles.simon, { skin: "console" });
Object.assign(GAME.puzzles.finale, { skin: "chest" });
