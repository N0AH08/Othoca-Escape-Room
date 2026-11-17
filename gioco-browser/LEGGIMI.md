# Othoca Escape — versione browser

Escape room 3D dell'I.T.I. "Othoca" che gira nel browser, senza Unity (Three.js).

## Come si avvia
Serve un piccolo server locale (aprendo `index.html` con doppio clic i moduli JS non partono):

```
python3 serve.py
```
poi apri http://localhost:8755

Per pubblicarlo basta caricare **tutta la cartella** su un hosting statico (GitHub Pages, itch.io come gioco HTML, sito della scuola).

## Cosa c'è
- **Menu** (Gioca / Impostazioni / Crediti)
- **Ingresso 360°** con le foto vere e i punti informativi (storia, indirizzi, curiosità)
- **Mappa** delle 8 stanze con stato e miglior tempo (salvati nel browser)
- **8 escape room**: Chimica, Officina, Pneumatica, ZooMate, Informatica (B09), Aula (B19), Palestra, Teatro
  - personaggio in terza persona, camera con collisioni, prof NPC con dialoghi
  - 2 sfide per stanza con 3 livelli di aiuto (H), inventario (Tab), timer, porta d'uscita, vittoria con curiosità
  - tipi di enigma: lucchetto a codice, sequenza, collegamenti, quiz, terminale, blocchi di codice, oggetti da portare
  - pulsante 📷 / tasto F per vedere la foto 360° reale della stanza

## Comandi
W avanti · S indietro · A/D gira (la visuale segue il personaggio da sola; il mouse è facoltativo) · Shift corri · E interagisci · Tab zaino · H aiuto · F foto reale · Esc pausa.
Su tablet: joystick a sinistra e pulsante E a destra.

## File
- `js/rooms.js` — le stanze: arredi, prof, dialoghi, sfide, aiuti, curiosità (qui si cambiano i testi)
- `js/props.js` — arredi 3D · `js/world.js` — motore (personaggio, camera, collisioni)
- `js/ui.js` — dialoghi ed enigmi · `js/main.js` — flusso del gioco · `js/pano.js` — visore 360°
- `foto/` — foto 360° ridotte a 2048 px

Per provare subito una stanza: `http://localhost:8755/#stanza=chimica` (id: chimica, officina, pneumatica, zoomate, informatica, aula, palestra, teatro).

## Grafica
- Post-produzione (qualità "alta"): occlusione ambientale GTAO, bagliore delle lampade, antialiasing MSAA.
- Qualità "media": senza occlusione ambientale. Qualità "bassa": niente post-produzione e niente ombre.
- Se il computer va sotto i 28 fps il gioco abbassa da solo la qualità.
- Moduli Three.js r160 (MIT) in `lib/addons/` (postprocessing, shaders, RoundedBoxGeometry).

## Texture prese dalle foto 360°
- `foto/tex/` — pavimenti, soffitti, finestre, armadi, cartelloni e pannelli ritagliati dalle foto 360° vere (vista prospettica raddrizzata).
- `foto/quadri/` — i quadri dello ZooMate raddrizzati.
- `tools/foto360/` — gli script usati (`sheet.py` crea un foglio di viste di una foto, `extract.py` ritaglia le texture, `rect.py` raddrizza un quadro dai 4 angoli). Richiedono Python con Pillow e NumPy.

## Modelli 3D
- Prof: Kenney "Animated Characters – Protagonists" (CC0) in `lib/models/kenney/`; i vestiti e la foto del viso vengono disegnati nella texture al volo.
- Esploratore: modello Soldier dagli esempi ufficiali di Three.js, con la tuta generata nel codice.
