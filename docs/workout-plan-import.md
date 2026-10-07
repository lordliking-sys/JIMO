# Importazione scheda da foto / PDF — Task 9

Task 9 aggiunge l’importazione di una scheda esistente. La generazione di un nuovo programma con AI resta **In arrivo**: Task 10 non è implementato.

## Stato attuale: AI disabilitata per default

JIMO funziona senza OPENAI_API_KEY: avvio API, login, Home, Programma manuale, Workout, Progressi, health e ready non dipendono dall’AI. La presenza di una chiave non abilita automaticamente alcuna funzione.

```dotenv
# API, disabilitato anche quando una chiave esiste
AI_IMPORT_ENABLED=false
# Mobile, booleano pubblico senza credenziali
EXPO_PUBLIC_AI_IMPORT_ENABLED=false
```

L’import richiede contemporaneamente AI_IMPORT_ENABLED=true, una chiave OpenAI backend e EXPO_PUBLIC_AI_IMPORT_ENABLED=true. GET /features restituisce esclusivamente due booleani di disponibilità: workoutPlanImport e aiProgramCreation (quest’ultimo sempre false). Non interroga OpenAI e non restituisce chiavi, modello o configurazione provider. Senza flag mobile non viene nemmeno richiesta questa configurazione; con opt-in mobile ma server senza chiave/flag, errore di rete o risposta non valida, l’import resta disabilitato.

Nell’empty state Programma e in Crea programma, Import e Crea con AI sono secondari e non cliccabili, con In arrivo / Coming soon. Anche l’onboarding non consente di scegliere i metodi disabilitati. Creazione manuale, allenamenti e progressi restano disponibili. Deep link import/review protetti: nessun picker, analisi o conferma può essere aperto finché l’import è spento. Le review già salvate restano nel database locale, nascoste e non cancellate.

Sul server upload e conferma autenticati restituiscono FEATURE_DISABLED quando l’import non è disponibile, prima di usare extractor, usage o servizi di conferma. Il mobile usa messaggi generici localizzati, senza errori tecnici OpenAI. ai_usage, extractor, schema, matching, review e migration Task 9 sono mantenuti intatti: nessuna migration è necessaria per accendere/spegnere i flag.

Per riattivare in futuro solo l’import: configurare chiave e flag true nel backend, riavviare l’API e controllare /features; impostare il solo booleano pubblico true sul mobile e riavviare Expo con --clear (o ricostruire la build). Crea con AI resta In arrivo: il flag import non abilita Task 10. Anche lo smoke reale richiede il flag server true; non viene eseguito automaticamente da startup, login, schermate core o pnpm test.

## Flusso e confine di salvataggio

`Foto / immagini / PDF → POST autenticato multipart → estrazione OpenAI → Zod → matching deterministico → revisione SQLite → conferma esplicita → transazione Neon → Program Builder`.

L’estrazione scrive solamente `ai_usage`, mai programmi o esercizi personalizzati. La revisione consente di modificare nome, descrizione, settimane, data iniziale, giorni/weekday/note, mapping, serie, ripetizioni/range/durata, modalità di carico, kg/assistenza, RPE, recupero e note. Consente aggiunta/rimozione di giorni ed esercizi. L’editor della prescrizione è lo stesso componente del Program Builder; nella revisione i campi mancanti rimangono vuoti. I default del builder manuale restano disponibili soltanto nel percorso manuale.

Il testo obbligatorio prima della conferma ricorda di controllare i dati importati. Il programma finale è sempre `draft`, non viene attivato automaticamente e si apre nel builder esistente.

## OpenAI, configurazione e SDK

SDK ufficiale `openai@7.28.0`, Responses API, `text.format` JSON Schema rigoroso, `strict: true`. La versione è fissata nel lockfile e rispetta la finestra di maturazione delle dipendenze del repository. Non sono usati Assistants né endpoint consumer.

Il default centralizzato è `gpt-5-mini`: supporta input multimodale e Structured Outputs, con costo ragionevole. È una scelta iniziale configurabile, non una garanzia di accuratezza OCR. Cambiare `OPENAI_IMPORT_MODEL` sull’API non richiede una build mobile. Il provider deve supportare immagini/PDF e output strutturato.

