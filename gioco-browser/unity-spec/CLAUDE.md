# CLAUDE.md — Othoca Escape Room 3D

> Specifica permanente del progetto. Va nella **root del progetto Unity**: Claude Code la legge a ogni sessione.
> I campi `[DA COMPILARE]` vanno completati man mano.

## 0. Come lavoriamo (IMPORTANTE)

- **Noah non conosce Unity.** Sei tu (Claude Code) a usare Unity: crei scene, GameObject, prefab, materiali, ScriptableObject, luci e build. A Noah chiedi solo quello che non puoi fare tu (es. installare Unity Hub, cliccare un pulsante di consenso, darti foto/misure) e glielo spieghi passo passo, come a un principiante.
- Controlli l'Editor tramite **MCP for Unity** (vedi sezione 9). Se un'operazione non è disponibile via MCP, scrivi un **Editor script** (`[MenuItem]` o `[InitializeOnLoad]`) che la fa in automatico, e lo esegui tu via MCP.
- Le build WebGL le lanci tu da riga di comando (`-batchmode -executeMethod`), senza bisogno che Noah apra menu.
- Verifichi da solo il tuo lavoro: console di Unity senza errori, gerarchia della scena corretta, **screenshot della scena** confrontati con le foto reali (sezione 4.3).
- Lavora **una fase alla volta** (vedi PROMPTS_FASI.md). A fine fase: riepilogo breve, cosa deve provare Noah in Play Mode (es. "premi Play, muoviti con WASD, controlla che…") e poi **fermati e aspetta il suo OK**.

## 1. Obiettivo

Gioco 3D in Unity ambientato nell'**I.T.I. "Othoca" di Oristano**. Il giocatore entra nella scuola, vede una breve presentazione dell'istituto, sceglie un laboratorio (o il teatro) ed entra in una **escape room**: per uscire deve completare 1+ task assegnate da **professori NPC** che parlano con lui.

- **Target**: ragazzi delle medie e del 1°–2° anno delle superiori (uso previsto: orientamento / open day).
- **Durata**: 5–10 minuti per stanza.
- **Tono**: curioso e leggero, mai frustrante. Sempre disponibile un sistema di aiuti.
- **Scopo didattico**: ogni stanza fa capire cosa si studia in quel laboratorio e in quell'indirizzo.
- **Indirizzi dell'istituto**: Informatica e Telecomunicazioni; Elettronica ed Elettrotecnica; Meccanica, Meccatronica ed Energia; Liceo Scientifico opzione Scienze Applicate. C'è anche un laboratorio di robotica.

## 2. Vincoli tecnici

- **Engine**: Unity 6 LTS, **URP**.
- **Piattaforma**: **WebGL (browser)**. Budget performance stretto:
  - texture max 2K (1K per gli oggetti piccoli), compressione ASTC/DXT;
  - luci **baked** (lightmap) + light probe, al massimo 1 luce realtime;
  - niente post-processing pesante (solo tonemapping, color grading leggero, eventualmente bloom basso);
  - ogni stanza è una scena separata, caricata in modo asincrono; target ≥ 30 fps su un PC scolastico medio;
  - dimensione build iniziale contenuta (le stanze possono essere caricate con Addressables in una fase successiva, se serve).
- **Input**: nuovo **Input System**. WASD per muoversi, mouse per la camera, `E` per interagire, `Tab` per l'inventario, `H` per un aiuto, `Esc` per la pausa. Gestire il **pointer lock** del browser (click per catturare il mouse, Esc lo rilascia).
- **Camera**: terza persona con **Cinemachine**, con collisione contro i muri (le stanze sono piccole).
- **Linguaggio**: C#. Naming, classi, cartelle e variabili in **inglese**. Commenti brevi **in italiano**, solo sui blocchi importanti (non su ogni riga), con i termini tecnici in inglese.
- **Testi di gioco**: in italiano, tutti dentro ScriptableObject, **mai hardcoded** negli script.
- **Salvataggio**: PlayerPrefs (funziona su WebGL tramite IndexedDB).
- **Asset**: solo asset originali, CC0 o con licenza compatibile (es. Mixamo, Quaternius, Kenney, Poly Haven). **Vietato** estrarre o copiare modelli, texture o suoni da giochi commerciali. Ogni asset esterno va registrato in `Assets/_Project/CREDITS.md` con fonte e licenza.

