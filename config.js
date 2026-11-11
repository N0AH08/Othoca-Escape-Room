/*
 * CONFIGURAZIONE DEL GIOCO "Il sigillo di Othoca"
 * ------------------------------------------------
 * Qui si modificano stanze, porte, oggetti, enigmi e frasi della guida.
 * Non serve toccare game.js.
 *
 * yaw   = rotazione orizzontale in radianti (0 = davanti, positivo = destra, ±3.14 = dietro)
 * pitch = rotazione verticale in radianti (0 = orizzonte, positivo = verso il basso)
 * Per trovare yaw/pitch di un punto: apri index.html?editor e clicca sul punto.
 *
 * Le foto sono quelle del tour Othoca360 (classe 4E Informatica, a.s. 2020-21),
 * copiate nella cartella tiles/ con lo stesso formato Marzipano.
 */

const TILE_LEVELS = [
  { tileSize: 256, size: 256, fallbackOnly: true },
  { tileSize: 512, size: 512 },
  { tileSize: 512, size: 1024 },
  { tileSize: 512, size: 2048 }
];

const GAME = {
  title: "Il sigillo di Othoca",
  minutes: 35,            // tempo a disposizione
  hintPenalty: 60,        // secondi tolti per ogni indizio
  startScene: "ingresso",
  tilesBase: "tiles",
  guideName: "Othy",

  intro: `
    <p>Durante i lavori nel cortile della scuola è riemerso un piccolo
    <strong>sigillo punico in terracotta</strong>: un ricordo di <em>Othoca</em>,
    l'antica città fenicia e punica nata sulle rive dello stagno di Santa Giusta,
    da cui la scuola prende il nome.</p>
    <p>Il professore di storia l'ha spezzato in <strong>sei frammenti</strong> e li ha
    nascosti nella scuola. Ogni frammento porta una lettera fenicia e un numero.</p>
    <p>Trovateli tutti e aprite la cassa del sigillo prima che il custode chiuda:
    avete <strong>35 minuti</strong>. Vi accompagnerà <strong>Othy</strong>, una statuina
    di terracotta molto chiacchierona.</p>
    <p class="muted">Siete il <strong>robot rosa dell'Othoca</strong>: muovetelo con <b>WASD</b>, le frecce
    o cliccando sul pavimento. Gli indizi sono nascosti: <b>brillano solo quando il robot si avvicina</b>.
    Le frecce blu portano nelle altre stanze.</p>`,

  outro: `
    <p>La cassa si apre con uno scatto. Dentro, avvolto in un panno, c'è il
    <strong>sigillo di Othoca</strong>, finalmente ricomposto.</p>
    <p>Avete usato la crittografia, l'informatica, l'elettrotecnica, la chimica, la meccanica e la storia:
    proprio le cose che si imparano qui. <strong>Benvenuti all'Othoca!</strong></p>`,

  /* Frasi della guida quando si entra per la prima volta in una stanza */
  scenes: [
    {
      id: "ingresso",
      tile: "1-2ingresso-dentro",
      name: "Ingresso",
      startYaw: 0, startPitch: -0.15,
      say: "Ciao! Io sono Othy, una statuina di terracotta antichissima. Guarda l'insegna lassù: OTHOCA, come la mia città! Entriamo?",
      links: [{ yaw: 0.107, pitch: -0.005, target: "atrio" }],
      items: [{ yaw: 0.45, pitch: -0.4, icon: "🏛️", label: "Insegna", puzzle: "targa" }]
    },
    {
      id: "atrio",
      tile: "2-3ingresso-nuovo",
      name: "Atrio",
      say: "Le porte di vetro sono chiuse con un tastierino. Qualcuno avrà lasciato un promemoria in giro…",
      links: [
        { yaw: -3.11, pitch: 0.128, target: "ingresso" },
        { yaw: 0.278, pitch: 0.01, target: "corridoio", lock: "binario",
          lockedSay: "Serve un codice di 4 cifre. Cerca un foglietto qui intorno!" }
      ],
      items: [
        { yaw: 1.05, pitch: 0.02, icon: "🗒️", label: "Post-it", puzzle: "postit" },
        { yaw: 0.6, pitch: 0.02, icon: "🔢", label: "Tastierino", puzzle: "binario" }
      ]
    },
    {
      id: "corridoio",
      tile: "3-4corridoio-nuovo",
      name: "Corridoio",
      say: "Che bel corridoio! Quella bacheca blu sulla parete… c'è attaccato un messaggio strano.",
      links: [
        { yaw: -2.126, pitch: -0.015, target: "atrio" },
        { yaw: 1.358, pitch: 0.033, target: "museo", lock: "cesare",
          lockedSay: "Il museo è chiuso a chiave. Il messaggio sulla bacheca blu ci dirà la parola segreta." }
      ],
      items: [{ yaw: -2.6, pitch: -0.12, icon: "📌", label: "Bacheca", puzzle: "cesare" }]
    },
    {
      id: "museo",
      tile: "14-museo-1",
      name: "Museo dell'Informatica",
      say: "Wow, il museo dell'informatica! Questi computer sono vecchi quasi quanto me… beh, non proprio. Quel monitor beige al centro sembra acceso!",
      links: [
        { yaw: 2.416, pitch: 0.014, target: "corridoio" },
        { yaw: -1.323, pitch: 0.067, target: "laboratorio", lock: "pixel",
          lockedSay: "La porta ha un lettore collegato al vecchio computer. Prima facciamolo funzionare!" }
      ],
      items: [{ yaw: -0.45, pitch: 0.02, icon: "🖥️", label: "Vecchio computer", puzzle: "pixel" }]
    },
    {
      id: "laboratorio",
      tile: "16-laboratorio-elettrotecnica",
      name: "Laboratorio di Elettrotecnica",
      say: "Siamo nel laboratorio di elettrotecnica! Qui si studiano i circuiti. Il quadro verde sulla sinistra ha degli interruttori…",
      links: [
        { yaw: 0.032, pitch: 0.021, target: "museo" },
        { yaw: -3.05, pitch: 0.0, target: "chimica", lock: "circuito",
          lockedSay: "La porta per il laboratorio di chimica è bloccata da un circuito. Prova col quadro verde!" }
      ],
      items: [{ yaw: -2.65, pitch: -0.2, icon: "💡", label: "Quadro elettrico", puzzle: "circuito" }]
    },
    {
      id: "chimica",
      tile: "21-22laboratoriochimica",
      name: "Laboratorio di Chimica",
      enterYaw: -0.4,
      say: "Il laboratorio di chimica! Sul bancone ci sono tre provette colorate, e sulla parete un cartellone con dei colori…",
      links: [
        { yaw: -2.185, pitch: 0.25, target: "laboratorio" },
        { yaw: 0.8, pitch: 0.05, target: "torneria", lock: "chimica",
          lockedSay: "Questa porta ha un lucchetto a 4 cifre. La soluzione è nelle provette!" }
      ],
      items: [
        { yaw: -1.47, pitch: -0.1, icon: "🌈", label: "Cartellone dei colori", puzzle: "phchart" },
        { yaw: 0.14, pitch: 0.3, icon: "🧪", label: "Provette", puzzle: "chimica" }
      ]
    },
    {
      id: "torneria",
      tile: "12-torneria",
      name: "Torneria",
      say: "Benvenuti in torneria! Con queste macchine si lavorano i metalli. Vicino alla porta ci sono dei disegni tecnici appesi.",
      links: [
        { yaw: -3.078, pitch: 0.199, target: "chimica" },
        { yaw: 0.078, pitch: 0.074, target: "teatro", lock: "tornio",
          lockedSay: "Il lucchetto chiede una lunghezza in millimetri. Guarda i disegni tecnici!" }
      ],
      items: [{ yaw: -2.67, pitch: -0.16, icon: "📐", label: "Disegno tecnico", puzzle: "tornio" }]
    },
    {
      id: "teatro",
      tile: "3-4palcoteatro",
      name: "Teatro",
      enterYaw: -1.1,
      say: "Siamo sul palco del teatro della scuola! Che emozione… I riflettori lampeggiano da soli: sembra che vogliano dirci qualcosa.",
      links: [
        { yaw: -0.074, pitch: 0.18, target: "torneria" },
        { yaw: -2.234, pitch: 0.244, target: "biblioteca", lock: "simon",
          lockedSay: "La porta dietro le quinte si apre solo se ripetiamo lo spettacolo di luci. Prova coi riflettori!" }
      ],
      items: [{ yaw: -0.35, pitch: -0.2, icon: "🎭", label: "Riflettori", puzzle: "simon" }]
    },
    {
      id: "biblioteca",
      tile: "7-biblioteca",
      name: "Biblioteca",
      enterYaw: 0.75,
      say: "La biblioteca! Sulla parete ci sono dei cartelloni, e sul tavolo grande qualcuno ha dimenticato una scheda…",
      links: [
        { yaw: 3.065, pitch: 0.165, target: "teatro" },
        { yaw: -2.72, pitch: 0.05, target: "campo", lock: "tanit",
          lockedSay: "Chiusa! Prima risolviamo il mistero della scheda sul tavolo." }
      ],
      items: [
        { yaw: -1.5, pitch: -0.32, icon: "📜", label: "Cartellone", puzzle: "alfabeto" },
        { yaw: 1.15, pitch: 0.3, icon: "📚", label: "Scheda di prestito", puzzle: "tanit" }
      ]
    },
    {
      id: "campo",
      tile: "2-spalti",
      name: "Spalti del campo",
      enterYaw: -0.6,
      say: "Siamo arrivati agli spalti! La cassa dev'essere qui… eccola, sui gradoni!",
      links: [{ yaw: -2.989, pitch: 0.367, target: "biblioteca" }],
      items: [{ yaw: -0.9, pitch: 0.27, icon: "🧰", label: "Cassa", puzzle: "finale" }]
    }
  ],

  /*
   * ENIGMI
   * type: "info"     -> solo da leggere
   *       "code"     -> si scrive una risposta (maiuscole, spazi e accenti vengono ignorati)
   *       "switches" -> interruttori e LED
   * caesar: true     -> aggiunge la ruota per decifrare il cifrario di Cesare
   * reward.fragment  -> frammento del sigillo ottenuto
   * reward.say       -> cosa dice la guida dopo la soluzione
   */
  puzzles: {
    targa: {
      type: "info",
      title: "L'insegna della scuola",
      body: `<p>Sull'insegna c'è scritto <strong>OTHOCA</strong>.</p>
        <blockquote><strong>Othoca</strong> era un insediamento fenicio e poi punico, sorto
        vicino all'attuale Santa Giusta, accanto allo stagno. I Fenici erano grandi navigatori
        e hanno inventato uno dei primi alfabeti della storia.</blockquote>
        <p class="muted">Ricordatevelo: il loro alfabeto aveva 22 lettere e si scriveva
        <strong>da destra verso sinistra</strong>.</p>`
    },

    postit: {
      type: "info",
      title: "Un post-it giallo",
      body: `<p>Attaccato vicino alla porta, con la calligrafia di un tecnico informatico:</p>
        <div class="paper">
          <div class="mono big">0111 · 0010 · 0101 · 0001</div>
          <div class="bintable"><span>8</span><span>4</span><span>2</span><span>1</span></div>
          <div class="small">"Codice della porta. L'ho scritto in <b>binario</b>, così nessuno lo capisce!"</div>
        </div>`
    },

    binario: {
      type: "code",
      title: "Il tastierino della porta",
      body: `<p>Le porte di vetro hanno un tastierino: <em>"Inserire codice a 4 cifre"</em>.</p>
        <p class="muted">In binario ogni posizione vale 8, 4, 2, 1. Somma i valori dove c'è un <b>1</b>.<br>
        Esempio: <span class="mono">0110</span> = 4 + 2 = <b>6</b></p>`,
      placeholder: "Codice a 4 cifre",
      inputmode: "numeric",
      answer: ["7251"],
      hints: [
        "Il codice è scritto sul post-it giallo, vicino alla porta.",
        "Il primo gruppo è 0111: 4 + 2 + 1 = 7.",
        "0010 = 2, 0101 = 4 + 1 = 5, 0001 = 1."
      ],
      reward: {
        text: "Bip! La luce diventa verde e le porte di vetro si aprono.",
        say: "Bravissimi! Avete appena parlato la lingua dei computer. Andiamo nel corridoio!"
      }
    },

    cesare: {
      type: "code",
      caesar: "OD SDUROD H' WRUQLR",
      title: "La bacheca blu",
      body: `<p>Tra gli avvisi c'è un foglio scritto a mano, firmato <em>"G. C."</em>,
        con una strana ruota di cartone attaccata:</p>`,
      placeholder: "Parola segreta",
      answer: ["TORNIO"],
      hints: [
        "G. C. … Gaio Giulio Cesare! Spostava ogni lettera nell'alfabeto.",
        "Usa le frecce della ruota: prova a spostare di 3 lettere.",
        "Il messaggio è: LA PAROLA È …"
      ],
      reward: {
        fragment: { symbol: "𐤂", digit: 4 },
        text: "Dietro la bacheca era nascosto un frammento di terracotta! E con la parola segreta la porta del museo si apre.",
        say: "Il primo frammento! Giulio Cesare usava proprio questo trucco per i messaggi segreti ai suoi generali."
      }
    },

    circuito: {
      type: "switches",
      title: "Il quadro elettrico",
      body: `<p>Sul quadro ci sono 4 interruttori e 3 lampadine. Un cartello dice:
        <em>"Accendile tutte e tre e la porta si sblocca."</em></p>`,
      switches: ["A", "B", "C", "D"],
      leds: [
        { label: "🔴 Rossa: A acceso <b>e</b> B spento", fn: (s) => s.A && !s.B },
        { label: "🟡 Gialla: almeno uno tra B e C acceso, <b>e</b> D spento", fn: (s) => (s.B || s.C) && !s.D },
        { label: "🟢 Verde: <b>solo uno</b> tra A e D acceso", fn: (s) => s.A !== s.D }
      ],
      hints: [
        "Comincia dalla lampadina rossa: come devono stare A e B?",
        "A è acceso. Per la verde, allora D deve essere spento.",
        "Soluzione: A acceso, B spento, C acceso, D spento."
      ],
      reward: {
        fragment: { symbol: "𐤀", digit: 8 },
        text: "Clic! Tutte accese. Dal quadro scivola fuori un frammento del sigillo, e la porta del laboratorio di chimica si sblocca.",
        say: "Avete fatto proprio come un elettrotecnico: logica e circuiti!"
      }
    },

    tornio: {
      type: "code",
      title: "Disegno tecnico",
      body: `<p>Tra i fogli appesi c'è il disegno di un pezzo da fare al tornio.
        La porta ha un lucchetto con scritto <em>"lunghezza totale in mm"</em>.</p>
        <svg class="drawing" viewBox="0 0 420 170" aria-label="Disegno di un albero a gradini">
          <g fill="none" stroke="currentColor" stroke-width="2">
            <rect pathLength="1" x="20"  y="60" width="75"  height="50"/>
            <rect pathLength="1" x="95"  y="35" width="120" height="100"/>
            <rect pathLength="1" x="215" y="55" width="54"  height="60"/>
            <rect pathLength="1" x="269" y="65" width="111" height="40"/>
          </g>
          <g stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" opacity=".5">
            <line pathLength="1" x1="10" y1="85" x2="390" y2="85"/>
          </g>
          <g font-family="ui-monospace,monospace" font-size="14" fill="currentColor" text-anchor="middle">
            <text x="57"  y="158">25</text>
            <text x="155" y="158">40</text>
            <text x="242" y="158" fill="#ffd27a">?</text>
            <text x="324" y="158">37</text>
          </g>
          <g stroke="currentColor" stroke-width="1">
            <line pathLength="1" x1="20" y1="142" x2="380" y2="142"/>
            <line pathLength="1" x1="20" y1="136" x2="20" y2="148"/><line pathLength="1" x1="95" y1="136" x2="95" y2="148"/>
            <line pathLength="1" x1="215" y1="136" x2="215" y2="148"/><line pathLength="1" x1="269" y1="136" x2="269" y2="148"/>
            <line pathLength="1" x1="380" y1="136" x2="380" y2="148"/>
          </g>
        </svg>
        <p class="muted">Nota a matita: "Il pezzo con il ? è lungo 18 mm"</p>`,
      placeholder: "Lunghezza in mm",
      inputmode: "numeric",
      answer: ["120"],
      hints: [
        "Devi sommare le lunghezze di tutti i pezzi.",
        "Il pezzo con il ? è lungo 18 mm (lo dice la nota).",
        "25 + 40 + 18 + 37 = ?"
      ],
      reward: {
        fragment: { symbol: "𐤃", digit: 2 },
        text: "Il lucchetto si apre. Arrotolato dietro il disegno c'era un altro frammento!",
        say: "Tre frammenti! In torneria le misure devono essere precisissime, al decimo di millimetro."
      }
    },

    pixel: {
      type: "pixels",
      title: "Il vecchio computer",
      body: `<p>Il monitor è acceso, ma lo schermo è tutto nero. Su un foglietto attaccato al
        computer c'è scritto: <em>"Accendi i pixel dove c'è un 1, riga per riga."</em></p>
        <p class="muted">Una volta le immagini sui computer si disegnavano proprio così: ogni pixel acceso è un 1, ogni pixel spento è uno 0.</p>`,
      rows: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
      hints: [
        "Ogni riga del foglietto corrisponde a una riga dello schermo.",
        "Prima riga: 11111, cioè accendi tutti e cinque i pixel.",
        "Il disegno finale è un numero: il 5!"
      ],
      reward: {
        fragment: { symbol: "𐤄", digit: 5 },
        text: "Sullo schermo appare un grande <b>5</b>. Il computer fa \"bip\", un cassetto si apre… dentro c'è un frammento del sigillo!",
        say: "Avete disegnato con i pixel, come i primi programmatori! Ogni foto sul vostro telefono è fatta di milioni di pixel."
      }
    },

    phchart: {
      type: "info",
      title: "Cartellone: i colori del pH",
      body: `<p>Un cartellone spiega l'<b>indicatore al cavolo rosso</b>: un succo che cambia colore
        a seconda di quanto è acida una sostanza. Il numero si chiama <b>pH</b>.</p>
        <div class="phscale">
          <div style="--c:#e8344e;--i:0"><b>2</b><span>molto acido</span></div>
          <div style="--c:#f27aa0;--i:1"><b>4</b><span>acido</span></div>
          <div style="--c:#8e4fc4;--i:2"><b>7</b><span>neutro</span></div>
          <div style="--c:#3f7fd6;--i:3"><b>8</b><span>poco basico</span></div>
          <div style="--c:#36b37e;--i:4"><b>10</b><span>basico</span></div>
          <div style="--c:#e3d23a;--i:5"><b>13</b><span>molto basico</span></div>
        </div>
        <p class="muted">Il limone è acido, l'acqua è neutra, il sapone è basico.</p>`
    },

    chimica: {
      type: "code",
      title: "Le provette",
      body: `<p>Sul bancone ci sono tre provette con l'indicatore al cavolo rosso. Un biglietto dice:
        <em>"Il codice è il pH delle provette, da sinistra a destra, tutto attaccato."</em></p>
        <svg class="tubes" viewBox="0 0 300 170" aria-label="Tre provette colorate">
          ${[["#e8344e", "Limone"], ["#8e4fc4", "Acqua"], ["#36b37e", "Sapone"]].map(([c, l], i) => `
            <g transform="translate(${40 + i * 95},10)">
              <rect x="0" y="0" width="34" height="120" rx="17" fill="rgba(255,255,255,.08)" stroke="#cfd8dc" stroke-width="2"/>
              <rect x="3" y="45" width="28" height="72" rx="14" fill="${c}"/>
              <rect x="-6" y="-4" width="46" height="8" rx="3" fill="#cfd8dc"/>
              <text x="17" y="150" text-anchor="middle" fill="currentColor" font-size="15" font-family="Inter,sans-serif">${l}</text>
            </g>`).join("")}
        </svg>`,
      placeholder: "Codice",
      inputmode: "numeric",
      answer: ["2710"],
      hints: [
        "Sulla parete c'è un cartellone che collega ogni colore a un numero (il pH).",
        "Rosso = 2, viola = 7. E il verde?",
        "Limone 2, acqua 7, sapone 10: tutto attaccato!"
      ],
      reward: {
        fragment: { symbol: "𐤅", digit: 7 },
        text: "Il lucchetto si apre. In fondo al portaprovette c'era un frammento del sigillo!",
        say: "Siete dei veri chimici! Ora sapete perché il limone è aspro: è acido."
      }
    },

    simon: {
      type: "simon",
      title: "Lo spettacolo di luci",
      body: `<p>I quattro riflettori del palco si accendono uno alla volta. Un cartello dice:
        <em>"Ripeti lo spettacolo e le quinte si apriranno."</em></p>
        <p class="muted">Premi "Guarda" e poi ripeti la sequenza cliccando i riflettori. Sono 3 spettacoli, ognuno un po' più lungo.</p>`,
      rounds: [3, 4, 5],
      hints: [
        "Guarda bene l'ordine dei colori, puoi riguardarlo quante volte vuoi.",
        "Ripeti a voce i colori mentre li vedi: \"rosso, blu, giallo…\"",
        "Non c'è fretta: se sbagli, lo spettacolo riparte dallo stesso punto."
      ],
      reward: {
        text: "Applausi! Le quinte si aprono e appare una porta nascosta dietro il palco.",
        say: "Bravissimi, che memoria! A teatro le luci si programmano proprio così, una dopo l'altra."
      }
    },

    alfabeto: {
      type: "info",
      title: "Cartellone: l'alfabeto fenicio",
      body: `<p>Un cartellone fatto dagli studenti, con le lettere <strong>in ordine</strong>:</p>
        <div class="alphabet">
          ${[
            ["𐤀", "A"], ["𐤁", "B"], ["𐤂", "G"], ["𐤃", "D"], ["𐤄", "E"], ["𐤅", "U/V"],
            ["𐤆", "Z"], ["𐤇", "H"], ["𐤈", "Ṭ"], ["𐤉", "I"], ["𐤊", "K"], ["𐤋", "L"],
            ["𐤌", "M"], ["𐤍", "N"], ["𐤎", "S"], ["𐤏", "O"], ["𐤐", "P"], ["𐤑", "Ṣ"],
            ["𐤒", "Q"], ["𐤓", "R"], ["𐤔", "Š"], ["𐤕", "T"]
          ].map(([p, l], i) => `<div style="--i:${i}"><span class="phn">${p}</span><b>${l}</b><i>${i + 1}</i></div>`).join("")}
        </div>
        <p class="muted">Le prime lettere, 𐤀 aleph e 𐤁 bet, hanno dato il nome alla parola "alfabeto"!</p>`
    },

    tanit: {
      type: "code",
      title: "La scheda di prestito",
      body: `<p>Sul tavolo c'è un libro sulla Sardegna antica. Dentro, una scheda: al posto del
        nome di chi l'ha preso in prestito ci sono strani segni.</p>
        <div class="paper big phn rtl">𐤕𐤀𐤍𐤉𐤕</div>
        <p class="muted">Sotto, a penna: "È il nome della dea più importante di Cartagine."</p>`,
      placeholder: "Il nome della dea",
      answer: ["TANIT", "TINNIT"],
      hints: [
        "Sul cartellone della biblioteca c'è l'alfabeto fenicio.",
        "Attenzione: il fenicio si legge da DESTRA verso SINISTRA!",
        "Da destra: 𐤕 T, 𐤀 A, 𐤍 N, 𐤉 I, 𐤕 T."
      ],
      reward: {
        fragment: { symbol: "𐤁", digit: 6 },
        text: `Dentro la scheda c'è l'ultimo frammento e un biglietto: <em>"La cassa è sugli spalti.
          Mettete i frammenti in fila come gli antichi mettevano in fila le loro lettere."</em>`,
        say: "Tanit! La dea protettrice dei Punici. Ora abbiamo tutti e sei i frammenti: corriamo al campo!"
      }
    },

    finale: {
      type: "code",
      final: true,
      title: "La cassa",
      body: `<p>Sui gradoni c'è una vecchia cassa di legno con un lucchetto a <strong>6 cifre</strong>.</p>
        <p>Sul coperchio sono incise sei piccole conche, una per frammento, e la scritta:
        <em>"In fila, come le lettere degli antichi."</em></p>`,
      placeholder: "Codice a 6 cifre",
      inputmode: "numeric",
      answer: ["864257"],
      hints: [
        "I numeri sono sui frammenti che hai raccolto (li vedi in alto).",
        "Mettili nell'ordine dell'alfabeto fenicio, come sul cartellone in biblioteca: prima 𐤀, poi 𐤁…",
        "𐤀 = 8, 𐤁 = 6, 𐤂 = 4, 𐤃 = 2, 𐤄 = 5, 𐤅 = 7."
      ],
      reward: { text: "" }
    }
  }
};