Configurazione **solo API**:

```dotenv
OPENAI_API_KEY=
AI_IMPORT_ENABLED=false
OPENAI_IMPORT_MODEL=gpt-5-mini
AI_IMPORT_DAILY_LIMIT=10
AI_IMPORT_HOURLY_LIMIT=3
```

Non creare variabili pubbliche per le chiavi OpenAI. Il mobile chiama soltanto `EXPO_PUBLIC_API_URL`; DATABASE_URL e secret Clerk restano nel backend. `turbo.json` passa la chiave solo al task `@jimo/api#dev`.

Il servizio implementa `WorkoutPlanExtractor`; l’adapter reale è `OpenAIWorkoutPlanExtractor`, i test usano `FakeWorkoutPlanExtractor`. Nessuna chiamata provider si trova nelle route. I timeout dell’estrattore e del gateway sono 120 secondi; il client multipart ha un timeout dedicato di 150 secondi; il server limita a 180 secondi la ricezione della richiesta. Retry SDK disabilitato: nessun loop automatico o analisi a ogni render/modifica/ripresa. Il retry è una nuova azione esplicita e consuma una nuova quota.

Il trasporto backend usa il proxy HTTP dell’ambiente con CA attendibili e verifica TLS attiva, senza disabilitare sicurezza. L’API Neon usa esclusivamente `neon-http`; il blocco TCP 5432 non impedisce il runtime.

## Endpoint e autenticazione

- `POST /imports/workout-plan`: `multipart/form-data`, campo `locale` obbligatorio (`it` / `en`), file nei campi `file` / `files`. Restituisce `{ importId, extraction, matches }`.
- `POST /imports/workout-plan/confirm`: JSON rigoroso `{ confirmationKey, importId, program, days }`, con ogni esercizio associato a un ID esistente **oppure** a una definizione custom scelta esplicitamente. Risposta 201 con dettaglio del programma.

Entrambi richiedono `CurrentUser` Clerk. Nessun `userId` nel body/query; il client condivide token, rinnovo e protezione account del client API già esistente. Un account diverso non può confermare l’import. Non esistono endpoint pubblici di lettura della revisione.

Gli errori espongono codici sicuri, mai messaggi raw del provider, stack/query/parametri del driver o documenti. Comprendono file grandi, MIME non supportato, multipart invalido, PDF corrotto/protetto, immagini non leggibili, assenza di scheda, schema AI invalido, timeout, quota, provider non disponibile, rete e sessione. Ogni messaggio UI è tradotto IT/EN. Se manca la chiave OpenAI l’import restituisce `AI_NOT_CONFIGURED` senza avviare analisi; health e ready restano operativi.

## File e limiti

| Input                         | Limite                                                |
| ----------------------------- | ----------------------------------------------------- |
| JPEG, PNG, WebP               | massimo 8 immagini; 8 MiB ciascuna                    |
| PDF                           | un solo PDF; 15 MiB; massimo 20 pagine                |
| Payload documenti complessivo | 20 MiB                                                |
| Revisione                     | massimo 20 giorni, 30 esercizi per giorno, 200 totali |

Un PDF non può essere mescolato con immagini nello stesso upload. Il server controlla MIME, estensione, signature/magic bytes, dimensioni e numero di file/pagine. Rifiuta immagini oltre 30 milioni di pixel o un lato di 10.000 pixel. Il PDF viene letto come dati da `pdf-lib` in un worker con deadline e limiti memoria; gli output del parser non vengono riversati nei log. Non vengono eseguiti script PDF o altri contenuti del documento.

Camera e galleria usano Expo Image Picker; le immagini vengono normalizzate in JPEG, senza EXIF e con lato maggiore massimo 2400 px. Expo Document Picker copia il PDF nella cache temporanea. Il permesso camera viene chiesto solo premendo Scatta; la negazione lascia accessibili galleria e PDF. Il picker di sistema per la galleria non richiede preventivamente accesso a tutta la libreria. Le stringhe native dei permessi sono localizzate IT/EN; Expo Go può usare le stringhe del proprio contenitore. La foto mostra anteprima, Rifai e Usa foto prima del pulsante Analizza. Le immagini multipagina si possono rimuovere e riordinare.

