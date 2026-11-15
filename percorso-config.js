/*
 * CONFIGURAZIONE DEL GIOCO A CAMMINATA CONTINUA
 * ----------------------------------------------
 * Usa gli enigmi di config.js sul tratto continuo dell'ala nuova
 * (ingresso → atrio → andito → corridoio del palazzetto → palazzetto).
 * Ogni enigma apre il passaggio successivo; nel palazzetto c'è il nucleo di Othy.
 *
 * Per ogni punto di scatto:
 *   links: collegamenti reali del tour (yaw = direzione nella foto, dist = distanza stimata in metri)
 *          lock = enigma che apre il passaggio, lockedSay = cosa dice Othy se è chiuso
 *   items: oggetti/indizi (yaw e pitch nella foto)
 *   wall:  distanza media delle pareti (m) per proiettare la foto; box: [mezza larghezza, mezza profondità]
 *          per i corridoi stretti (nel sistema della foto: x = destra/sinistra, z = avanti/indietro)
 */
window.PERCORSO_3D = true;

GAME.title = "Il codice di Othoca";
GAME.winTitle = "Othy è tornato online!";
GAME.minutes = 10;
// Partita singola, pensata per l'Open Day: massimo 10 minuti a giocatore
GAME.modes = {
  unica: { name: "10 minuti", minutes: 10, hintPenalty: 20, desc: "10 minuti · indizi −20 s" }
};
GAME.defaultMode = "unica";
GAME.startScene = "1-2ingresso-dentro";

GAME.intro = `
  <p><strong>Othy</strong>, il robot mascotte dell'Othoca, ha perso la memoria! I suoi
  <strong>quattro chip</strong> sono stati nascosti nell'ala nuova della scuola.</p>
  <p>Trovaili tutti: ogni chip ha una <strong>lettera</strong> e un <strong>numero</strong>.
  Inserisci i numeri nel <strong>nucleo</strong> del palazzetto, in ordine alfabetico, per riaccendere Othy.</p>
  <p>Il custode sta per chiudere la scuola: hai <strong>10 minuti</strong>. Muoviti! Più tempo ti resta, più punti fai.</p>
  <p class="muted"><b>W</b> avanti, <b>S</b> indietro, <b>A</b>/<b>D</b> per girare, <b>Shift</b> per correre, oppure clicca
  sul pavimento. Gli oggetti si vedono <b>solo da vicino</b>: quando il robot arriva davanti alla bacheca,
  al quadro elettrico o al monitor, l'enigma si apre. Per riaprirlo premi <b>E</b> (o ESAMINA).
  Il riquadro <b>Missione</b> in alto ti dice dove andare.</p>`;

GAME.outro = `
  <p>Il nucleo si accende con un'onda di luce: <strong>Othy riprende a parlare</strong> e ti ringrazia!
  I quattro chip sono di nuovo al loro posto.</p>
  <p>Hai usato informatica, crittografia, elettrotecnica e logica: proprio le cose che si imparano qui.
  <strong>Benvenuto all'Othoca!</strong></p>`;

// ---------- Professori statici: ogni task è assegnato da un docente in carne e ossa ----------
// Compaiono dentro la scuola, vicino all'oggetto del loro task. Non si muovono:
// aspettano il giocatore e presentano la consegna nella finestra dell'enigma.
GAME.profs = {
  postit: {
    name: "Prof.ssa Maria Sanna", short: "Prof.ssa Sanna", subject: "Informatica", icon: "👩‍🏫",
    task: "Ho lasciato un post-it giallo vicino alle porte dell'atrio. Leggilo: contiene il codice per il tastierino."
  },
  binario: {
    name: "Prof. Paolo Melis", short: "Prof. Melis", subject: "Informatica", icon: "👨‍🏫",
    task: "Il tastierino traduce i numeri in binario. Converti il codice del post-it e le porte dell'atrio si apriranno."
  },
  cesare: {
    name: "Prof.ssa Elena Cadeddu", short: "Prof.ssa Cadeddu", subject: "Crittografia", icon: "👩‍🏫",
    task: "Sulla bacheca blu ho nascosto un messaggio cifrato con il codice di Cesare. Sposta le lettere e trova la parola segreta."
  },
  alfabeto: {
    name: "Prof. Luca Piras", short: "Prof. Piras", subject: "Telecomunicazioni", icon: "👨‍🏫",
    task: "Questa è la tabella del codice Morse. Ti servirà nella vetrina dell'andito: studiala bene."
  },
  pixel: {
    name: "Prof.ssa Giulia Chessa", short: "Prof.ssa Chessa", subject: "Informatica", icon: "👩‍🏫",
    task: "Il vecchio monitor accende i pixel dove leggi 1. Disegna il numero e il cassetto si aprirà."
  },
  tanit: {
    name: "Prof. Marco Loi", short: "Prof. Loi", subject: "Elettronica", icon: "👨‍🏫",
    task: "Nella vetrina c'è un messaggio in Morse. Usa la tabella della bacheca rossa e scopri il nome del robot."
  },
  circuito: {
    name: "Prof. Andrea Orrù", short: "Prof. Orrù", subject: "Elettrotecnica", icon: "👨‍🏫",
    task: "Gli interruttori del quadro devono essere tutti nella posizione giusta. Osserva il circuito e sistemalo."
  },
  simon: {
    name: "Prof.ssa Sara Vacca", short: "Prof.ssa Vacca", subject: "Impianti", icon: "👩‍🏫",
    task: "Le luci del palazzetto seguono una sequenza. Guardala, poi ripetila senza sbagliare."
  },
  finale: {
    name: "Prof. Roberto Floris", short: "Prof. Floris", subject: "Robotica", icon: "👨‍🏫",
    task: "Il nucleo di Othy ha quattro slot. Inserisci i chip in ordine alfabetico, da A a D, e riaccendi il robot."
  }
};

