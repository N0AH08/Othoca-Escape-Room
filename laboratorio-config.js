/*
 * CONFIGURAZIONE DELLA STANZA SINGOLA "Blackout in laboratorio"
 * --------------------------------------------------------------
 * Pagina: laboratorio.html. Foto: Laboratorio di Elettrotecnica (tiles/16-laboratorio-elettrotecnica).
 * Il robot rosa cammina in tutto il laboratorio (percorso.js, come nel gioco principale): gli oggetti
 * e i loro enigmi compaiono solo quando il robot ci arriva vicino.
 * room = distanze dal punto di scatto alle pareti, walk = rettangoli in cui si cammina,
 * blocks = mobili (il robot non ci passa sopra), stand = [destra, avanti]: dove si ferma il robot.
 *
 * Questo file si carica DOPO config.js: riusa TILE_LEVELS, DIGIT_FONT e le varianti del quadro
 * elettrico, poi sostituisce tutto il contenuto di GAME. Il gioco principale (index.html) non cambia.
 *
 * yaw   = rotazione orizzontale in radianti (0 = verso la porta, positivo = destra, ±3.14 = dietro)
 * pitch = rotazione verticale in radianti (0 = orizzonte, positivo = verso il basso)
 * Comandi di prova nella console: Percorso.pos(), Percorso.vaiAOggetto("Lavagna").
 */