Le fasi sono preparazione/caricamento documenti, analisi, preparazione revisione; non mostrano percentuali inventate. Il trasporto non fornisce una separazione misurabile tra upload completato e analisi: la fase analisi comprende l’attesa della risposta API. Tornare indietro annulla la richiesta del client e ignora risposte tardive. Il server può terminare una chiamata provider già avviata; non c’è una cancellazione provider remota complessa.

## Privacy e lifecycle

Il backend mantiene byte e output transitori in memoria per la richiesta; non scrive file su disco, storage persistente o tabella documenti. Alla fine libera i riferimenti. Il parser termina il worker. La risposta ha `Cache-Control: no-store`.

L’adapter usa input inline: non carica risorse nella Files API e non ha file provider da cancellare. `store: false` disabilita la memorizzazione applicativa della response per recupero successivo; **non implica Zero Data Retention né elimina le policy di conservazione/abuse monitoring dell’account OpenAI**. La configurazione di retention del provider va verificata nell’account prima di trattare documenti reali sensibili.

Sul dispositivo si cancellano solo copie/normalizzazioni create dalla feature quando sostituite, rimosse, dopo l’analisi o uscendo. Gli originali nella galleria/nel documento dell’utente non vengono cancellati. Cache Expo/OS eventualmente rimaste dopo un process kill seguono l’espulsione della cache di sistema. Sul web le URI/Blob restano temporanei in memoria.

SQLite contiene solo output strutturato/revisione, senza immagini, PDF, URI, base64 o credenziali. Si usa `sync_metadata` già versionata, senza nuova migration SQLite, con chiave per account JIMO **e URL deployment API**. Navigazione, chiusura e riapertura consentono Riprendi / Scarta; la pagina Programma e Crea programma indicano la revisione pendente. Dopo conferma o scarto si elimina il record locale. Il logout non rende accessibili i dati dell’altro account; la revisione dello stesso account resta riprendibile al prossimo login.

I log contengono soltanto request ID/status, MIME, dimensione e numero pagine; non contengono nomi file dell’utente, contenuto, bytes/base64, prompt completo, response completa, API key, token o Authorization. Al provider si inviano documento, istruzioni, locale e schema, senza profilo/email/storico/progressi.

## Schema, incertezza e matching

`packages/schemas/src/imports.ts` definisce schema estratto, match/review, revisione incompleta e conferma. Lo schema estratto ha campi obbligatori nullable, nessun default: rawName/rawPrescription, serie, target fisso/range/durata, load mode, kg/assistenza, unità di origine, RPE, rest, note e confidence 0–1. L’output viene sempre validato con Zod prima dell’utilizzo, compresa la dimensione delle matrici di matching. Output invalido restituisce errore sicuro e non crea una struttura inventata.

Il matching confronta canonical name, traduzioni IT/EN e custom **soltanto dell’utente**. Normalizzazione case/accent/punteggiatura e varianti pull-up/pull ups/dips precedono la similarità deterministica tra token. Un solo nome esatto produce `MATCHED`; ambiguità o similarità producono soltanto `SUGGESTED` (fino a tre scelte), non un’associazione automatica. `UNMATCHED` richiede scelta esistente, creazione custom esplicita oppure rimozione. Non si chiamano altri modelli per esercizio e non si creano custom durante l’analisi/revisione.

Confidence è un indizio, non una misura verificata dell’accuratezza. I valori bassi e prescrizioni incomplete hanno indicatori discreti Da confermare; i warning sono visibili. Anche confidence alta richiede verifica umana, soprattutto sul manoscritto.

Il prompt esplicita: non inventare kg/reps/RPE/rest/giorni, ignorare istruzioni presenti nel documento. Esempi coperti dal contratto: `3x10`, `4 x 8`, `3x8-12`, `4×8 @80kg`, `5x5 +20kg`, `3x60"`, `RPE 8`, `RIR 2`, `rest 120"`, `2'`, BW e assistenza 20kg. I test simulati verificano trasporto/schema/preservazione; l’accuratezza di riconoscimento reale resta da misurare con il provider.