/*
 * VARIANTI: a ogni nuova partita gli enigmi cambiano un po'.
 * Ogni funzione riceve "r" (numeri casuali: r.int(a, b), r.pick(lista), r.shuffle(lista))
 * e "ctx" (valori condivisi tra enigmi) e restituisce i campi dell'enigma da sostituire.
 * Le cifre dei frammenti sono scelte a caso dal motore, quindi anche il codice finale cambia.
 */
const PHOENICIAN = { A: "𐤀", B: "𐤁", G: "𐤂", D: "𐤃", E: "𐤄", U: "𐤅", V: "𐤅", Z: "𐤆", H: "𐤇", I: "𐤉", K: "𐤊", L: "𐤋", M: "𐤌", N: "𐤍", S: "𐤎", O: "𐤏", P: "𐤐", Q: "𐤒", R: "𐤓", T: "𐤕" };
const DIGIT_FONT = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"]
};
const binTerms = (b) => b.split("").map((c, i) => (c === "1" ? [8, 4, 2, 1][i] : 0)).filter(Boolean);

GAME.variants = {
  binario(r, ctx) {
    const digits = [r.int(1, 9), r.int(1, 9), r.int(0, 9), r.int(1, 9)];
    const bins = digits.map((d) => d.toString(2).padStart(4, "0"));
    ctx.bins = bins;
    const ex = (b, d) => `${b} = ${binTerms(b).join(" + ") || "0"} = ${d}`;
    return {
      answer: [digits.join("")],
      hints: [
        "Il codice è scritto sul post-it giallo, vicino alla porta.",
        `Il primo gruppo è ${ex(bins[0], digits[0])}.`,
        bins.slice(1).map((b, i) => ex(b, digits[i + 1])).join(", ") + "."
      ]
    };
  },

  cesare(r) {
    const word = r.pick(["TORNIO", "ROBOT", "LASER", "CODICE", "PIXEL", "FRESA", "MOTORE", "CIRCUITO", "SENSORE"]);
    const k = r.int(2, 6);
    const enc = ("LA PAROLA E' " + word).replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + k) % 26) + 65));
    return {
      caesar: enc,
      answer: [word],
      hints: [
        "G. C. … Gaio Giulio Cesare! Spostava ogni lettera nell'alfabeto di qualche posto.",
        "Usa le frecce della ruota finché il messaggio non diventa leggibile.",
        `Lo spostamento giusto è ${k}: il messaggio dice LA PAROLA È …`
      ]
    };
  },

  pixel(r) {
    const d = r.int(0, 9);
    return {
      rows: DIGIT_FONT[d],
      digit: d,
      hints: [
        "Ogni riga del foglietto corrisponde a una riga dello schermo.",
        `Prima riga: ${DIGIT_FONT[d][0]}. Accendi i pixel dove c'è un 1.`,
        `Il disegno finale è un numero: il ${d}!`
      ],
      rewardText: `Sullo schermo appare un grande <b>${d}</b>. Il computer fa "bip", un cassetto si apre… dentro c'è un frammento del sigillo!`
    };
  },

  circuito(r) {
    return r.pick([
      {
        leds: [
          { label: "🔴 Rossa: A acceso <b>e</b> B spento", fn: (s) => s.A && !s.B },
          { label: "🟡 Gialla: almeno uno tra B e C acceso, <b>e</b> D spento", fn: (s) => (s.B || s.C) && !s.D },
          { label: "🟢 Verde: <b>solo uno</b> tra A e D acceso", fn: (s) => s.A !== s.D }
        ],
        hints: ["Comincia dalla lampadina rossa: come devono stare A e B?", "A è acceso. Per la verde, allora D deve essere spento.", "Soluzione: A acceso, B spento, C acceso, D spento."]
      },
      {
        leds: [
          { label: "🔴 Rossa: B acceso <b>e</b> C spento", fn: (s) => s.B && !s.C },
          { label: "🟡 Gialla: almeno uno tra A e D acceso, <b>e</b> B acceso", fn: (s) => (s.A || s.D) && s.B },
          { label: "🟢 Verde: <b>solo uno</b> tra A e D acceso", fn: (s) => s.A !== s.D }
        ],
        hints: ["Comincia dalla rossa: B e C come devono stare?", "Per la verde, A e D devono essere diversi: uno acceso e uno spento.", "Una soluzione: A acceso, B acceso, C spento, D spento."]
      },
      {
        leds: [
          { label: "🔴 Rossa: C acceso <b>e</b> D acceso", fn: (s) => s.C && s.D },
          { label: "🟡 Gialla: A spento", fn: (s) => !s.A },
          { label: "🟢 Verde: <b>solo uno</b> tra B e C acceso", fn: (s) => s.B !== s.C }
        ],
        hints: ["La rossa vuole due interruttori accesi: quali?", "C è acceso, quindi per la verde B deve essere spento.", "Soluzione: A spento, B spento, C acceso, D acceso."]
      }
    ]);
  },

  chimica(r) {
    const all = [["Limone", "#e8344e", 2], ["Aceto", "#f27aa0", 4], ["Acqua", "#8e4fc4", 7], ["Bicarbonato", "#3f7fd6", 8], ["Sapone", "#36b37e", 10], ["Candeggina", "#e3d23a", 13]];
    const pick = r.shuffle(all).slice(0, 3);
    const code = pick.map((x) => x[2]).join("");
    return {
      tubes: pick,
      answer: [code],
      hints: [
        "Sulla parete c'è un cartellone che collega ogni colore a un numero (il pH).",
        `${pick[0][0]}: il suo colore vale ${pick[0][2]}. E le altre?`,
        `${pick.map((x) => `${x[0]} ${x[2]}`).join(", ")}: tutto attaccato fa ${code}.`
      ]
    };
  },

  tornio(r) {
    const a = r.int(15, 35), b = r.int(30, 50), c = r.int(10, 25), d = r.int(25, 45);
    return {
      seg: [a, b, c, d],
      answer: [String(a + b + c + d)],
      hints: [
        "Devi sommare le lunghezze di tutti i pezzi.",
        `Il pezzo con il ? è lungo ${c} mm (lo dice la nota).`,
        `${a} + ${b} + ${c} + ${d} = ?`
      ]
    };
  },

  tanit(r) {
    const [word, question, extra] = r.pick([
      ["TANIT", "È il nome della dea più importante di Cartagine.", ["TINNIT"]],
      ["THARROS", "È l'antica città fenicia sulla penisola del Sinis, vicino a Oristano.", []],
      ["NORA", "È l'antica città fenicia vicino a Pula, sulla costa sud della Sardegna.", []],
      ["SULKI", "È l'antica città fenicia sull'isola di Sant'Antioco.", ["SULCIS"]],
      ["ELISSA", "È il nome della regina fenicia che, secondo la leggenda, fondò Cartagine.", ["DIDONE"]]
    ]);
    const signs = word.split("").map((c) => PHOENICIAN[c]).join("");
    return {
      word, question, signs,
      answer: [word, ...extra],
      hints: [
        "Sul cartellone della biblioteca c'è l'alfabeto fenicio.",
        "Attenzione: il fenicio si legge da DESTRA verso SINISTRA!",
        "Da destra: " + word.split("").map((c) => `${PHOENICIAN[c]} ${c}`).join(", ") + "."
      ]
    };
  }
};

