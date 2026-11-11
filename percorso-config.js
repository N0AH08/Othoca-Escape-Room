/*
 * CONFIGURAZIONE DEL GIOCO A CAMMINATA CONTINUA
 * ----------------------------------------------
 * Usa gli enigmi di config.js sul tratto continuo dell'ala nuova
 * (ingresso → atrio → corridoio → andito → corridoio del palazzetto → palazzetto).
 * Ogni enigma apre il passaggio successivo; nel palazzetto c'è la cassa del sigillo.
 *
 * Per ogni punto di scatto:
 *   links: collegamenti reali del tour (yaw = direzione nella foto, dist = distanza stimata in metri)
 *          lock = enigma che apre il passaggio, lockedSay = cosa dice Othy se è chiuso
 *   items: oggetti/indizi (yaw e pitch nella foto)
 *   wall:  distanza media delle pareti (m) per proiettare la foto; box: [mezza larghezza, mezza profondità]
 *          per i corridoi stretti (nel sistema della foto: x = destra/sinistra, z = avanti/indietro)
 */
window.PERCORSO_3D = true;

GAME.minutes = 25;
// Modalità open day: durata della partita e costo degli indizi
GAME.modes = {
  breve: { name: "Breve", minutes: 15, hintPenalty: 30, desc: "15 minuti · indizi −30 s" },
  lunga: { name: "Lunga", minutes: 25, hintPenalty: 60, desc: "25 minuti · indizi −1 min" }
};
GAME.defaultMode = "breve";
GAME.startScene = "1-2ingresso-dentro";

GAME.intro = `
  <p>Durante i lavori nel cortile è riemerso un <strong>sigillo punico in terracotta</strong>, un ricordo
  dell'antica <em>Othoca</em>. Il professore di storia l'ha spezzato in <strong>quattro frammenti</strong>
  e li ha nascosti lungo l'ala nuova della scuola. La cassa del sigillo è nel <strong>palazzetto</strong>.</p>
  <p>Ogni enigma apre il passaggio successivo; vi accompagna <strong>Othy</strong>. Più tempo vi resta, più punti fate!</p>
  <p class="muted"><b>W</b> avanti, <b>S</b> indietro, <b>A</b>/<b>D</b> per girare, <b>Shift</b> per correre, oppure cliccate
  sul pavimento. Gli oggetti si vedono <b>solo da vicino</b>: quando il robot arriva davanti alla bacheca,
  al quadro elettrico o al monitor, l'enigma si apre. Per riaprirlo premete <b>E</b> (o ESAMINA).
  Il riquadro <b>Obiettivo</b> in alto vi dice dove andare.</p>`;

GAME.outro = `
  <p>La cassa sotto il tabellone si apre con uno scatto: dentro c'è il <strong>sigillo di Othoca</strong>,
  finalmente ricomposto.</p>
  <p>Avete usato informatica, crittografia, elettrotecnica e storia: proprio le cose che si imparano qui.
  <strong>Benvenuti all'Othoca!</strong></p>`;

// Enigmi usati su questo percorso (gli altri restano in config.js per altre versioni)
for (const id of ["tornio", "chimica", "phchart"]) delete GAME.puzzles[id];