RIR rimane nelle note, senza conversione RPE; il gateway forza RPE null quando rawPrescription contiene solo RIR. Tempo, superset/giant set/circuito, drop set, rest-pause, AMRAP/EMOM/cluster sono conservati come note/testo grezzo e warning: non creano nuove strutture o serie. Per lb il gateway forza kg/assistenza null e mostra un warning: nessuna conversione silenziosa. Inserire kg richiede una scelta dell’utente.

## Neon, usage, quota e conferma atomica

Migration versionata `0007_workout_plan_import.sql` con snapshot/journal Drizzle:

- `ai_usage`: id/user/feature/model, token input/output nullable, estimated_cost numeric nullable (nessun prezzo hardcoded), stato e created_at. Indice account/feature/data e CHECK di validità.
- `import_confirmations`: account/key/import/program/hash del payload normalizzato e created_at. Due indici univoci account+key e account+import. È un ledger minimale di idempotenza, non una sessione documenti/review server.

`canUseAiFeature` prenota atomicamente un record started con advisory lock PostgreSQL e limiti persistenti: default 3 analisi/ora e 10/24 ore per account, configurabili. Anche fallimenti e timeout consumano tentativi. La route limita inoltre a due richieste contemporanee per processo. Non ci sono credits, subscription o RevenueCat. Il record termina succeeded/failed/invalid_output/no_program/timeout e conserva usage se disponibile, senza documenti/prompt.

La conferma condivide validazione e servizio dettaglio del Program Management. Un’unica transazione Neon HTTP crea programma draft, giorni, tutte le prescrizioni e custom esplicitamente richiesti, oltre al ledger. Controlla proprietà degli esercizi e tracking mode; un item non più disponibile provoca rollback, non omissione. I nomi custom in conflitto richiedono di scegliere l’esercizio già esistente o correggere il nome, senza modificare automaticamente custom preesistenti.

Doppio tap/concorrenza/retry con lo stesso payload restituiscono il medesimo programma. Riutilizzare la chiave/import con contenuto diverso dà 409. Il ledger resta come tombstone dopo la rimozione del programma e un retry obsoleto dà 410 invece di ricrearlo. Cambiare chiave non duplica lo stesso import. Dopo un errore di rete nella conferma, riprovare la stessa revisione conserva la chiave.

Applicazione migration soltanto development, mediante runner HTTP esistente protetto da `assertDevelopment`. Il branch ID atteso deve coincidere con `current_setting('neon.branch_id')`; il nome development è stato confermato dall’utente. Non è usato drizzle push, non è disabilitato TLS e production non viene contattata.

Offline: analisi e conferma disabilitate; review già estratta modificabile/riprendibile, nessun costo AI per riaprirla. Il percorso manuale resta visibile e mantiene il comportamento online del builder esistente.

## Verifiche e comandi

Unit test senza chiave/rete provider:

```bash
pnpm test
```

Fixture sintetiche originali in `apps/api/test/fixtures/imports`: scheda stampata JPEG, screenshot PNG, immagine parzialmente illeggibile, WebP mixed IT/EN e PDF di due giorni. `plan.json` è l’output fake, non un risultato OpenAI. Nessun dato personale o piano di terzi.

API integration reale su Neon development (configurare il branch ID confermato nel backend):

```bash
pnpm --filter @jimo/api test:integration
pnpm db:check
```

E2E browser con upload multipart reale, provider fake e database development:

```bash
EXPO_PUBLIC_AI_IMPORT_ENABLED=true EXPO_PUBLIC_AUTH_TEST=true EXPO_PUBLIC_API_URL=http://localhost:4301 pnpm --filter @jimo/mobile exec expo export --platform web --clear
EXPO_PUBLIC_AI_IMPORT_ENABLED=true pnpm --filter @jimo/mobile exec playwright test imports.spec.ts
```

L’harness E2E richiede NODE_ENV=test, guard development e bind loopback; non abilita bypass nel server runtime. Crea un utente sintetico isolato e lo rimuove a fine prova. Il flag E2E è solo per export di test: **rimuoverlo prima di avviare o costruire l’app da usare con Clerk**.