// Enigmi usati su questo percorso (gli altri restano in config.js per altre versioni)
for (const id of ["tornio", "chimica", "phchart"]) delete GAME.puzzles[id];

// ---------- Codice Morse: tabella e messaggio della vetrina ----------
const MORSE = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
  I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
  Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--.."
};
const morseTable = Object.entries(MORSE)
  .map(([letter, code]) => `<div><b>${letter}</b><span>${code}</span></div>`)
  .join("");

GAME.puzzles.targa = {
  ...GAME.puzzles.targa,
  body: `<p>Sull'insegna c'è scritto <strong>OTHOCA</strong>, il nome del nostro istituto.</p>
    <blockquote>All'Othoca si studiano informatica, elettronica, elettrotecnica, meccanica e chimica.
    Nei laboratori si costruiscono robot, circuiti e programmi.</blockquote>
    <p class="muted">Oggi è l'Open Day: la scuola apre le porte a tutti. Chissà quanti segreti nasconde…</p>`
};

GAME.puzzles.binario = {
  ...GAME.puzzles.binario,
  reward: {
    ...GAME.puzzles.binario.reward,
    say: "Bravissimo! Hai appena parlato la lingua dei computer. Andiamo nell'atrio!"
  }
};

GAME.puzzles.cesare = {
  ...GAME.puzzles.cesare,
  reward: {
    ...GAME.puzzles.cesare.reward,
    fragment: { ...GAME.puzzles.cesare.reward.fragment, symbol: "A" },
    text: "Dietro la bacheca c'era un chip della memoria! E con la parola segreta si apre il passaggio per l'andito.",
    say: "Il primo chip! Giulio Cesare usava proprio questo trucco per i suoi messaggi segreti."
  }
};

GAME.puzzles.alfabeto = {
  ...GAME.puzzles.alfabeto,
  title: "La bacheca dei codici",
  body: `<p>Sulla bacheca rossa c'è una tabella per decifrare i messaggi in <strong>codice Morse</strong>:</p>
    <div class="morse-table">${morseTable}</div>
    <p class="muted">Ogni lettera è formata da punti e linee. Le lettere sono separate da uno spazio,
    le parole da una barra. Punto = segnale breve, linea = segnale lungo.</p>`
};

GAME.puzzles.pixel = {
  ...GAME.puzzles.pixel,
  title: "Il monitor dell'andito",
  body: `<p>Sulla scrivania dell'andito c'è un vecchio monitor tutto nero. Su un foglietto c'è scritto:
    <em>"Accendi i pixel dove c'è un 1, riga per riga."</em></p>
    <p class="muted">Una volta le immagini sui computer si disegnavano così: ogni pixel acceso è un 1, ogni pixel spento è uno 0.</p>`
};

// Il disegno del monitor cambia a ogni partita: il chip C usa sempre la stessa lettera.
const basePixelRender = GAME.render.pixel;
GAME.render.pixel = (p, v) => {
  const r = basePixelRender(p, v);
  return {
    ...r,
    reward: {
      ...r.reward,
      fragment: { ...r.reward.fragment, symbol: "C" },
      text: `Sullo schermo appare un grande <b>${v.digit}</b>. Il computer fa "bip", un cassetto si apre… dentro c'è un chip della memoria!`,
      say: "Hai disegnato con i pixel, come i primi programmatori! Ogni foto sul tuo telefono è fatta di milioni di pixel."
    }
  };
};

