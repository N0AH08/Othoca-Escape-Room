/*
 * MAPPA DELLA SCUOLA RICOSTRUITA IN 3D
 * ------------------------------------
 * Coordinate in metri viste dall'alto (x ≈ est, z ≈ sud), ruotate di 10,6° così che gli edifici siano dritti.
 * CONTORNI DEGLI EDIFICI: progetto Google Earth "OTHOCA" (ala nuova, andito-entrata, palazzetto, corridoio di collegamento,
 * ala vecchia, laboratori) convertiti in metri.
 * INTERNO DELL'ALA NUOVA: piano di evacuazione "Locale A13" (andito largo 6,4 m e lungo 27 m, aule A10–A13 di 7 m,
 * fioriera rotonda di 1,3 m di raggio, scala a semicerchio, atrio con le colonne).
 * ALTRI INTERNI: collegamenti del tour Othoca360 e misure prese sulle foto 360°.
 *
 *   area  = gruppo di foto 360° da mostrare in quella zona (vedi tour/foto.js)
 *   h     = altezza del soffitto, extH = altezza dell'edificio visto da fuori
 *   outdoor = all'aperto; edge = tipo di bordo per i lati liberi (facade/fence/hedge)
 *   glass = lati con vetrata; windows = lati con finestre (foto vera)
 */