Uno smoke reale, esplicito e separato dalla suite (due chiamate di estrazione, una per fixture, senza retry automatici):

```bash
pnpm --filter @jimo/api test:import:real
```

Con chiave presente controlla prima la disponibilità del modello con una richiesta metadata, poi genera in memoria due piccoli PDF sintetici: una scheda PUSH/PULL con tre esercizi e una scheda con kg/RPE volutamente mancanti. Confronta output e prescrizioni attese, valida con Zod anche l’output provider prima delle normalizzazioni del gateway e verifica ai_usage, assenza di programmi/custom/conferme e assenza di colonne documento/prompt. Non chiama la conferma e non scrive fixture su disco. Rimuove infine l’utente sintetico development con i suoi record usage. Senza chiave indica test pendente e non chiama OpenAI. Non logga documenti/prompt/secret, neppure negli errori. `--missing-only` esegue soltanto la seconda fixture, senza ripetere la prima.

## Test su telefono reale con Expo Go

Questa checklist import vale soltanto dopo riattivazione esplicita dei flag server/mobile. Per l’uso core attuale lasciarli false: OPENAI_API_KEY non serve.

Configurare sulla macchina che esegue API: DATABASE_URL del solo development, NEON_DEVELOPMENT_BRANCH_ID confermato, Clerk development completo e OPENAI_API_KEY. CLERK_ISSUER_URL deve essere l’origine HTTPS della propria istanza Clerk, **senza** `/.well-known/jwks.json`; CLERK_AUTHORIZED_PARTIES contiene origini esplicite consentite. ALLOW_DEV_AUTH=false e nessun DEV_USER_ID nel percorso reale. Sul mobile bastano la publishable key Clerk e l’URL API pubblico/LAN.

Windows PowerShell, dalla root JIMO:

1. `pnpm.cmd install --frozen-lockfile`
2. `pnpm.cmd exec turbo run build --filter=@jimo/api`
3. Nel terminale API, impostare le variabili backend solo lì e avviare `pnpm.cmd --filter @jimo/api dev`. Non incollare credenziali in screenshot o chat.
4. Sul telefono e sul PC aprire `http://192.168.1.138:3001/health` e `/ready`: devono risultare ok/ready (usare l’IP LAN attuale del PC se cambiato). Consentire il servizio sul firewall della rete privata; PC/telefono sulla stessa Wi-Fi.
5. In un secondo terminale nella root: `$env:EXPO_PUBLIC_API_URL="http://192.168.1.138:3001"`, impostare la publishable key development, rimuovere l’eventuale flag test con `Remove-Item Env:EXPO_PUBLIC_AUTH_TEST -ErrorAction SilentlyContinue` e avviare `pnpm.cmd --filter @jimo/mobile dev --lan --clear`.
6. Aprire Expo Go e scansionare il QR. Se LAN non funziona usare Expo tunnel **e** un endpoint HTTPS/tunnel separato per l’API: il tunnel Expo non espone automaticamente la porta 3001. EXPO_PUBLIC_API_URL deve essere quell’endpoint API, mai localhost sul telefono.
7. Login Clerk → Programma → Nuovo programma / Importa scheda → testare foto con Rifai/Usa, galleria multipagina e PDF.
8. Controllare tutti i dati della review, un unmatched, RIR/tempo/lb e i warning; correggere kg/serie/rest, aggiungere/rimuovere item. Uscire e riaprire l’app: Riprendi deve conservare le modifiche.
9. In modalità aereo verificare review locale e blocco analisi/conferma; riconnettere e confermare una sola volta. Nel builder deve comparire una bozza, senza attivazione automatica; provare retry dopo perdita di rete senza duplicati.
10. Provare permesso camera negato (galleria/PDF restano disponibili), documento errato, PDF grande e passaggio tra due account. Nessuna review dell’altro account deve comparire.

Il test su telefono reale richiede verifica manuale: export e test browser non attestano permessi/camera o qualità OCR su Android/iOS fisici.

