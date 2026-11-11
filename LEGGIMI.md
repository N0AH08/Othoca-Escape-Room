# Il sigillo di Othoca: escape room a camminata continua

**Versione attuale:** `index.html`. Il robot rosa cammina in modo continuo nelle foto 360° vere dell'ala nuova
(ingresso → atrio → corridoio → andito → corridoio del palazzetto → palazzetto). La telecamera lo segue
da dietro e le foto si fondono mentre cammina, senza stacchi.

## Percorso ed enigmi (in ordine; ogni enigma apre il passaggio successivo)
| Dove | Oggetto | Enigma | Ricompensa |
|---|---|---|---|
| Ingresso | Insegna | Storia di Othoca (da leggere) | |
| Atrio | Post-it + tastierino | Codice binario | apre il corridoio |
| Corridoio | Bacheca blu | Cifrario di Cesare | frammento 𐤂, apre l'andito |
| Andito | Bacheca rossa + monitor | Alfabeto fenicio (da leggere) + pixel | frammento 𐤄 |
| Andito delle vetrine | Vetrina | Parola fenicia da destra a sinistra | frammento 𐤁 |
| Corridoio del palazzetto | Quadro elettrico | Interruttori e lampadine | frammento 𐤀 |
| Entrata del palazzetto | Pannello luci | Sequenze di luci a memoria | apre il palazzetto |
| Palazzetto | Cassa sotto il tabellone | Frammenti in ordine alfabetico fenicio | fine |

Codici, parole e cifre cambiano a ogni partita. Comandi: **W/S** cammina, **A/D** gira, **Shift** corri,
Gli oggetti (bacheche, quadro elettrico, monitor…) si vedono **solo da vicino** (entro circa 3 m) e l'enigma si apre da solo la prima volta che il robot ci arriva davanti; per riaprirlo **E** o il pulsante ESAMINA, che compare solo vicino a un oggetto. Clic sul pavimento per camminare. Il riquadro **Obiettivo**
con la freccia indica dove andare.

File: `index.html` (pagina), `percorso.js` (camminata 3D), `percorso-config.js` (stanze, oggetti, porte),
`game.js` + `config.js` (enigmi, timer, frammenti, Othy). Le versioni precedenti (gioco a foto fisse,
Sabotatore, demo a stanza singola) sono in `archivio/` e non si avviano da lì senza rimetterle nella cartella principale.

## Modalità open day
- **All'inizio:** ogni squadra scrive il suo nome e sceglie la durata: **Breve** (15 minuti, indizi −30 s) o
  **Lunga** (25 minuti, indizi −1 min). Le durate si cambiano in `percorso-config.js` (`GAME.modes`).
- **Punteggio** = secondi rimasti. Chi finisce fuori tempo salva il sigillo ma non prende punti.
- **Classifica:** salvata su questo computer (nel browser), separata per partita breve e lunga. Si vede
  nell'introduzione e alla fine, con la posizione della squadra.
- **Prossima squadra:** a fine partita si ricomincia con un clic. Se nessuno tocca niente, dopo 2 minuti
  il gioco torna da solo all'introduzione.
- **Pannello del gestore:** premere **Ctrl+Shift+G** oppure toccare **5 volte il logo** in alto a sinistra.
  Mostra le soluzioni della partita in corso e permette di: risolvere l'enigma attuale (se una squadra è
  bloccata), iniziare una nuova partita, esportare la classifica in CSV (si apre con Excel), azzerare la
  classifica (va confermato) e mostrare un QR code per giocare dal telefono.
- **QR code e telefoni:** l'indirizzo `localhost` funziona solo sul computer che fa da server. Per i telefoni
  serve l'indirizzo IP del computer nella rete della scuola (es. `http://192.168.1.20:8000`) oppure il gioco
  caricato sul sito della scuola. Il QR code ha bisogno di internet per essere generato.
- La classifica resta anche chiudendo il browser; si cancella solo dal pannello del gestore (o cancellando
  i dati del sito nel browser).

## Grafica e mascotte
- **Othy il fenicottero** è la mascotte e la guida: rosa come il fenicottero del logo e come quelli dello stagno
  di Santa Giusta, con la fascia dorata a greca e la collana con il **segno di Tanit**. È disegnato in SVG
  dentro `index.html` (cerca `class="mascot"`): parla, sbatte le palpebre, saluta con l'ala e salta quando si vince.
- Il robot rosa porta il **logo Othoca** sulla nuca e il **segno di Tanit** dorato sul petto.
- Colori del logo (rosa/magenta) con richiami in terracotta; bande con la **greca punica**, segni di Tanit e
  **lettere fenicie** in filigrana nelle finestre; frammenti a forma di coccio di terracotta.