window.SCUOLA = {
  rooms: [
    // ---------- Davanti all'ingresso ----------
    { id: "piazzale", name: "Piazzale d'ingresso", area: "Ingresso", rect: [-24, 114.3, -3.4, 123], outdoor: true, floor: "cobble", edge: { n: "none", s: "none", e: "none", w: "none" } },
    { id: "piazzale2", name: "Piazzale d'ingresso", area: "Ingresso", rect: [-3.4, 118.6, 40, 122.5], outdoor: true, floor: "cobble", edge: { n: "none", s: "none", e: "none", w: "none" } },
    // ---------- ALA NUOVA (da sud a nord, come nel tour Othoca360 e nel cartello A13) ----------
    { id: "vestibolo", name: "Ingresso", area: "Atrio", rect: [-17.7, 90, -9.6, 114.3], h: 3.6, extH: 4.4, floor: "tiles", ceil: "panels", wall: "white", windows: ["w"] },
    { id: "atrio", name: "Atrio", area: "Atrio", rect: [-17.7, 76, 5.7, 90], h: 3.6, extH: 11, floor: "tiles", ceil: "panels", wall: "white", windows: ["w"] },
    { id: "salaProf", name: "Sala professori", area: "Atrio", rect: [0.5, 66, 5.7, 76], h: 3.2, extH: 11, floor: "tiles", ceil: "panels", wall: "white" },
    { id: "andito", name: "Andito · scala e distributori", area: "Andito", rect: [-10.7, 70, -4.3, 76], h: 3.2, extH: 11, floor: "tiles", ceil: "stripes", wall: "white" },
    { id: "scale", name: "Scala per il primo piano", area: "Andito", rect: [-4.3, 70.5, 0.5, 75.5], h: 3.2, extH: 11, floor: "tiles", ceil: "panels", wall: "white" },
    { id: "anditoF", name: "Andito · fioriera e murale", area: "Andito", rect: [-10.7, 54, -4.3, 70], h: 3.2, extH: 11, floor: "tiles", ceil: "stripes", wall: "white" },
    { id: "passaggio", name: "Uscita verso il cortile", area: "Andito", rect: [-4.3, 58.5, 5.7, 62.5], h: 3.2, extH: 11, floor: "tiles", ceil: "stripes", wall: "white" },
    { id: "andito2", name: "Andito · palme", area: "Andito", rect: [-12.2, 43, -2.8, 54], h: 3.2, extH: 11, floor: "tiles", ceil: "stripes", wall: "white" },
    { id: "mensa", name: "Mensa", area: "Andito", rect: [-17.7, 10.8, 5.7, 43], h: 3.8, extH: 11, floor: "lighttiles", ceil: "panels", wall: "white", windows: ["w", "n"] },
    { id: "corrPal", name: "Corridoio della palestra", area: "Palestra", rect: [-3, 90, 0, 97], h: 3, extH: 4, floor: "tiles", ceil: "panels", wall: "white" },
    { id: "corrPal2", name: "Ingresso della palestra", area: "Palestra", rect: [-3, 97, 0, 104], h: 3, extH: 4, floor: "tiles", ceil: "panels", wall: "white" },
    { id: "palestra", name: "Palazzetto", area: "Palestra", rect: [0, 90, 30.4, 118.6], h: 9, extH: 10, floor: "court", ceil: "woodceil", wall: "gym" },
    // ---------- Cortile tra le due ali ----------
    { id: "cortile", name: "Cortile e portico di collegamento", area: "Portici", rect: [5.7, 3.7, 34.7, 88.4], outdoor: true, floor: "grass", edge: { n: "none", s: "none", e: "none", w: "none" } },
    // ---------- ALA VECCHIA (tour "vecchio piano terra" e "torneria-zoomate-biblioteca") ----------
    { id: "storico", name: "Corridoio dell'ala vecchia", area: "Edificio storico", rect: [35, 7, 39, 77.5], h: 3.4, extH: 11, floor: "terrazzo", ceil: "panels", wall: "white" },
    { id: "aula", name: "Aula magna", area: "Aula magna", rect: [39, 50, 62, 77.5], h: 6, extH: 7, floor: "rubber", ceil: "acoustic", wall: "white" },
    { id: "portineria", name: "Atrio dell'ala vecchia", area: "Edificio storico", rect: [39, 42, 55, 50], h: 3.4, extH: 11, floor: "wood", ceil: "panels", wall: "white" },
    { id: "atrioSt", name: "Atrio con i ballatoi", area: "Edificio storico", rect: [39, 10, 52, 42], h: 10.5, extH: 11, floor: "terrazzo", ceil: "skylight", wall: "white" },
    { id: "labFisica", name: "Laboratori di chimica e fisica", area: "Edificio storico", rect: [52, 20, 62, 42], h: 3.4, extH: 11, floor: "tiles", ceil: "panels", wall: "white", windows: ["e"] },
    { id: "zoomate", name: "Museo ZooMate", area: "ZooMate", rect: [52, 7, 62, 20], h: 3.8, extH: 11, floor: "beige", ceil: "panels", wall: "white" },
    { id: "storicoN", name: "Corridoio dei laboratori", area: "Laboratori", rect: [35, 3, 62, 7], h: 3.4, extH: 11, floor: "terrazzo", ceil: "panels", wall: "white" },
    { id: "chimica", name: "Laboratorio di chimica", area: "Chimica", rect: [47, -7.5, 62, 3], h: 4.2, extH: 7, floor: "tiles", ceil: "vault", wall: "cream", windows: ["n"] },
    { id: "officina", name: "Officina meccanica", area: "Officina", rect: [62, -7.3, 81.5, 16.7], h: 6, extH: 7, floor: "greytiles", ceil: "vault", wall: "cream", windows: ["n", "e"] },
    { id: "palestraP", name: "Palestra piccola", area: "Edificio storico", rect: [32.3, -22, 45.1, 3], h: 7, extH: 8, floor: "gymgreen", ceil: "woodceil", wall: "gym" },
    { id: "vetrato", name: "Corridoio vetrato", area: "Edificio storico", rect: [45.1, -22.7, 47, 3], h: 3.2, extH: 4, floor: "terrazzo", ceil: "panels", wall: "panelpink", glass: ["e"] },
    // ---------- Portici e laboratori a nord (edifici X e Y) ----------
    { id: "passaggioN", name: "Passaggio verso i laboratori", area: "Portici", rect: [24.8, -22.7, 31.3, 3.7], outdoor: true, floor: "grass", edge: { n: "none", s: "none", e: "none", w: "none" } },
    { id: "porticoN", name: "Portici dei laboratori", area: "Portici", rect: [24.8, -45.2, 81.6, -22.7], outdoor: true, floor: "grass", edge: { n: "none", s: "none", e: "none", w: "none" } },
    { id: "corrX", name: "Corridoio dell'edificio X", area: "Laboratori", rect: [11, -35.2, 14.5, 3.7], h: 3.2, extH: 4.5, floor: "lighttiles", ceil: "panels", wall: "white" },
    { id: "labTel", name: "Laboratorio di telecomunicazioni", area: "Laboratori", rect: [0.8, -32, 11, -8], h: 4.4, extH: 4.5, floor: "lighttiles", ceil: "vault", wall: "white", windows: ["w"] },
    { id: "labElt", name: "Laboratorio di elettrotecnica", area: "Laboratori", rect: [14.5, -34, 24.8, -6], h: 4.4, extH: 4.5, floor: "lighttiles", ceil: "vault", wall: "white", windows: ["e"] },
    { id: "corrY", name: "Corridoio Y", area: "Pneumatica", rect: [-2.4, -51.2, 63.3, -45.2], h: 3, extH: 4.5, floor: "lighttiles", ceil: "panels", wall: "white" },
    { id: "labY", name: "Laboratorio di automazione", area: "Laboratori", rect: [-2, -83.9, 30, -51.2], h: 4.4, extH: 4.5, floor: "lighttiles", ceil: "vault", wall: "white", windows: ["n", "w"] },
    { id: "pneumatica", name: "Laboratorio di pneumatica", area: "Pneumatica", rect: [36, -76, 56, -51.2], h: 3.2, extH: 4.5, floor: "lighttiles", ceil: "panels", wall: "white", windows: ["n"] }
  ],

  doors: [
    { a: [-15.5, 114.3], b: [-11.8, 114.3], kind: "glass" },
    { a: [-16.5, 90], b: [-10.8, 90], kind: "glass", lock: "binario", lockedSay: "Serve il codice del tastierino. Cerca un promemoria qui nell'ingresso!" },
    { a: [-10.55, 76], b: [-4.45, 76], kind: "open", lock: "cesare", lockedSay: "Una barriera blocca l'andito. La parola segreta è nel messaggio sulla bacheca blu dell'atrio." },
    { a: [2, 76], b: [3.6, 76], kind: "wood" },
    { a: [-4.3, 71], b: [-4.3, 75], kind: "open" },
    { a: [-10.3, 70], b: [-4.7, 70], kind: "glassWide", lock: "pixel", lockedSay: "La vetrata è bloccata da un lettore collegato al monitor sulla scrivania. Facciamolo funzionare!" },
    { a: [-4.3, 59], b: [-4.3, 62], kind: "open" },
    { a: [5.7, 59], b: [5.7, 62], kind: "glass", lock: "chiuso", lockedSay: "Oggi il gioco è nell'ala nuova: il cortile e l'ala vecchia li visitiamo nel tour libero!" },
    { a: [-10.3, 54], b: [-4.7, 54], kind: "glassWide" },
    { a: [-10.3, 43], b: [-4.7, 43], kind: "glass" },
    { a: [-8.5, 10.8], b: [-5, 10.8], kind: "glass" },
    { a: [-2.7, 90], b: [-0.3, 90], kind: "wood", lock: "tanit", lockedSay: "Il corridoio della palestra è chiuso. Prima leggiamo il cartellino nella vetrina dei trofei!" },
    { a: [-2.7, 97], b: [-0.3, 97], kind: "glass", lock: "circuito", lockedSay: "La porta è bloccata da un circuito. Prova col quadro elettrico del corridoio!" },
    { a: [0, 99.5], b: [0, 103], kind: "glass", lock: "simon", lockedSay: "La porta della palestra si apre solo con le luci giuste. Prova col pannello!" },
    { a: [35, 59], b: [35, 62], kind: "glass" },
    { a: [39, 55], b: [39, 58.5], kind: "wood" },
    { a: [39, 43], b: [39, 49], kind: "open" },
    { a: [39, 11], b: [39, 41], kind: "open" },
    { a: [42, 42], b: [50, 42], kind: "open" },
    { a: [52, 29], b: [52, 32], kind: "wood" },
    { a: [52, 13], b: [52, 16], kind: "glass" },
    { a: [35.5, 7], b: [38.5, 7], kind: "open" },
    { a: [53, 3], b: [56, 3], kind: "glass" },
    { a: [62, 3.5], b: [62, 6.5], kind: "wood" },
    { a: [37, 3], b: [40, 3], kind: "wood" },
    { a: [45.1, 1], b: [45.1, 2.8], kind: "open" },
    { a: [45.25, 3], b: [46.85, 3], kind: "open" },
    { a: [45.25, -22.7], b: [46.85, -22.7], kind: "glass" },
    { a: [11.3, 3.7], b: [14.2, 3.7], kind: "glass" },
    { a: [11, -22], b: [11, -19], kind: "wood" },
    { a: [14.5, -22], b: [14.5, -18.5], kind: "wood" },
    { a: [40, -45.2], b: [43, -45.2], kind: "glass" },
    { a: [12, -51.2], b: [15.5, -51.2], kind: "wood" },
    { a: [44, -51.2], b: [46.5, -51.2], kind: "wood" }
  ],

  info: [
    { room: "piazzale2", pos: [2, 120.6], title: "L'ingresso dell'Othoca", foto: ["ingresso-01", "ingresso-02", "ingresso-03", "ingresso-04", "ingresso-05"],
      text: "Il piazzale con la pensilina e l'insegna OTHOCA: qui ogni mattina entrano gli studenti dell'istituto tecnico e del liceo scientifico." },
    { room: "vestibolo", pos: [-13.6, 106], title: "L'ingresso", foto: ["atrio-01", "atrio-02", "atrio-03", "atrio-04"],
      text: "Il primo ambiente dopo le porte: panche, bacheche con gli avvisi e i lavori degli studenti, le vetrate che danno sull'atrio." },
    { room: "atrio", pos: [-6, 84], title: "Atrio", foto: ["atrio-05", "atrio-06", "atrio-07", "atrio-08", "atrio-09", "andito-01"],
      text: "Il grande atrio con le colonne: la portineria, le vetrine con gli strumenti storici, il murale del mondo, la sala professori e il corridoio verso il palazzetto." },
    { room: "anditoF", pos: [-7.5, 66], title: "Andito", foto: ["andito-02", "andito-03", "andito-04", "andito-05", "scale-piano2"],
      text: "Il corridoio con il soffitto a strisce verdi: i distributori, la scala rossa per il primo piano, la fioriera rotonda sotto il lucernario e il murale «L'intelligenza è la capacità di adattarsi al cambiamento»." },
    { room: "andito2", pos: [-7.5, 50.5], title: "Andito · palme", foto: ["andito-06", "andito-07", "andito-08", "andito-09"],
      text: "Oltre la seconda vetrata, le fioriere con le palme e le aule A10–A13 fino alla mensa." },
    { room: "mensa", pos: [-6, 30], title: "Mensa", area: "Andito",
      text: "La grande mensa con le file di tavoli e le colonne, in fondo all'ala nuova; accanto c'è la scala semicircolare A14." },
    { room: "palestra", pos: [15, 104], title: "Palazzetto", area: "Palestra",
      text: "Il palazzetto con il campo da basket e pallavolo, la parete d'arrampicata, le spalliere e le tribune." },
    { room: "cortile", pos: [20, 66], title: "Cortile e portico", foto: ["ingresso-andito", "giardino-01", "giardino-02", "giardino-03", "giardino-04", "giardino-05"],
      text: "Il portico coperto che attraversa il cortile e collega l'ala nuova all'ala vecchia." },
    { room: "atrioSt", pos: [45, 26], title: "Atrio con i ballatoi", area: "Edificio storico",
      text: "Il cuore dell'ala vecchia: l'atrio a tutta altezza con i ballatoi, il lucernario e l'ascensore; intorno i laboratori di chimica e fisica." },
    { room: "aula", pos: [44, 53], title: "Aula magna", area: "Aula magna",
      text: "Il teatro della scuola, con palco, sipario e gradinate di poltroncine: assemblee, conferenze e spettacoli." },
    { room: "palestraP", pos: [38.7, -10], title: "Palestra piccola", area: "Edificio storico",
      text: "La palestra dell'ala vecchia, con il pavimento verde, le spalliere e le finestre in alto." },
    { room: "zoomate", pos: [57, 12], title: "Museo ZooMate", area: "ZooMate",
      text: "Uno spazio espositivo sulla natura e gli uccelli delle zone umide dell'Oristanese, con foto, schermi interattivi e postazioni multimediali." },
    { room: "chimica", pos: [54.5, -3], title: "Laboratorio di chimica", area: "Chimica",
      text: "Banconi da laboratorio, cappe aspiranti, armadi con vetreria e reagenti: qui si fanno gli esperimenti." },
    { room: "officina", pos: [71, 4], title: "Officina meccanica", area: "Officina",
      text: "Torni, frese e macchine a controllo numerico (CNC): l'officina dove si impara la meccanica lavorando davvero il metallo." },
    { room: "vetrato", pos: [46, -10], title: "Corridoio vetrato", foto: ["vetrate-01", "vetrate-02", "vetrate-03", "vetrate-04", "vetrate-05"],
      text: "Il corridoio con le vetrate e le colonne nere che porta dai portici dei laboratori all'ala vecchia." },
    { room: "porticoN", pos: [44.5, -34], title: "Portici dei laboratori", foto: ["uscita-portico", "portico-01", "portico-02", "portico-03", "portico-04", "portico-05", "portico-06", "portico-07", "portico-08", "portico-09"],
      text: "I portici coperti tra gli edifici dei laboratori e l'ala vecchia, con il pavimento in porfido a ventaglio." },
    { room: "corrX", pos: [12.7, -12], title: "Edificio X", area: "Laboratori",
      text: "Gli edifici rosa dei laboratori: corridoi con i lucernari rotondi, telecomunicazioni ed elettrotecnica." },
    { room: "pneumatica", pos: [46, -63], title: "Laboratorio di pneumatica", area: "Pneumatica",
      text: "Pannelli con cilindri e valvole ad aria compressa: si impara come funzionano l'automazione e i robot industriali." }
  ],

  items: {
    targa:    { room: "piazzale", p: [-13.75, 4.1, 121.6], stand: [-13.75, 122.8], icon: "🏛️", label: "Insegna" },
    postit:   { room: "vestibolo", p: [-17.55, 1.5, 99], stand: [-15.8, 99], icon: "🗒️", label: "Post-it" },
    binario:  { room: "vestibolo", p: [-10.2, 1.3, 90.15], stand: [-10.4, 91.9], icon: "🔢", label: "Tastierino" },
    cesare:   { room: "atrio", p: [-14, 1.6, 76.15], stand: [-14, 78], icon: "📌", label: "Bacheca blu" },
    pixel:    { room: "andito", p: [-10.5, 1.05, 71.3], stand: [-8.7, 71.3], icon: "🖥️", label: "Monitor" },
    alfabeto: { room: "anditoF", p: [-4.45, 1.6, 66.5], stand: [-6.3, 66.5], icon: "📜", label: "Bacheca rossa" },
    tanit:    { room: "anditoF", p: [-10.55, 1.3, 56], stand: [-8.8, 56], icon: "🏺", label: "Vetrina dei trofei" },
    circuito: { room: "corrPal", p: [-2.85, 1.5, 93.5], stand: [-1.3, 93.5], icon: "💡", label: "Quadro elettrico" },
    simon:    { room: "corrPal2", p: [-0.15, 1.4, 98.3], stand: [-1.6, 98.3], icon: "🎛️", label: "Pannello luci" },
    finale:   { room: "palestra", p: [29.3, 0.4, 104.3], stand: [27.2, 104.3], icon: "🧰", label: "Cassa" }
  },

  start: { pos: [-13.7, 121], heading: Math.PI }
};