Il mobile resta su Expo SDK 57: i pacchetti esistenti sono allineati alle patch compatibili 57.0.27 / router 57.0.25, senza cambio architettura. Il comando build pulisce la cache Metro per evitare flag pubblici di test rimasti da un export precedente. Il componente Screen condiviso conserva il focus sul web durante lo scroll automatico e ricalcola la visibilità dopo il resize, così i campi della review/builder non rimangono dietro al footer.

## Risultati della verifica in Codex — 7 ottobre 2026

- Migration `0007_workout_plan_import.sql`: una migration applicata, otto totali, solo branch development confermato. Fingerprint prima/dopo: dati di users/programs/exercises e tutte le colonne delle tabelle preesistenti invariati.
- Check Neon HTTP: 12 tabelle, 6 enum stabili, 35 indici, 153 constraint, 9 trigger di audit; ledger coerente con gli SQL versionati.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`: passati; 102 test unitari (65 mobile, 18 API, 14 schemas, 5 database).
- `pnpm build`: passato, compresi export Android, iOS e web. Build normale verificata con flag auth di test disabilitato; non sono stati creati APK/IPA.
- `pnpm format:check`: passato. Scansione credenziali su 460 file tra sorgenti e output API/mobile: passata, nessuna credenziale esposta.
- Suite API integration development: 56 test passati, compresi isolamento utenti, rollback al quarto esercizio, doppio tap concorrente, idempotenza, tombstone dopo rimozione e quote concorrenti.
- Suite Playwright completa: 21 test passati. Il nuovo percorso usa upload PDF multipart reale → extractor fake → revisione SQLite → modifica carico, ripresa dopo reload/navigazione, rimozione esercizio e creazione custom esplicita → programma draft reale su development. I custom non esistono prima della conferma. Verificati anche loading e errore provider sicuro con retry manuale.
- Runtime con configurazione Clerk reale, senza DEV_USER_ID: health/ready 200; upload/confirm non autenticati 401.
- `expo install --check`: passato dopo allineamento delle patch compatibili SDK 57.
- Configurazione nativa dei permessi verificata: camera Android dichiarata dal picker e non bloccata, microfono esplicitamente escluso, descrizioni camera/galleria iOS e risorse IT/EN presenti. Questa verifica della configurazione non sostituisce la prova dei permessi su dispositivo fisico.
- Smoke OpenAI alla verifica iniziale: **pendente**, OPENAI_API_KEY allora assente. Il tentativo successivo alla configurazione è riportato sotto.
- Il telefono fisico, i suoi permessi/camera e la qualità dell’estrazione reale richiedono la checklist manuale sopra. I test fake non misurano OCR/accuratezza del modello.

Production non è stata contattata. Task 10 non è iniziato. Le modifiche del visual cleanup già presenti sono state conservate.

## Verifica reale dopo configurazione della chiave — 7 ottobre 2026

- OPENAI_API_KEY presente nel backend, OPENAI_IMPORT_MODEL non impostato: default effettivo `gpt-5-mini`. SDK Responses inizializzabile e lookup del modello riuscito. Nessun cambio modello o architettura.
- Effettuate esattamente **due richieste Responses**, una per la fixture completa e una per la fixture con kg/RPE mancanti. Entrambe rifiutate con **HTTP 429**, senza retry. Il codice SDK della seconda risposta non corrispondeva ai codici specifici riconosciuti dalla diagnostica; non è possibile attribuire con certezza il rifiuto a credito/quota esauriti oppure a un rate limit temporaneo. Il messaggio raw non viene mostrato.
- Output strutturato, validazione Zod dell’output reale, accuratezza della scheda e comportamento no-invention: **non verificabili**, perché non è stato restituito output. Questo esito non equivale a un PASS di estrazione.
- Sul secondo tentativo ai_usage verificato: utente sintetico corretto, feature workout_plan_import, modello gpt-5-mini, stato failed; input_tokens, output_tokens ed estimated_cost null perché il provider non li ha restituiti. Nessun costo monetario è attestabile dalla risposta. Verificate anche le sole colonne metadata, senza documento/prompt. I dati sintetici sono stati rimossi al termine.
- Programmi, esercizi custom e ledger di conferma per l’utente smoke: sempre zero. Fixture solo in memoria, buffer azzerati dopo utilizzo, nessun file persistente o programma creato durante le chiamate reali.
- Ripetuti i nove test di integrazione import su Neon development: tutti passati. Conferma atomica, doppio tap concorrente, idempotenza, rollback e stato draft verificati con extractor fake e database reale. Review, camera/galleria e rimozione delle copie temporanee sul telefono restano controlli manuali.
- Controlli finali dopo l’aggiornamento dello smoke: pnpm lint, pnpm typecheck e pnpm test passati (102 unit test). Scansione credenziali ripetuta su 460 file, inclusi output API/mobile: nessuna credenziale trovata. Nessuna variabile pubblica OpenAI configurata.
- Nessuna nuova migration eseguita; production non contattata; Task 10 non iniziato. Nessun bug funzionale dimostrato dalle risposte 429. Modificati soltanto lo smoke riproducibile e questa documentazione.

Prima di ripetere lo smoke o il test import su telefono, controllare nel progetto OpenAI associato alla chiave billing/crediti, limiti del progetto e rate limit del modello. Non sostituire il modello per tentare di aggirare un problema di quota. Lo script ora classifica i messaggi SDK in categorie sicure per distinguere, quando il provider lo consente, quota account e limite temporaneo, senza stampare il messaggio originale.

Finché il provider risponde 429, il percorso reale non può arrivare alla review: la checklist camera/galleria/PDF → conferma va completata dopo aver risolto il limite. Se l’API viene avviata sul PC Windows anziché nel cloud, configurare anche lì la chiave OpenAI nel solo terminale backend; le variabili cloud non vengono copiate nello ZIP né propagate al mobile. Non aggiungerla a variabili EXPO_PUBLIC.

## Verifica della modalità AI spenta — 7 ottobre 2026

- Runtime reale con Clerk development e Neon development, OPENAI_API_KEY rimossa dal processo: avvio riuscito sia con AI_IMPORT_ENABLED=false sia con true. Health e ready 200, /features 200 con entrambi i booleani false, upload/conferma senza autenticazione 401.
- Test API: flag assente/false anche con chiave presente; flag true senza extractor; upload e conferma autenticati disabilitati prima di usare database/extractor; configurazione pubblica composta soltanto da booleani, senza analisi. Test mobile: nessuna richiesta con flag assente/false, disponibilità server necessaria anche con flag true, metadata senza token, rete/schema errati trattati come funzione spenta.
- pnpm lint, pnpm typecheck e pnpm test passati: 108 test unitari (68 mobile, 21 API, 14 schemas, 5 database).
- Suite API integration development: 56 test passati in esecuzione sequenziale. La prima esecuzione concorrente aveva restituito 500 in una creazione giorno; il problema non si è riprodotto né nel test isolato né nell’intera suite sequenziale. Nessuna modifica ai servizi core o al database.
- Suite browser in modalità AI spenta: 20 passati e 2 import intenzionalmente saltati. Verificati login, Home, onboarding manuale, builder, workout/offline, progressi, IT/EN e blocco dei deep link import/review. Il test della modalità spenta verifica anche assenza di richieste import/provider/configurazione AI dal mobile.
- Corretto un problema emerso nella prova di riattivazione: al reload della review il guard non deve espellere l’utente mentre arriva la disponibilità del server. Solo il layout import attende la configurazione; le schermate core non attendono questa richiesta. Il fetch pubblico non dipende dai token o dalla generazione dell’account, verificato anche con un cambio sessione durante la richiesta.
- Dopo la correzione, due E2E del flow riattivato passati con extractor simulato e chiave OpenAI rimossa dal processo: upload, review persistente/reload, modifica, custom esplicito, conferma draft ed errore sicuro/retry. Nessuna chiamata OpenAI.
- pnpm build passato con chiave OpenAI rimossa, entrambi i flag AI false e auth di test false: API e export Android/iOS/web completati. pnpm format:check passato. Credential scan degli artefatti finali e sorgenti: 466 file, nessuna credenziale trovata; nessuna chiave OpenAI nei file ambiente mobile.
- Nessuna chiamata OpenAI eseguita in questo intervento. Nessuna migration o operazione su production.