/* Le varianti modificano i testi degli enigmi */
GAME.render = {
  postit: (p, ctx) => ({ body: p.body.replace("0111 · 0010 · 0101 · 0001", ctx.bins.join(" · ")) }),
  pixel: (p, v) => ({ rows: v.rows, hints: v.hints, reward: { ...p.reward, fragment: { ...p.reward.fragment, digit: v.digit }, text: v.rewardText } }),
  chimica: (p, v) => ({
    body: p.body.replace(/<svg class="tubes"[\s\S]*<\/svg>/, `<svg class="tubes" viewBox="0 0 300 175" aria-label="Tre provette colorate">
      ${v.tubes.map(([l, c], i) => `
        <g transform="translate(${40 + i * 95},10)">
          <rect x="0" y="0" width="34" height="120" rx="17" fill="rgba(255,255,255,.08)" stroke="#cfd8dc" stroke-width="2"/>
          <rect class="liquid" x="3" y="45" width="28" height="72" rx="14" fill="${c}"/>
          <circle class="bubble" cx="12" cy="110" r="3" fill="rgba(255,255,255,.7)" style="--d:${i * 0.4}s"/>
          <circle class="bubble" cx="22" cy="112" r="2" fill="rgba(255,255,255,.6)" style="--d:${0.9 + i * 0.3}s"/>
          <rect x="-6" y="-4" width="46" height="8" rx="3" fill="#cfd8dc"/>
          <text x="17" y="152" text-anchor="middle" fill="currentColor" font-size="14" font-family="Inter,sans-serif">${l}</text>
        </g>`).join("")}
    </svg>`)
  }),
  tornio: (p, v) => {
    let b = p.body;
    const [a, bb, c, d] = v.seg;
    b = b.replace('<text x="57"  y="158">25</text>', `<text x="57"  y="158">${a}</text>`)
         .replace('<text x="155" y="158">40</text>', `<text x="155" y="158">${bb}</text>`)
         .replace('<text x="324" y="158">37</text>', `<text x="324" y="158">${d}</text>`)
         .replace('Il pezzo con il ? è lungo 18 mm', `Il pezzo con il ? è lungo ${c} mm`);
    return { body: b };
  },
  tanit: (p, v) => ({
    body: p.body.replace("𐤕𐤀𐤍𐤉𐤕", v.signs).replace("È il nome della dea più importante di Cartagine.", v.question)
  })
};