GAME.puzzles.pixel = {
  ...GAME.puzzles.pixel,
  title: "Il monitor della portineria",
  body: `<p>Sulla scrivania dell'andito c'è un vecchio monitor tutto nero. Su un foglietto c'è scritto:
    <em>"Accendi i pixel dove c'è un 1, riga per riga."</em></p>
    <p class="muted">Una volta le immagini sui computer si disegnavano così: ogni pixel acceso è un 1, ogni pixel spento è uno 0.</p>`
};
GAME.puzzles.alfabeto = { ...GAME.puzzles.alfabeto, title: "La bacheca rossa: l'alfabeto fenicio" };
GAME.puzzles.tanit = {
  ...GAME.puzzles.tanit,
  title: "La vetrina dei reperti",
  body: GAME.puzzles.tanit.body
    .replace("Sul tavolo c'è un libro sulla Sardegna antica. Dentro, una scheda: al posto del\n        nome di chi l'ha preso in prestito ci sono strani segni.", "In una vetrina dell'andito c'è un cartellino scritto con strani segni, accanto a un coccio di terracotta.")
    .replace("Sul tavolo c'è un libro sulla Sardegna antica. Dentro, una scheda: al posto del\n        nome di chi l'ha preso in prestito ci sono strani segni.", "In una vetrina dell'andito c'è un cartellino scritto con strani segni, accanto a un coccio di terracotta."),
  reward: { ...GAME.puzzles.tanit.reward, text: "Dietro il cartellino della vetrina c'era un altro frammento del sigillo! Il corridoio del palazzetto ora è aperto." }
};
GAME.puzzles.tanit.hints = GAME.puzzles.tanit.hints.map((h) => h.replace("Sul cartellone della biblioteca", "Sulla bacheca rossa dell'andito"));
GAME.puzzles.circuito = {
  ...GAME.puzzles.circuito,
  title: "Il quadro elettrico del corridoio",
  reward: { ...GAME.puzzles.circuito.reward, text: "Clic! Tutte accese. Dal quadro scivola fuori un frammento del sigillo e la porta verso il palazzetto si sblocca." }
};
GAME.puzzles.simon = {
  ...GAME.puzzles.simon,
  title: "Il pannello delle luci del palazzetto",
  body: `<p>Accanto alla porta del palazzetto c'è il pannello che comanda le luci. Quattro spie lampeggiano
    una dopo l'altra. Un cartello dice: <em>"Ripeti la sequenza e la porta si aprirà."</em></p>
    <p class="muted">Premi "Guarda" e poi ripeti la sequenza. Sono 3 sequenze, ognuna un po' più lunga.</p>`,
  reward: { ...GAME.puzzles.simon.reward, text: "Le luci del palazzetto si accendono tutte insieme e la porta si apre!" }
};
GAME.puzzles.finale = {
  ...GAME.puzzles.finale,
  type: "chest",
  title: "La cassa sotto il tabellone",
  body: `<p>Sotto il tabellone c'è una vecchia cassa di legno. Sul coperchio ci sono quattro conche a forma di coccio
    e una scritta incisa: <em>"In fila, come le lettere degli antichi."</em></p>
    <p class="muted">Clicca i cocci che hai raccolto per inserirli nelle conche, da sinistra a destra.</p>`
};
GAME.puzzles.finale.hints = [
  "I numeri sono sui frammenti che hai raccolto (li vedi in alto).",
  "Mettili nell'ordine dell'alfabeto fenicio, come sulla bacheca rossa dell'andito: prima 𐤀, poi 𐤁…",
  GAME.puzzles.finale.hints[2]
];