GAME.puzzles.tanit = {
  ...GAME.puzzles.tanit,
  title: "Il messaggio in Morse",
  body: `<p>In una vetrina dell'andito c'è un cartellino con una serie di punti e linee.</p>
    <div class="code-strip">{{MORSE}}</div>
    <p class="muted">Sotto, a penna: <em>"Decifra il messaggio: è il nome di un robot."</em></p>`,
  reward: {
    ...GAME.puzzles.tanit.reward,
    fragment: { ...GAME.puzzles.tanit.reward.fragment, symbol: "D" },
    text: "Dietro il cartellino c'era un chip della memoria! Il corridoio del palazzetto ora è aperto.",
    say: "Messaggio decifrato! Il corridoio del palazzetto è aperto: andiamo!"
  }
};
// Il messaggio cambia a ogni partita, ma resta sempre una parola del mondo Othoca.
GAME.variants.tanit = (r) => {
  const word = r.pick(["OTHY", "ROBOT", "SCUOLA", "MEMORIA", "PIXEL", "CODICE", "MOTORE", "SENSORE"]);
  const code = word.split("").map((c) => MORSE[c]).join("   ");
  return {
    word,
    code,
    answer: [word],
    hints: [
      "Sulla bacheca rossa dell'andito c'è la tabella del codice Morse.",
      "Ogni gruppo di punti e linee è una lettera: separa bene i gruppi.",
      `Il messaggio è: ${word}.`
    ]
  };
};
GAME.render.tanit = (p, v) => ({ body: p.body.replace("{{MORSE}}", v.code) });

GAME.puzzles.circuito = {
  ...GAME.puzzles.circuito,
  title: "Il quadro elettrico del corridoio",
  reward: {
    ...GAME.puzzles.circuito.reward,
    fragment: { ...GAME.puzzles.circuito.reward.fragment, symbol: "B" },
    text: "Clic! Tutte accese. Dal quadro scivola fuori un chip della memoria e la porta verso il palazzetto si sblocca.",
    say: "Hai fatto proprio come un elettrotecnico: logica e circuiti!"
  }
};

GAME.puzzles.simon = {
  ...GAME.puzzles.simon,
  title: "Il pannello delle luci del palazzetto",
  body: `<p>Accanto alla porta del palazzetto c'è il pannello che comanda le luci. Quattro spie lampeggiano
    una dopo l'altra. Un cartello dice: <em>"Ripeti la sequenza e la porta si aprirà."</em></p>
    <p class="muted">Premi "Guarda" e poi ripeti la sequenza. Sono 3 sequenze, ognuna un po' più lunga.</p>`,
  reward: { ...GAME.puzzles.simon.reward, text: "Le luci del palazzetto si accendono tutte insieme e la porta si apre!",
    say: "Bravissimo, che memoria! A teatro le luci si programmano proprio così, una dopo l'altra." }
};

GAME.puzzles.finale = {
  ...GAME.puzzles.finale,
  type: "chest",
  title: "Il nucleo di Othy",
  body: `<p>Sotto il tabellone c'è una console con quattro slot. Sul coperchio è incisa una scritta:
    <em>"In ordine alfabetico, dalla A alla D."</em></p>
    <p class="muted">Clicca i chip che hai raccolto per inserirli negli slot, da sinistra a destra.</p>`,
  hints: [
    "I numeri sono sui chip che hai raccolto (li vedi in alto).",
    "Mettili in ordine alfabetico: prima A, poi B, C e D.",
    "Clicca i chip negli slot da sinistra a destra, seguendo l'ordine A → B → C → D."
  ]
};