## 3. Struttura del gioco

```
Boot → MainMenu → SchoolEntrance (hub + presentazione) → Lab_<Nome> / Theatre → (vittoria) → SchoolEntrance
```

### 3.1 SchoolEntrance (hub)
- Si apre con una **presentazione breve** dell'istituto: viewer di **foto 360°** (skybox Panoramic o sfera invertita) con 3–5 hotspot cliccabili che mostrano brevi testi (storia, indirizzi, laboratori, curiosità).
- Poi il giocatore può camminare nell'atrio OPPURE usare un **menu/mappa** per scegliere la stanza.
- Ogni porta/voce del menu mostra: nome del laboratorio, indirizzo collegato, difficoltà, stato (non iniziata / completata, con il miglior tempo).
- Il caricamento delle stanze è asincrono con una schermata di caricamento.

### 3.2 Stanze (escape room)
Ogni stanza è una scena separata, costruita sullo stesso template:
1. Ingresso → la porta si chiude dietro il giocatore.
2. Il professore NPC si presenta e assegna la task (dialogo con voce o testo).
3. Il giocatore esplora, raccoglie oggetti, risolve i puzzle.
4. Quando tutte le task sono completate → la porta d'uscita si sblocca → schermata di vittoria (tempo, aiuti usati, curiosità sull'indirizzo).

Stanze (6):

| Scena | Stanza | Collegamento didattico | Cartella foto |
|---|---|---|---|
| `Lab_Informatics` | Laboratorio di Informatica | Informatica e Telecomunicazioni | `Photos360/Informatics/` |
| `Lab_Telecom` | Laboratorio di Telecomunicazioni | Informatica e Telecomunicazioni (art. Telecomunicazioni) | `Photos360/Telecom/` |
| `Lab_Chemistry` | Laboratorio di Chimica | Biennio comune / Liceo Scienze Applicate | `Photos360/Chemistry/` |
| `Classroom` | Aula classica | Materie comuni (matematica, italiano, storia, inglese) | `Photos360/Classroom/` |
| `Gym` | Palestra | Scienze motorie | `Photos360/Gym/` |
| `Theatre` | Teatro | Attività e progetti dell'istituto | `Photos360/Theatre/` |

Più l'ingresso: `SchoolEntrance` → `Photos360/Entrance/`.

Le foto 360° le fornisce Noah direttamente nelle cartelle indicate.

## 4. Ricostruzione realistica delle stanze (foto 360°)

Una foto 360° da sola **non** genera una geometria 3D calpestabile. Pipeline adottata:

### 4.1 Input forniti da Noah
Per ogni stanza, in `Assets/Art/Photos360/<RoomName>/`:
- foto 360° equirettangolari (2–3 punti di scatto per stanza) + un file `points.json` con la posizione approssimativa di ogni scatto (es. "centro stanza, h 1.6 m");
- misure principali in metri: larghezza, lunghezza, altezza, porte, finestre, posizione dei banchi [DA COMPILARE per ogni stanza];
- eventuali foto normali di dettagli (lavagna, macchinari, poster).

### 4.2 Costruzione
1. **Analisi**: guardi le foto (le puoi leggere come immagini) ed elenchi a Noah cosa vedi (arredi, materiali, luci, colori) per conferma.
2. **Shell della stanza**: generata da codice/ProBuilder con le misure reali (pavimento, pareti, soffitto, porte, finestre, collider).
3. **Allineamento**: una sfera 360° semitrasparente posizionata nel punto di scatto serve da riferimento per piazzare gli arredi nella posizione giusta.
4. **Materiali**: texture di pareti, pavimento, soffitto e lavagna ricavate dalle foto (raddrizzate, rese tileable e ridimensionate per WebGL) o materiali PBR CC0 simili.
5. **Arredi**: banchi, sedie, PC, oscilloscopi, torni ecc. come prefab modulari riutilizzabili tra le stanze.
6. **Luci**: colore e posizione delle luci copiati dalle foto (neon, finestre), lightmap baked, reflection probe con la foto 360° come riferimento.