GAME.scenes = [
  {
    id: "1-2ingresso-dentro", name: "Ingresso", wall: 9,
    say: "Ciao! Io sono Othy. Guarda l'insegna: OTHOCA, come la mia città! Usa W, A, S, D per camminare ed entriamo.",
    links: [{ target: "2-3ingresso-nuovo", yaw: 0.1074, dist: 6 }],
    items: [{ yaw: 0.45, pitch: -0.4, icon: "🏛️", label: "Insegna", puzzle: "targa" }]
  },
  {
    id: "2-3ingresso-nuovo", name: "Atrio", wall: 5.5,
    say: "Le porte verso il corridoio sono chiuse con un tastierino. Cerchiamo un promemoria qui intorno!",
    links: [
      { target: "1-2ingresso-dentro", yaw: -3.1099 },
      { target: "3-4corridoio-nuovo", yaw: 0.278, dist: 6.5, lock: "binario", lockedSay: "Serve il codice del tastierino. Cerca un foglietto vicino alle porte!" }
    ],
    items: [
      { yaw: 1.05, pitch: 0.02, icon: "🗒️", label: "Post-it", puzzle: "postit" },
      { yaw: 0.6, pitch: 0.02, icon: "🔢", label: "Tastierino", puzzle: "binario" }
    ]
  },
  {
    id: "3-4corridoio-nuovo", name: "Corridoio", wall: 6,
    say: "Che bel corridoio! Su quella bacheca blu c'è un messaggio strano…",
    links: [
      { target: "2-3ingresso-nuovo", yaw: -2.1257 },
      { target: "4-5andito-nuovo", yaw: 1.3584, dist: 9, lock: "cesare", lockedSay: "Il passaggio è chiuso. La parola segreta è nel messaggio sulla bacheca blu." }
    ],
    items: [{ yaw: -2.6, pitch: -0.12, icon: "📌", label: "Bacheca blu", puzzle: "cesare" }]
  },
  {
    id: "4-5andito-nuovo", name: "Andito", wall: 8,
    say: "L'andito! Su quella bacheca rossa c'è qualcosa di antico… e la scrivania ha un vecchio monitor.",
    links: [
      { target: "3-4corridoio-nuovo", yaw: 2.9038 },
      { target: "5-6andito-nuovo", yaw: 1.2245, dist: 5, lock: "pixel", lockedSay: "Il passaggio è bloccato da un lettore collegato al monitor della scrivania. Facciamolo funzionare!" }
    ],
    items: [
      { yaw: -1.78, pitch: -0.02, icon: "📜", label: "Bacheca rossa", puzzle: "alfabeto" },
      { yaw: -0.72, pitch: 0.12, icon: "🖥️", label: "Monitor", puzzle: "pixel" }
    ]
  },
  {
    id: "5-6andito-nuovo", name: "Andito delle vetrine", wall: 6,
    say: "Che belle queste vetrine! In una c'è un cartellino scritto con segni strani…",
    links: [
      { target: "4-5andito-nuovo", yaw: 1.6091 },
      { target: "6-7corridoio-palazzetto", yaw: -0.007, dist: 7, lock: "tanit", lockedSay: "Il corridoio del palazzetto è chiuso. Prima leggiamo il cartellino nella vetrina!" }
    ],
    items: [{ yaw: -0.95, pitch: 0.02, icon: "🏺", label: "Vetrina", puzzle: "tanit" }]
  },
  {
    id: "6-7corridoio-palazzetto", name: "Corridoio del palazzetto", box: [1.4, 9],
    say: "Un corridoio pieno di quadri elettrici… quello grande a destra ha degli interruttori!",
    links: [
      { target: "5-6andito-nuovo", yaw: -3.0367 },
      { target: "7-8entrata-palazzetto", yaw: 0.0094, dist: 7, lock: "circuito", lockedSay: "La porta in fondo è bloccata da un circuito. Prova col quadro elettrico!" }
    ],
    items: [{ yaw: 2.62, pitch: 0.0, icon: "💡", label: "Quadro elettrico", puzzle: "circuito" }]
  },
  {
    id: "7-8entrata-palazzetto", name: "Entrata del palazzetto", wall: 4,
    say: "Siamo all'entrata del palazzetto! Quel pannello accanto alla porta comanda le luci.",
    links: [
      { target: "6-7corridoio-palazzetto", yaw: 0.6929 },
      { target: "8-9centropalazzetto", yaw: -3.0307, dist: 12, lock: "simon", lockedSay: "La porta del palazzetto si apre solo con le luci giuste. Prova col pannello!" }
    ],
    items: [{ yaw: 0.7, pitch: -0.2, icon: "🎛️", label: "Pannello luci", puzzle: "simon" }]
  },
  {
    id: "8-9centropalazzetto", name: "Palazzetto", wall: 16,
    say: "Che spazio enorme! La cassa del sigillo dev'essere qui… guarda sotto il tabellone!",
    links: [{ target: "7-8entrata-palazzetto", yaw: -0.0227 }],
    items: [{ yaw: 1.48, pitch: 0.12, icon: "🧰", label: "Cassa", puzzle: "finale" }]
  }
];

// Aspetto di ogni enigma: la finestra imita l'oggetto vero
Object.assign(GAME.puzzles.targa, { skin: "stone" });
Object.assign(GAME.puzzles.postit, { skin: "postit" });
Object.assign(GAME.puzzles.binario, { skin: "keypad" });
Object.assign(GAME.puzzles.cesare, { skin: "cork" });
Object.assign(GAME.puzzles.alfabeto, { skin: "felt" });
Object.assign(GAME.puzzles.pixel, { skin: "crt" });
Object.assign(GAME.puzzles.tanit, { skin: "glass" });
Object.assign(GAME.puzzles.circuito, { skin: "cabinet" });
Object.assign(GAME.puzzles.simon, { skin: "console" });
Object.assign(GAME.puzzles.finale, { skin: "chest" });