GAME.scenes = [
  {
    id: "1-2ingresso-dentro", name: "Cortile d'ingresso", wall: 9, walk: 5,
    say: "Ciao! Io sono Othy. Guarda l'insegna: OTHOCA, come la nostra scuola! Usa W, A, S, D per camminare ed entriamo.",
    links: [{ target: "2-3ingresso-nuovo", yaw: 0.1074, dist: 5.5 }],
    items: [{ yaw: 0.03, pitch: -0.66, icon: "🏫", label: "Insegna", puzzle: "targa" }]
  },
  {
    id: "2-3ingresso-nuovo", name: "Ingresso", wall: 5.5, walk: 3.6,
    say: "Le porte verso l'atrio sono chiuse con un tastierino. Cerchiamo un promemoria qui intorno!",
    links: [
      { target: "1-2ingresso-dentro", yaw: -3.1099 },
      { target: "3-4corridoio-nuovo", yaw: 0.278, dist: 9.4, lock: "binario", lockedSay: "Serve il codice del tastierino. Cerca un foglietto vicino alle porte!" }
    ],
    items: [
      { yaw: 0.78, pitch: -0.04, icon: "🗒️", label: "Post-it", puzzle: "postit" },
      { yaw: 0.58, pitch: -0.02, icon: "🔢", label: "Tastierino", puzzle: "binario" }
    ]
  },
  {
    id: "3-4corridoio-nuovo", name: "Atrio", wall: 6, walk: 4,
    say: "Siamo nell'atrio! Su quella bacheca blu c'è un messaggio strano…",
    links: [
      { target: "2-3ingresso-nuovo", yaw: -2.1257 },
      { target: "4-5andito-nuovo", yaw: 1.3584, dist: 10.8, lock: "cesare", lockedSay: "Il passaggio è chiuso. La parola segreta è nel messaggio sulla bacheca blu." }
    ],
    items: [{ yaw: -2.66, pitch: -0.07, icon: "📌", label: "Bacheca blu", puzzle: "cesare" }]
  },
  {
    id: "4-5andito-nuovo", name: "Andito", wall: 8, walk: 5.8,
    say: "L'andito! Sulla bacheca rossa c'è la tabella dei codici… e la scrivania ha un vecchio monitor.",
    links: [
      { target: "3-4corridoio-nuovo", yaw: 2.9038 },
      { target: "5-6andito-nuovo", yaw: 1.2245, dist: 9.9, lock: "pixel", lockedSay: "Il passaggio è bloccato da un lettore collegato al monitor della scrivania. Facciamolo funzionare!" }
    ],
    items: [
      { yaw: -1.75, pitch: -0.05, icon: "🔣", label: "Bacheca rossa", puzzle: "alfabeto" },
      { yaw: -0.52, pitch: -0.02, icon: "🖥️", label: "Monitor", puzzle: "pixel" }
    ]
  },
  {
    id: "5-6andito-nuovo", name: "Andito delle vetrine", wall: 6, walk: 4.2,
    say: "Che belle queste vetrine! In una c'è un cartellino con un messaggio in Morse…",
    links: [
      { target: "4-5andito-nuovo", yaw: 1.6091 },
      { target: "6-7corridoio-palazzetto", yaw: -0.007, dist: 6.6, lock: "tanit", lockedSay: "Il corridoio del palazzetto è chiuso. Prima decifriamo il messaggio nella vetrina!" }
    ],
    items: [{ yaw: -0.86, pitch: 0.01, icon: "🔬", label: "Vetrina", puzzle: "tanit" }]
  },
  {
    id: "6-7corridoio-palazzetto", name: "Corridoio del palazzetto", box: [1.4, 9], walk: 1.1,
    say: "Un corridoio pieno di quadri elettrici… quello grande a destra ha degli interruttori!",
    links: [
      { target: "5-6andito-nuovo", yaw: -3.0367 },
      { target: "7-8entrata-palazzetto", yaw: 0.0094, dist: 6, lock: "circuito", lockedSay: "La porta in fondo è bloccata da un circuito. Prova col quadro elettrico!" }
    ],
    items: [{ yaw: 2.62, pitch: -0.02, icon: "💡", label: "Quadro elettrico", puzzle: "circuito" }]
  },
  {
    id: "7-8entrata-palazzetto", name: "Entrata del palazzetto", wall: 6, walk: 4,
    say: "Siamo all'entrata del palazzetto! Quel pannello accanto alla porta comanda le luci.",
    links: [
      { target: "6-7corridoio-palazzetto", yaw: 0.6929 },
      { target: "8-9centropalazzetto", yaw: -3.0307, dist: 14.7, lock: "simon", lockedSay: "La porta del palazzetto si apre solo con le luci giuste. Prova col pannello!" }
    ],
    items: [{ yaw: 0.7, pitch: -0.18, icon: "🎛️", label: "Pannello luci", puzzle: "simon" }]
  },
  {
    id: "8-9centropalazzetto", name: "Palazzetto", wall: 16, walk: 11.5,
    say: "Che spazio enorme! Il nucleo di Othy dev'essere qui… guarda sotto il tabellone!",
    links: [{ target: "7-8entrata-palazzetto", yaw: -0.0227 }],
    items: [{ yaw: 1.44, pitch: 0.12, icon: "🤖", label: "Nucleo di Othy", puzzle: "finale" }]
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
Object.assign(GAME.puzzles.finale, { skin: "core" });