### 4.3 Ciclo di realismo
Per ogni stanza: posiziona una camera nello stesso punto e con la stessa altezza dello scatto reale, **cattura uno screenshot** (tool MCP oppure Editor script che fa il render della camera su PNG in `Temp/Screenshots/`), **confrontalo con la foto 360°** ed elenca le differenze (proporzioni, colori, luci, oggetti mancanti). Correggi e ripeti finché la differenza è accettabile, poi mostra a Noah screenshot e foto affiancati per il suo feedback.

### 4.4 Opzionale (fase avanzata)
Scansione con fotogrammetria o Gaussian Splatting da video del telefono: più realismo, ma pesante per WebGL e senza collisioni (servono collider invisibili). Da valutare solo dopo che la versione base funziona.

## 5. Personaggio giocabile

- Personaggio **originale**, in stile "esploratore" (tuta da lavoro o divisa da laboratorio, zaino, torcia), ispirato all'atmosfera dei giochi di esplorazione tipo *Escape the Backrooms* ma **non** copiato da quel gioco.
- Personalizzato Othoca: logo della scuola sulla divisa (texture/decal) e **colori presi dal logo** (sezione 5.1).
- Base: modello umanoide rigged (es. da Mixamo, che Noah scarica con il suo account se serve: guidalo tu) + animazioni idle / walk / run / interact.
- Controller: `CharacterController`, movimento relativo alla camera, corsa con `Shift`, niente salto.