window.PERCORSO_3D = true;
(function () {
  const BASE = { variants: GAME.variants || {} };
  for (const k of Object.keys(GAME)) delete GAME[k];

  // codice dei colori delle resistenze
  const COLORS = [
    ["nero", "#111111"], ["marrone", "#7a4a1e"], ["rosso", "#d62828"], ["arancione", "#f77f00"], ["giallo", "#fcd920"],
    ["verde", "#2a9d3f"], ["blu", "#1f5fd6"], ["viola", "#8e44ad"], ["grigio", "#8d8d8d"], ["bianco", "#f4f4f4"]
  ];
  const colorTable = () => `<div class="rcode">${COLORS.map(([n, c], i) =>
    `<div><i style="background:${c}"></i><b>${i}</b><span>${n}</span></div>`).join("")}</div>`;
  const resistorSvg = (bands) => `<svg class="resistor" viewBox="0 0 360 90" aria-label="Resistenza con fasce ${bands.map((b) => COLORS[b][0]).join(", ")}">
      <line x1="0" y1="45" x2="360" y2="45" stroke="#9aa3ab" stroke-width="5" stroke-linecap="round"/>
      <rect x="80" y="18" width="200" height="54" rx="22" fill="#e6c79a" stroke="#8a6a3f" stroke-width="2"/>
      ${bands.map((b, i) => `<rect x="${108 + i * 34}" y="18" width="16" height="54" fill="${COLORS[b][1]}" stroke="rgba(0,0,0,.25)"/>`).join("")}
      <rect x="236" y="18" width="12" height="54" fill="#c9a227" stroke="rgba(0,0,0,.25)"/>
      <text x="${108 + 8}" y="88" font-size="12" text-anchor="middle" fill="currentColor">1ª</text>
      <text x="${142 + 8}" y="88" font-size="12" text-anchor="middle" fill="currentColor">2ª</text>
      <text x="${176 + 8}" y="88" font-size="12" text-anchor="middle" fill="currentColor">3ª</text>
    </svg>`;

  Object.assign(GAME, {
    title: "Blackout in laboratorio",
    winTitle: "La porta si apre!",
    saveKey: "othoca-laboratorio-v1",          // salvataggio separato dal gioco principale
    leaderboardKey: "othoca-classifica-lab-v1", // classifica separata
    minutes: 15,
    hintPenalty: 30,
    modes: {
      normale: { name: "Normale", minutes: 15, hintPenalty: 30, desc: "15 minuti · indizi −30 s" },
      sfida: { name: "Sfida", minutes: 10, hintPenalty: 45, desc: "10 minuti · indizi −45 s" }
    },
    defaultMode: "normale",
    startScene: "16-laboratorio-elettrotecnica",
    tilesBase: "tiles",
    guideName: "Othy",

    intro: `
      <p>Siete nel <strong>laboratorio di Elettrotecnica</strong> dell'Othoca. Fuori c'è un temporale:
      un fulmine fa saltare la corrente e la <strong>serratura elettronica</strong> della porta si blocca!</p>
      <p>Lo sblocco di emergenza è nella <strong>cassetta dell'armadio grigio</strong> in fondo al laboratorio, chiusa con il
      <strong>sigillo di Othoca</strong> spezzato in <strong>cinque cocci</strong>. Il professore li ha nascosti
      negli esperimenti del laboratorio: risolvete gli enigmi, raccogliete i cocci e uscite prima che finisca il tempo.</p>
      <p class="muted">Siete il <strong>robot rosa dell'Othoca</strong>: muovetelo con <b>WASD</b>, le frecce
      o cliccando sul pavimento. Gli oggetti del laboratorio <b>si vedono solo da vicino</b>: avvicinatevi al computer,
      ai quadri e agli armadi per scoprire gli enigmi. Clicca <b>Othy</b> il fenicottero se ti serve un consiglio.</p>`,

    outro: `
      <p>I cocci combaciano, la cassetta si apre e dentro c'è la <strong>chiave di emergenza</strong>.
      La serratura scatta: siete fuori!</p>
      <p>Avete usato il codice dei colori, la legge di Ohm, la logica dei circuiti, i pixel e la memoria:
      sono le cose che si fanno davvero in questo laboratorio. <strong>Benvenuti all'Othoca!</strong></p>`,

    scenes: [
      {
        id: "16-laboratorio-elettrotecnica",
        tile: "16-laboratorio-elettrotecnica",
        name: "Laboratorio di Elettrotecnica",
        startYaw: 0.02, startPitch: 0.02,
        say: "Accidenti, la corrente è saltata e la porta è bloccata! Avvicinati alla porta per leggere l'avviso, poi esplora il laboratorio.",
        links: [],
        // Misure stimate dalla foto (fotocamera a 1,5 m; piastrelle da 33 cm). Coordinate in metri:
        // x = a destra del punto di scatto, f = in avanti (verso la porta). Negativi = sinistra / dietro.
        room: { left: 2.0, right: 12.5, front: 7.6, back: 14 },
        // dove si cammina: il corridoio lungo la parete sinistra (dalla porta alla porta a vetri in fondo)
        // e la zona centrale. Più in là la foto non vede dietro ai banchi e l'immagine si rovinerebbe.
        walk: [[-1.45, 1.55, -12.4, 6.95]],
        // mobili [x0, x1, f0, f1, altezza, base]: il robot non ci passa e la foto viene proiettata sopra
        blocks: [
          [1.9, 8.0, -2.7, 0.3, 0.76],            // cattedra lunga con i portatili
          [1.6, 2.9, 2.3, 5.3, 0.76, 0.68],       // banchi degli studenti (aperti sotto: solo il piano)
          [4.05, 5.8, 1.8, 4.5, 0.76, 0.68],
          [2.05, 3.95, 4.95, 6.2, 0.76, 0.68],
          [4.5, 6.05, 4.95, 7.2, 0.76, 0.68],
          [7.05, 8.4, 4.4, 7.4, 0.76, 0.68],
          [8.8, 12.4, 1.5, 7.4, 0.76, 0.68],      // altri banchi verso destra (solo da lontano)
          [-2.0, -1.1, -1.9, 0.2, 0.78],          // tavolo verde con la bottiglia
          [-2.0, -1.2, -3.6, -1.9, 0.72],         // banco basso con gli strumenti arancioni
          [-2.0, -1.35, -11.6, -3.6, 0.85],       // banchi di collaudo lungo la parete sinistra
          [0.1, 1.35, -9.6, -2.95, 0.9],          // fila di banchi a destra del corridoio
          [1.6, 12.4, -13.5, -3.2, 0.85]          // banchi in fondo a destra (solo da lontano)
        ],
        // l'ordine degli oggetti è quello che Othy consiglia di seguire
        items: [
          { yaw: 0.2, pitch: -0.08, icon: "🚪", label: "Avviso sulla porta", puzzle: "avviso", stand: [0.7, 6.6] },
          { yaw: -0.45, pitch: -0.17, icon: "📝", label: "Lavagna", puzzle: "resistenza", stand: [-1.0, 4.1],
            tip: "Cammina verso la lavagna bianca, sulla parete di sinistra vicino alla porta." },
          { yaw: -2.513, pitch: 0.286, dist: 2.72, icon: "📟", label: "Strumenti di misura", puzzle: "ohm", stand: [-0.75, -2.8],
            tip: "Girati: dietro di te, contro la parete sinistra, c'è un banco basso con gli strumenti arancioni." },
          { yaw: -2.65, pitch: -0.19, icon: "⚡", label: "Quadro elettrico", puzzle: "quadro", stand: [-0.85, -4.25],
            tip: "Il quadro con gli interruttori è il pannello verde sulla parete sinistra, verso il fondo." },
          { yaw: 2.0, pitch: 0.2, dist: 3.7, icon: "💻", label: "Computer della cattedra", puzzle: "pixel", stand: [1.35, -2.35],
            tip: "Vai alla cattedra lunga, a destra del punto di partenza: sopra ci sono dei portatili." },
          { yaw: -2.899, pitch: 0.075, dist: 6.69, icon: "🚥", label: "Banco di collaudo", puzzle: "spie", stand: [-0.6, -6.7],
            tip: "Prosegui nel corridoio verso il fondo: sul banco di collaudo con le manopole lampeggiano delle spie." },
          { yaw: -2.98, pitch: 0.04, dist: 12.5, icon: "🗄️", label: "Armadio grigio", puzzle: "finale", stand: [-0.6, -11.6],
            tip: "L'armadio grigio di metallo è in fondo al corridoio, accanto alla porta a vetri." }
        ]
      }
    ],

    puzzles: {
      avviso: {
        type: "info",
        skin: "notice",
        title: "Avviso sulla porta",
        body: `<div class="paper">
            <p><strong>⚠️ SERRATURA ELETTRONICA</strong><br>In caso di blackout la porta resta chiusa.
            La chiave di emergenza è nella <strong>cassetta dell'armadio grigio</strong>.</p>
            <p>Per aprire la cassetta mettete i cocci del sigillo <strong>in ordine</strong>,
            come le prime lettere dell'alfabeto fenicio:</p>
            <div class="abc5">${[["𐤀", "aleph", "A"], ["𐤁", "bet", "B"], ["𐤂", "gimel", "G"], ["𐤃", "dalet", "D"], ["𐤄", "he", "E"]]
              .map(([p, n, l], i) => `<div><span class="phn">${p}</span><b>${i + 1}. ${n}</b><i>${l}</i></div>`).join("")}</div>
            <p class="small">— Il prof. di Elettrotecnica</p>
          </div>`
      },

      resistenza: {
        type: "code",
        skin: "whiteboard",
        title: "La resistenza alla lavagna",
        body: "", // generato dalla variante
        placeholder: "Valore in ohm",
        inputmode: "numeric",
        answer: ["470"],
        hints: [],
        reward: {
          fragment: { symbol: "𐤀", digit: 1 },
          text: "Il lucchetto del cassetto sotto la lavagna si apre: dentro c'è un coccio del sigillo!",
          say: "Bravi! Le resistenze sono piccolissime, per questo il valore si scrive con i colori invece che con i numeri."
        }
      },

      ohm: {
        type: "code",
        skin: "instruments",
        title: "Gli strumenti di misura",
        body: "",
        placeholder: "Le tre correnti",
        inputmode: "numeric",
        answer: ["123"],
        hints: [],
        reward: {
          fragment: { symbol: "𐤁", digit: 2 },
          text: "Gli aghi degli strumenti tornano a zero e sotto il banco si apre un cassetto con un coccio.",
          say: "Georg Ohm ha scoperto questa legge quasi 200 anni fa e la usiamo ancora tutti i giorni!"
        }
      },

      quadro: {
        type: "switches",
        skin: "cabinet",
        title: "Il quadro elettrico",
        body: `<p>Sul pannello verde del quadro ci sono 4 interruttori e 3 spie. Sul cartello c'è scritto:
          <em>"Accendile tutte e tre per ridare corrente ai banchi."</em></p>`,
        switches: ["A", "B", "C", "D"],
        leds: [],
        hints: [],
        reward: {
          fragment: { symbol: "𐤂", digit: 3 },
          text: "Clic! Le tre spie si accendono e i banchi tornano alimentati. Dietro lo sportello del quadro c'era un coccio!",
          say: "Avete ragionato come un elettrotecnico: E, O, solo uno… è la logica dei circuiti!"
        }
      },

      pixel: {
        type: "pixels",
        skin: "crt",
        title: "Il computer della cattedra",
        body: `<p>Il portatile è acceso con la batteria, ma lo schermo è nero. Sul post-it attaccato c'è scritto:
          <em>"Accendi i pixel dove c'è un 1, riga per riga."</em></p>
          <p class="muted">Ogni immagine su uno schermo è fatta di pixel: acceso = 1, spento = 0.</p>`,
        rows: DIGIT_FONT[5],
        hints: [],
        reward: { fragment: { symbol: "𐤃", digit: 5 }, text: "", say: "Avete disegnato con i pixel, come i primi programmatori!" }
      },

      spie: {
        type: "simon",
        skin: "console",
        title: "Il banco di collaudo",
        body: `<p>Sul banco di collaudo quattro spie colorate si accendono una alla volta. Un'etichetta dice:
          <em>"Test di memoria del tecnico: ripeti la sequenza."</em></p>
          <p class="muted">Premi "Guarda" e poi ripeti la sequenza cliccando le spie. Sono 3 sequenze, ognuna un po' più lunga.</p>`,
        rounds: [3, 4, 5],
        hints: [
          "Guarda bene l'ordine dei colori: puoi riguardarlo quante volte vuoi.",
          "Ripeti a voce i colori mentre li vedi: \"rosso, blu, giallo…\"",
          "Se sbagli, premi Guarda: la sequenza riparte dallo stesso punto."
        ],
        reward: {
          fragment: { symbol: "𐤄", digit: 4 },
          text: "Test superato! Il banco emette un bip e il cassetto degli attrezzi si apre: dentro c'è un coccio!",
          say: "Che memoria! Quando avrete tutti e cinque i cocci, andate all'armadio grigio."
        }
      },

      finale: {
        type: "chest",
        final: true,
        skin: "chest",
        title: "La cassetta dell'armadio",
        body: `<p>Nell'armadio grigio c'è una vecchia cassetta di legno. Sul coperchio ci sono cinque conche a forma di coccio
          e la scritta: <em>"In fila, come le lettere degli antichi."</em></p>
          <p class="muted">Clicca i cocci che hai raccolto per inserirli nelle conche, da sinistra a destra.</p>`,
        answer: [""],
        hints: [
          "Le lettere dei cocci sono quelle dell'avviso sulla porta.",
          "Mettili nell'ordine dell'alfabeto fenicio scritto sull'avviso: prima 𐤀 aleph, poi 𐤁 bet…",
          ""
        ],
        reward: { text: "" }
      }
    }
  });

  // ---------- Varianti: ogni partita è un po' diversa ----------
  GAME.variants = {
    resistenza(r) {
      const d1 = r.int(1, 9), d2 = r.int(0, 9), z = r.int(1, 2);
      const value = String(d1 * 10 + d2) + "0".repeat(z);
      const names = [d1, d2, z].map((b) => COLORS[b][0]);
      return {
        answer: [value],
        body: `<p>Sulla lavagna il professore ha disegnato una <strong>resistenza</strong> e ha scritto:
            <em>"Il valore in ohm (Ω) apre il cassetto."</em></p>
          ${resistorSvg([d1, d2, z])}
          ${colorTable()}
          <p class="note-board">1ª fascia = prima cifra · 2ª fascia = seconda cifra · 3ª fascia = quanti zeri aggiungere.<br>
          La fascia dorata in fondo non conta.</p>`,
        hints: [
          `Le fasce sono: ${names[0]}, ${names[1]}, ${names[2]}. Cerca ogni colore nella tabella.`,
          `${names[0]} = ${d1} e ${names[1]} = ${d2}: le prime due cifre sono ${d1}${d2}.`,
          `${names[2]} = ${z}, quindi aggiungi ${z === 1 ? "uno zero" : "due zeri"}: ${value} Ω.`
        ]
      };
    },

    ohm(r) {
      const lamps = ["Lampadina 1", "Lampadina 2", "Lampadina 3"].map((name) => {
        const I = r.int(1, 9), R = r.pick([2, 3, 4, 5, 6]);
        return { name, I, R, V: I * R };
      });
      return {
        answer: [lamps.map((l) => l.I).join("")],
        body: `<p>Sul banco basso ci sono tre circuiti di prova collegati agli strumenti arancioni. Per ognuno gli strumenti mostrano la
            <strong>tensione</strong> (volt) e la <strong>resistenza</strong> (ohm). Il lucchetto vuole le tre
            <strong>correnti</strong>, in ordine.</p>
          <div class="ohm-law">I = V : R <small>corrente = tensione diviso resistenza</small></div>
          <div class="meters">${lamps.map((l) => `<div class="meter-card"><p>${l.name}</p>
              <div class="dial"><b>${l.V}</b><span>V</span></div><div class="dial"><b>${l.R}</b><span>Ω</span></div>
              <div class="dial q"><b>?</b><span>A</span></div></div>`).join("")}</div>`,
        hints: [
          "Per ogni circuito dividi i volt per gli ohm: il risultato sono gli ampere (A).",
          `Lampadina 1: ${lamps[0].V} : ${lamps[0].R} = ${lamps[0].I} A.`,
          `Le tre correnti sono ${lamps.map((l) => l.I).join(", ")}: il codice è ${lamps.map((l) => l.I).join("")}.`
        ]
      };
    },

    // stesse tre versioni del quadro elettrico del gioco principale
    quadro: (r, ctx) => (BASE.variants.circuito ? BASE.variants.circuito(r, ctx) : {}),

    pixel(r) {
      const d = r.int(0, 9);
      return {
        rows: DIGIT_FONT[d],
        hints: [
          "Ogni riga del post-it corrisponde a una riga dello schermo.",
          `Prima riga: ${DIGIT_FONT[d][0]}. Accendi i pixel dove c'è un 1.`,
          `Il disegno finale è un numero: il ${d}!`
        ],
        reward: {
          fragment: { symbol: "𐤃", digit: d },
          text: `Sullo schermo appare un grande <b>${d}</b>. Il portatile fa "bip" e il cassetto della cattedra si apre: dentro c'è un coccio!`,
          say: "Avete disegnato con i pixel, come i primi programmatori! Ogni foto sul telefono è fatta di milioni di pixel."
        }
      };
    }
  };
  GAME.render = {};
})();