- Schermata di caricamento con il logo e introduzione/vittoria con logo e mascotte.
- I colori si cambiano in fondo al blocco `<style>` di `index.html` (sezione "TEMA OTHOCA").
- **Percorso 3D:** telecamera "sopra la spalla" (il robot sta un po' a sinistra), scia di frecce rosa sul pavimento
  verso l'obiettivo, barriere luminose con il segno di Tanit sui passaggi chiusi (si dissolvono quando risolvi
  l'enigma), anello e colonna di luce davanti agli indizi trovati, pulviscolo nella luce, colori più caldi con
  vignettatura, luce del robot adattata alla luminosità di ogni foto.
- **Aspetto degli enigmi:** ogni finestra imita l'oggetto vero (bacheca di sughero, post-it, pannello del tastierino,
  monitor "OTHOCA PC 86", bacheca di feltro rosso, vetrina con coccio, quadro elettrico, console delle luci, targa di
  pietra). Si sceglie con `skin` in fondo a `percorso-config.js`.
- **Cassa finale:** si inseriscono i cocci raccolti nelle conche nell'ordine dell'alfabeto fenicio; se è giusto
  il coperchio si apre con un bagliore dorato.

Per provarlo: `python3 -m http.server 8000` in questa cartella, poi http://localhost:8000

---

## Note sulla versione precedente (in archivio)

# Il sigillo di Othoca: escape room virtuale per l'Open Day

Escape room che si gioca nel browser, dentro le **foto 360° vere della scuola**, quelle del tour
*Othoca360* fatto dalla classe 4E Informatica nel 2020-21.
È pensata per i ragazzi delle medie: dura circa 25-35 minuti, ci sono 10 ambienti e 8 enigmi.
Li accompagna **Othy**, una statuina punica di terracotta che parla e dà consigli.

## Come si gioca
- Si gioca in **terza persona** con il robot rosa dell'Othoca (con il logo sulla nuca e sul petto),
  che cammina sul pavimento vero delle foto: **WASD / frecce**, la **croce direzionale** sullo schermo
  (per tablet e LIM) oppure **clic sul pavimento**. La telecamera lo segue e stringe l'inquadratura
  quando si allontana.
- **Gli indizi sono nascosti**: da lontano si vede solo un piccolo luccichio; compaiono quando il robot
  arriva a meno di circa 3 metri. La distanza si cambia con `REVEAL` in `game.js`.
- I codici numerici si inseriscono con un **tastierino**, le parole con le **caselle a lettere**.
- Si trascina per guardarsi intorno.
- Le **frecce blu** fanno camminare nella stanza successiva. Quelle col lucchetto sono chiuse.
- Gli **oggetti arancioni** che pulsano sono indizi o enigmi: cliccandoci ci si avvicina.
- Cliccando **Othy** si riceve un consiglio su cosa fare.
- Dentro ogni enigma si può chiedere un indizio, che costa 1 minuto.
- Il **punteggio** finale è uguale ai secondi rimasti: utile per fare una classifica tra i gruppi.

## Per l'Open Day
1. Usare un PC collegato alla LIM o a un proiettore, oppure dei tablet.
2. Avviare un server locale nella cartella del gioco (serve Python, già presente su Mac e Linux):
   ```
   python3 -m http.server 8000
   ```
   poi aprire **http://localhost:8000** nel browser.
3. Premere ⛶ per lo schermo intero e 🔊 per attivare o disattivare i suoni.
4. A fine partita, "Nuova partita" riporta tutto all'inizio per il gruppo successivo.

Le foto (cartella `tiles/`, circa 42 MB), la libreria Marzipano e il font fenicio (cartella `lib/`)
sono già dentro la cartella, quindi il gioco funziona anche **senza internet**. Senza rete cambiano
solo i caratteri dei titoli, che passano a quelli di sistema.

## Ogni partita è diversa
A ogni "Nuova partita" gli enigmi cambiano: codice binario, parola e spostamento del cifrario
di Cesare, numero disegnato coi pixel, circuito (3 versioni), provette, misure del disegno tecnico,
parola fenicia (TANIT, THARROS, NORA, SULKI, ELISSA), sequenza di luci e cifre dei frammenti.
Il codice finale si calcola da solo. Le varianti sono in fondo a `config.js` (`GAME.variants`).
Per vedere le soluzioni della partita in corso: apri la console del browser e scrivi
`GAME.puzzles.finale.answer` (o `GAME.puzzles.cesare.answer`, ecc.).