### 5.1 Palette Othoca
- Il logo ufficiale sta in `Assets/Art/Branding/logo.png` (fornito da Noah).
- **Estrai tu i colori dominanti** dal logo (script Python o C# che fa k-means/istogramma sui pixel, escludendo trasparenza e bianco/nero puro), proponili a Noah con i codici HEX e, dopo l'OK, salvali in uno ScriptableObject `OthocaPalette` (primary, secondary, accent, dark, light).
- Tutta la UI, la divisa del personaggio, i dettagli dell'hub usano solo colori da `OthocaPalette`.
- Palette confermata: [DA COMPILARE dopo l'estrazione].

## 6. Sistemi di gioco (architettura)

Tutto **data-driven** con ScriptableObject, così aggiungere una stanza o una task non richiede nuovo codice.

| Sistema | Responsabilità | Classi principali |
|---|---|---|
| Player | Movimento, camera, animazioni | `PlayerController`, `PlayerAnimator` |
| Interaction | Raycast/trigger, prompt "Premi E", highlight dell'oggetto | `IInteractable`, `Interactor`, `InteractionPrompt` |
| Inventory | Oggetti raccolti, combinazione, uso su un target | `ItemData` (SO), `Inventory`, `InventoryUI` |
| Dialogue | Dialoghi NPC a nodi, scelte, voce opzionale | `DialogueData` (SO), `DialogueRunner`, `DialogueUI`, `NpcTeacher` |
| Tasks/Puzzle | Obiettivi, condizioni, stato | `TaskData` (SO), `TaskManager`, `PuzzleBase` + sottoclassi |
| Hints | Aiuti a più livelli per ogni task | `HintData` (dentro `TaskData`), `HintSystem` |
| Room flow | Start/end della stanza, timer, porta d'uscita | `RoomController`, `ExitDoor`, `RoomTimer` |
| Game flow | Scene, progressi, salvataggio | `GameManager` (singleton), `SceneLoader`, `SaveSystem` |
| UI | HUD, pausa, vittoria, impostazioni (volume, sensibilità mouse) | `UIManager` + pannelli |
| Audio | Musica ambiente per stanza, SFX, voci | `AudioManager` |

Comunicazione tra sistemi tramite **eventi** (C# events o ScriptableObject event channels), niente `FindObjectOfType` a runtime.

### Tipi di puzzle riutilizzabili (`PuzzleBase`)
- `CodeLockPuzzle` — tastierino / lucchetto a combinazione.
- `ItemPlacementPuzzle` — mettere gli oggetti giusti nei posti giusti.
- `SequencePuzzle` — premere/attivare elementi nell'ordine corretto.
- `WiringPuzzle` — collegare cavi tra punti (minigioco UI 2D).
- `QuizPuzzle` — domanda a scelta multipla posta dal professore.
- `TerminalPuzzle` — finto terminale/PC con comandi semplici.

### Professori NPC
- Ogni professore ha: nome [DA COMPILARE, solo con il consenso del docente, altrimenti nomi inventati], materia, modello 3D, `DialogueData`.
- I professori "parlano": testo a schermo (sottotitoli sempre attivi) + voce opzionale (`AudioClip` per ogni battuta: registrazione reale o TTS).
- Dialoghi: introduzione → assegnazione della task → frasi di aiuto contestuali → congratulazioni finali.

## 7. Struttura delle cartelle

```
Assets/
  _Project/
    Scenes/          (Boot, MainMenu, SchoolEntrance, Lab_*, Theatre, Sandbox)
    Scripts/
      Core/          (GameManager, SceneLoader, SaveSystem, Events)
      Player/
      Interaction/
      Inventory/
      Dialogue/
      Tasks/
        Puzzles/
      UI/
      Audio/
    Editor/          (tool, builder, build script, screenshot)
    Data/            (ScriptableObject: Rooms, Tasks, Items, Dialogues, OthocaPalette)
    Prefabs/
      Props/
      Interactables/
      UI/
      NPC/
    CREDITS.md
  Art/
    Photos360/<RoomName>/
    Branding/
    Materials/
    Models/
  Audio/
Builds/WebGL/        (fuori da Assets, ignorata da git)
```

## 8. Build e pubblicazione WebGL

- Script `Assets/_Project/Editor/BuildScript.cs` con `BuildWebGL()`, lanciato da riga di comando in batchmode (con l'Editor chiuso) oppure via MCP (con l'Editor aperto).
- Test locale con un piccolo server HTTP statico (le build WebGL non funzionano aprendo `index.html` da file).
- Pubblicazione: [DA COMPILARE: itch.io / GitHub Pages / sito della scuola]. Su hosting che non imposta gli header `Content-Encoding` (es. GitHub Pages) usare **Decompression Fallback** oppure compressione disattivata: verificalo e dimmi quale scelta hai fatto.

## 9. MCP for Unity (controllo dell'Editor)

- Server consigliato: **MCP for Unity** (repository `CoplayDev/unity-mcp`, licenza MIT). Segui sempre il README **aggiornato** del repository per installazione e configurazione, non inventare URL o comandi.
- Requisiti: Editor Unity **aperto** con il progetto; Python 3.10+ e `uv`.
- Regole d'uso:
  - **commit Git prima di ogni modifica importante** (l'undo via MCP non copre tutto);
  - dopo aver modificato script C#, aspetta la fine della compilazione/domain reload prima di nuove chiamate MCP (le chiamate in corso possono fallire): controlla lo stato e riprova;
  - non leggere intere scene enormi in una volta: interroga solo gli oggetti che ti servono;
  - controlla la console di Unity dopo ogni passaggio e risolvi errori e warning;
  - non usare l'esecuzione di codice arbitrario se esiste un tool specifico per l'operazione.
- Se l'MCP non risponde: chiedi a Noah di verificare che Unity sia aperto e che la finestra *MCP for Unity* risulti connessa, spiegandogli esattamente dove guardare.

## 10. Regole generali

- Prima di creare un nuovo sistema, controlla se esiste già qualcosa di riutilizzabile.
- Niente pacchetti di terze parti senza chiederlo prima a Noah (con il motivo).
- Codice compilabile senza warning. Se un'API di Unity 6 non ti è chiara, dillo invece di inventarla.
- Aggiorna questo file se cambiano decisioni importanti, chiedendolo prima a Noah.