// AREA DELLA SCUOLA (progetto Google Earth "OTHOCA"): perimetro recintato, contorni degli edifici, campetto e pista
// (perimetro letto dall'immagine del progetto e allineato ai contorni del KML; coordinate nello stesso sistema delle stanze)
window.SCUOLA.campus = {"perimeter":[[-25.5,-189.6],[89.4,-109.7],[93.6,122.1],[-24.3,124.3]],"gate":[-17,-10],"footprints":[{"name":"Laboratori","h":7,"pts":[[-1.71,-45.24],[63.32,-45.18],[63.13,-83.28],[-2.39,-83.89]]},{"name":"Laboratori 2","h":7,"pts":[[1.55,3.31],[24.33,3.67],[24.81,-34.88],[0.82,-35.22]]},{"name":"Palestra 3 - Piccola","h":8,"pts":[[32.28,2.83],[45.06,2.53],[44.4,-22.1],[32.34,-22.26]]},{"name":"Ala Nuova","h":11,"pts":[[-17.73,89.97],[5.66,89.33],[4.63,12.13],[-17.73,10.83]]},{"name":"Andito - Entrata","h":4.4,"pts":[[-16.95,114.32],[-9.57,114.11],[-9.93,87.93],[-17.66,88.44]]},{"name":"Palazetto Con Spalti","h":10,"pts":[[-3.38,118.6],[30.41,117.72],[29.81,88.37],[-3.16,88.55]]},{"name":"Palestra Con Macchinari","h":7,"pts":[[36.84,105.59],[49.01,105.47],[48.37,76.68],[37.02,76.49]]},{"name":"Ala Vecchia","h":11,"pts":[[30.25,4.34],[26.74,5.45],[28.05,13.85],[34.66,12.42],[34.96,77.69],[68.91,78.12],[68.81,43.23],[61.02,41.27],[62.74,16.47],[81.08,16.66],[81.6,-7.25],[51.79,-7.61],[50.84,-22.67],[31.26,-21.89]]}],"track":[[-24.64,-187.14],[90.21,-96.12],[91.02,-103.94],[-20.17,-192.49]],"field":[[9.04,-141.85],[-13.79,-141.75],[-14.34,-138.37],[-22.07,-135.22],[-22.38,-104.27],[-14.39,-104.36],[-13.95,-97.07],[8.68,-96.93]]};