## Passaggio tra le stanze
Quando il robot attraversa una porta, la telecamera avanza con lui e la foto nuova si sovrappone
alla vecchia, con il robot che resta fermo nello stesso punto dello schermo: non ci sono stacchi al nero.

## Percorso e soluzioni (esempio di una partita, non darlo ai giocatori!)
| Stanza (foto reale) | Oggetto | Enigma | Soluzione | Ricompensa |
|---|---|---|---|---|
| Ingresso (insegna OTHOCA) | Insegna | Racconto su Othoca | (solo da leggere) | |
| Atrio | Post-it + tastierino | Numeri in binario | 7251 | si apre il corridoio |
| Corridoio | Bacheca blu | Cifrario di Cesare con la ruota | TORNIO | frammento 𐤂 = 4 |
| Museo dell'Informatica | Vecchio computer | Accendere i pixel seguendo il binario | disegnare il numero 5 | frammento 𐤄 = 5 |
| Laboratorio di Elettrotecnica | Quadro elettrico | Interruttori e lampadine | A e C accesi, B e D spenti | frammento 𐤀 = 8 |
| Laboratorio di Chimica | Cartellone + provette | Colori del pH (cavolo rosso) | 2710 | frammento 𐤅 = 7 |
| Torneria | Disegno tecnico sulla porta | Somma delle misure | 120 | frammento 𐤃 = 2 |
| Teatro | Riflettori | Ripetere a memoria 3 sequenze di luci (casuali) | | si apre la porta dietro le quinte |
| Biblioteca | Cartellone + scheda sul tavolo | Alfabeto fenicio, da leggere da destra | TANIT | frammento 𐤁 = 6 |
| Spalti del campo | Cassa | Frammenti in ordine alfabetico fenicio | 864257 | fine |

Per una partita più corta si può abbassare `minutes` in `config.js` oppure togliere una stanza
(basta collegare tra loro la stanza prima e quella dopo).

## Modificare il gioco
Tutto il contenuto è in `config.js`: stanze, porte, posizione degli oggetti, testi degli enigmi,
risposte, indizi e frasi di Othy.

**Spostare un oggetto o una porta:** apri `http://localhost:8000/?editor`, clicca sul punto della
foto e copia `yaw` e `pitch` in `config.js`.

**Aggiungere una stanza:** il sito Othoca360 ha più di 150 foto (mensa, palazzetto, laboratorio
di chimica, teatro, museo…). Per aggiungerne una:
1. copia la cartella della scena da
   `https://itisothoca.altervista.org/immagini-360/<tour>/app-files/tiles/<id-scena>/`
   dentro `tiles/` (servono `preview.jpg` e le cartelle `1`, `2`, `3`);
2. aggiungi la stanza in `config.js` con `tile: "<id-scena>"`;
3. collegala con una porta (`links`) da un'altra stanza.

## File
- `index.html`: pagina, grafica e disegno di Othy
- `config.js`: contenuto del gioco
- `game.js`: motore (enigmi, timer, suoni, cambio stanza)
- `avatar.js`: il robot 3D in terza persona (Three.js)
- `tiles/`: foto 360° delle 10 stanze
- `lib/`: Marzipano, Three.js, il modello del robot e il font fenicio (per giocare offline)

## Il robot 3D: come funziona e limiti
La telecamera 3D è messa nello stesso punto e con la stessa inquadratura della foto, quindi il robot
è in prospettiva corretta e ha un'ombra sul pavimento. Le foto però non hanno informazioni sulla
profondità, quindi:
- il robot non si scontra con muri e mobili e passa sempre "davanti" agli oggetti della foto;
- si muove in un cerchio di circa 6,5 m attorno al punto dove è stata scattata la foto;
- le stanze cambiano solo nei punti dove sono state scattate le foto.

Se in una stanza il robot sembra troppo grande o troppo piccolo, aggiungi alla stanza in `config.js`
per esempio `camHeight: 1.3` (altezza della fotocamera in metri, normalmente 1.5).
Per un ambiente 3D davvero percorribile servirebbe una scansione 3D della scuola
(ad esempio con un'app di fotogrammetria o LiDAR).

## Crediti
- Foto: tour Othoca360, classe 4E Informatica, a.s. 2020-2021.
- Robot: "RobotExpressive" di Tomás Laulhé (Quaternius), licenza CC0, ricolorato in rosa.
- Logo: logo del sito Othoca360 (`lib/img/logoOthoca.png`). Per usare un altro logo basta
  sostituire quel file con un PNG quadrato.
- Librerie: Marzipano (Apache 2.0), Three.js (MIT).
