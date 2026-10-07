> Task 8 replaces the temporary identity described historically below with Clerk → internal UUID. Development bootstrap now requires explicit `ALLOW_DEV_AUTH=true`; production requires verified Clerk and fails closed. See [Authentication](authentication.md). Browser tests require the dedicated `EXPO_PUBLIC_AUTH_TEST=true` test export, never a release artifact.

# Program Management — Task 4

Il flusso manuale è Mobile → Fastify → Drizzle → Neon HTTP. Il mobile non conosce `DATABASE_URL` e non importa il package database. I contratti JSON/Zod e gli helper numeric sono nel barrel mobile-safe di `@jimo/schemas`; le definizioni Drizzle restano server.

## Identità temporanea e branch

Le route personali ricevono un `CurrentUserProvider` centrale (`apps/api/src/current-user.ts`), chiamato per ogni richiesta. I servizi ricevono soltanto il suo ID; `userId`, ownership, status e position non sono input liberamente impostabili dal client. Le route non leggono identità da header o query.

In development/test il server verifica prima che `current_setting('neon.branch_id')` corrisponda a `NEON_DEVELOPMENT_BRANCH_ID`. Per questo progetto development è `br-purple-math-b1fsq2wb`, confermato dall'utente. Se il confronto fallisce non avviene il bootstrap. Con `DEV_USER_ID` impostato deve esistere già quell'utente; con valore assente/vuoto viene inserito idempotentemente l'utente development stabile `3c9e1b7d-7596-4f15-a11c-48b8ef237413`. L'identità è centralizzata esclusivamente nel server, non dispersa nel client. Riavviare il server conserva l'accesso ai programmi development dello stesso utente.

Il bootstrap legacy è disponibile soltanto con `ALLOW_DEV_AUTH=true` in development/test e configurazione Clerk assente. In production la configurazione richiede Clerk e rifiuta DEV_USER_ID/bypass. CurrentUser deriva dal token verificato e risolve l’UUID interno; servizi e ownership sono invariati. `/health` e `/ready` sono pubblici; tutte le route personali richiedono autenticazione. Vedi [authentication.md](authentication.md).

Tutte le migration, seed e suite Neon eseguite in questo task sono indirizzate esclusivamente a development. Il runner migration e il seed richiedono ora il controllo `NEON_DEVELOPMENT_BRANCH_ID` prima delle scritture. Nessuna connessione a production è stata effettuata. `users.locale` resta text e non viene nuovamente modificato.

## Avvio e variabili

I secret sono iniettati dall'ambiente cloud. Non copiare `DATABASE_URL` nei comandi, nei file pubblici o nei log. `.env.example` elenca anche:

- `EXPO_PUBLIC_API_URL`: unico origin pubblico del client, sostituito da Expo durante il bundle.
- `NEON_DEVELOPMENT_BRANCH_ID`: identificatore non segreto del branch verificato.
- `DEV_USER_ID`: facoltativo, esclusivamente sviluppo/test.
- `API_ALLOWED_ORIGINS`: lista di origin browser separati da virgole; default development `http://localhost:8081,http://localhost:4173`, nessun origin di default in production. I client nativi non richiedono CORS.

Dalla radice del checkout, con `DATABASE_URL` già disponibile:

```sh
export XDG_DATA_HOME=/workspace/.local/share
export XDG_CACHE_HOME=/workspace/.cache
export NEON_DEVELOPMENT_BRANCH_ID=br-purple-math-b1fsq2wb
export EXPO_PUBLIC_API_URL=http://localhost:3001
export NODE_ENV=development
pnpm db:migrate
ALLOW_DEV_SEED=1 pnpm db:seed
pnpm dev:api
# In un secondo terminale con le stesse variabili:
EXPO_OFFLINE=1 EXPO_UNSTABLE_HEADLESS=1 EXPO_NO_TELEMETRY=1 pnpm --filter @jimo/mobile dev --web --localhost
```

Il server API non carica automaticamente `.env`. Per un server compilato locale si può usare `node --env-file=.env apps/api/dist/server.js`; il valore vuoto del secret nell'esempio va sostituito soltanto tramite configurazione locale privata. Il browser in esecuzione sullo stesso computer può usare localhost; per Expo Go serve l'indirizzo LAN raggiungibile del computer che ospita l'API, oppure un endpoint HTTPS accessibile. Un telefono non può raggiungere l'API cloud usando il proprio localhost. Aggiornare `EXPO_PUBLIC_API_URL`, gli origin CORS necessari e riavviare Metro dopo modifiche di configurazione pubblica.

## Migration e traduzioni

`0003_program_management.sql` aggiunge:

- `exercise_translations`: PK/unique `(exercise_id, locale)`, FK `exercises` con CASCADE, name non vuoto massimo 160 caratteri, locale text di lunghezza 2–35, audit timestamptz e trigger `updated_at`.
- `programs_single_active_unique`: indice unico parziale su `user_id` per `status='active'`.
- `exercises_custom_name_unique`: indice unico parziale su proprietario e `lower(trim(canonical_name))` per i custom.

Gli altri campi, enum stabili e policy storico restano invariati. Se ci fossero già duplicati incompatibili con i nuovi indici, la migration fallirebbe atomicamente; non archivia o elimina dati automaticamente.

Il seed development conserva le 12 identità system e aggiunge 24 traduzioni IT/EN. `ON CONFLICT DO NOTHING` mantiene l'idempotenza senza riscrivere dati esistenti. Seconda esecuzione verificata: zero esercizi e zero traduzioni inseriti. I system vengono presentati come `traduzione richiesta → canonical_name`; i custom usano sempre il nome del proprietario. Le lingue nuove richiedono record di traduzione, non copie degli esercizi o enum DB. Pull-Up rimane un'identità unica per bodyweight/weighted/assisted.

## Contratto HTTP

Gli input sono validati con Zod strict, UUID, limiti interi/testuali e decimali. Le risposte hanno contratti JSON verificati anche dal client. Il dettaglio contiene programma, giorni ordinati e prescrizioni con l'esercizio localizzato. Le mutation su giorni/prescrizioni restituiscono il dettaglio aggiornato; le creazioni rispondono 201, le altre operazioni 200. Non viene offerta una DELETE del programma: la UI usa archiviazione.

| Metodo | Endpoint                              | Operazione                                                                                   |
| ------ | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| GET    | `/exercises`                          | System e custom dell'utente, search case-insensitive, trackingMode, limit 1–100, cursor UUID |
| GET    | `/exercises/:id`                      | Singolo esercizio visibile, per editor/picker                                                |
| POST   | `/exercises`                          | Custom con ownership server, name trim 1–160                                                 |
| GET    | `/programs`                           | Lista personale, active prima di draft e archived, poi updatedAt decrescente                 |
| POST   | `/programs`                           | Crea bozza con metadata                                                                      |
| GET    | `/programs/:id`                       | Dettaglio personale completo                                                                 |
| PATCH  | `/programs/:id`                       | Modifica name, description, durationWeeks, startsOn                                          |
| POST   | `/programs/:id/activate`              | Attivazione atomica                                                                          |
| POST   | `/programs/:id/archive`               | Archiviazione                                                                                |
| POST   | `/programs/:id/days`                  | Aggiunge giorno alla fine                                                                    |
| PATCH  | `/program-days/:id`                   | Modifica metadata del giorno                                                                 |
| DELETE | `/program-days/:id`                   | Elimina giorno/esercizi, normalizza ordine                                                   |
| POST   | `/programs/:id/days/reorder`          | `{ ids: [...] }`, permutazione completa dei giorni                                           |
| POST   | `/program-days/:id/exercises`         | Aggiunge prescrizione alla fine                                                              |
| PATCH  | `/program-exercises/:id`              | Aggiorna prescrizione validando il risultato completo                                        |
| DELETE | `/program-exercises/:id`              | Rimuove prescrizione, normalizza ordine                                                      |
| POST   | `/program-days/:id/exercises/reorder` | Permutazione completa degli esercizi del giorno                                              |

`x-jimo-locale: it|en` viene impostato dal client in base alla lingua risolta dell'app, non al nome del programma. Il default è en. Le query cache includono la locale e cambiare lingua aggiorna nomi system. La ricerca considera nome canonico e traduzione della locale richiesta; `%`, `_` e backslash inseriti dall'utente sono trattati come caratteri della ricerca, non wildcard aggiuntive. Il cursor percorre UUID in ordine stabile, senza offset.

Gli errori hanno formato `{ "error": { "code": "...", "message": "..." } }`. Esempi: VALIDATION_ERROR (400), AUTH_REQUIRED (401), PROGRAM_NOT_FOUND/PROGRAM_DAY_NOT_FOUND/PROGRAM_EXERCISE_NOT_FOUND/EXERCISE_NOT_FOUND (404), CONFLICT (409), INTERNAL_ERROR (500). L'ownership estranea viene rappresentata come 404 per non rivelare l'esistenza del record. I driver vengono loggati soltanto con categoria/SQLSTATE; niente query, parametri, stack o URL del database.

## Ownership e lifecycle

Le letture personali sono scoped all'utente del provider. Giorni ed esercizi risalgono al programma padre; un custom exercise deve essere system oppure appartenere allo stesso utente. Gli input non possono cambiare proprietario, parent FK, position o status tramite normali patch. I test A/B provano tutte le route private, compresa attivazione senza effetti sull'active dell'utente A quando il target appartiene a B.

Il ciclo è draft → active → archived; un programma archiviato può essere modificato e riattivato. Archiviare l'active può lasciare l'utente senza programma attivo. Archiviazione e modifiche non riscrivono workout history. La Home mostra soltanto nome e numero giorni dell'active con link al builder; nessuna schedulazione, avvio workout o dati actual.

L'attivazione usa `db.batch`, che nel driver Drizzle Neon HTTP invia un'unica transazione HTTP. Un advisory lock derivato dall'UUID utente serializza activate/archive. L'archiviazione dell'active precedente è condizionata all'esistenza del target appartenente all'utente; segue l'UPDATE del nuovo active. Il partial unique index protegge anche gli accessi esterni all'API. Le attivazioni concorrenti reali sono state verificate: un solo active finale per utente e nessun effetto sull'altro utente. Non viene usata la transaction callback interattiva, non supportata dal driver neon-http.

## Prescrizione e decimali

Una prescrizione sceglie esattamente una forma di target:

- Reps fisse: targetReps, altri target tracking null.
- Range: min e max presenti e ordinati, targetReps/duration null.
- Tempo: targetDurationSeconds positivo, tutti i target reps null.

La compatibilità è validata usando il tracking dell'esercizio letto dal server, non un valore libero nel body. Bodyweight non ha kg; weighted usa peso aggiunto; external usa carico esterno; assisted usa assistenza. I kg possono essere null quando non specificati. Rest è opzionale, 0–86400 secondi; note massimo 2000 caratteri; serie 1–100. RPE opzionale da 1 a 10 con incrementi di 0.5 nel Program Management.

Kg restano numeric(9,2), RPE numeric(3,1), JSON/TypeScript stringhe canoniche. Gli helper accettano la virgola italiana e producono `"22.50"`, `"1.25"`, `"8.0"`. Gli step kg 2.50 e RPE 0.5 usano interi BigInt alla scala richiesta, non addizioni floating point. L'input manuale non è arrotondato per adattarlo allo step. I valori oltre precisione/scala o RPE non valido vengono rifiutati; nessuna conversione Number/parseFloat dei kg DB.

Per una patch prescrizione il server unisce campi forniti e valori correnti, valida l'oggetto completo e usa la revisione MVCC `xmin` nel WHERE dell'UPDATE. Se un altro aggiornamento ha modificato il record nel frattempo risponde 409, preservando l'input locale; non valida un mix obsoleto e poi lo salva senza controllo.

## Ordine e consistenza

Position è 0..N-1 per giorni ed esercizi. Gli INSERT appendono sotto lock del programma padre. Reorder richiede UUID distinti e la permutazione completa dei membri correnti; anche una lista vuota è respinta se ci sono membri. La validazione della membership avviene nel batch transazionale, sotto lock.

Per mantenere gli indici unici esistenti, il batch sposta temporaneamente le posizioni nel segmento +1,000,000, poi le riscrive dense nell'ordine richiesto. DELETE usa lo stesso lock e normalizza tramite row_number. Gli stati intermedi non vengono committati o restituiti. L'API limita ciascun gruppo a 1000 membri: le posizioni create dall'API non si sovrappongono al segmento temporaneo. Eventuali import futuri o scritture esterne devono rispettare questo dominio e acquisire gli stessi lock.

## Mobile

TanStack Query possiede lista programmi, dettaglio, catalogo paginato, custom e mutation. I dati personali non vengono copiati in Zustand. I form mantengono soltanto bozze locali; il salvataggio esplicito e le invalidazioni aggiornano il server state. Le mutation non fanno retry automatico, le query ritentano al massimo una volta gli errori di rete. I submit critici hanno blocco immediato tramite ref oltre al busy state React, per evitare doppio submit.

Il client centrale usa `EXPO_PUBLIC_API_URL`, timeout 12 secondi, abort/cancellazione, parsing JSON e Zod, error code e status HTTP. Il risultato di una mutation fallita non cancella la bozza. Non esiste fallback SQLite o una finta persistenza locale del programma.

Schermate: lista/empty state Programma; selezione metodo con AI/import in arrivo; metadata manuali; builder; metadata edit; giorno create/edit; picker con debounce 300 ms e load more; custom create; editor fixed/range/time con carico, RPE, rest e note. Controlli su/giù sostituiscono drag & drop. Modal tradotte confermano giorno non vuoto, rimozione esercizio e archiviazione active. I controlli usano token/componenti JIMO, touch target almeno 48 px, label accessibili, errori testuali, safe area e nessuna animazione aggiuntiva non rispettosa di reduced motion.

## Test e verifica

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm db:generate
pnpm db:check
pnpm test:db
pnpm test:api:db
EXPO_PUBLIC_AUTH_TEST=true EXPO_PUBLIC_API_URL=http://localhost:4301 pnpm build
CHROMIUM_PATH=/usr/bin/chromium pnpm --filter @jimo/mobile test:ui
pnpm format:check
```

Per gli ultimi test Neon/E2E esportare prima `NEON_DEVELOPMENT_BRANCH_ID` come sopra. Le suite DB/API marcano skipped se manca DATABASE_URL; l'E2E manuale viene saltato senza secret e non equivale alla verifica Neon. In questa verifica il secret è disponibile e vengono eseguite realmente.

La suite API crea due utenti UUID isolati, esercizi custom e programmi, compreso l'esempio Upper 4 giorni con Push/Pull, panca/dip/trazioni/rematore, poi cleanup per ID/ownership esatta in finally. Copre CRUD, traduzioni, pagination/search, validazione, custom isolation, tutti i percorsi ownership, posizioni, attivazione concorrente e indice unique. La suite database precedente continua a verificare gli snapshot storici.

Playwright avvia un'API separata sulla porta 4301 con un ulteriore utente test UUID e CORS per il sito statico 4173. Il test manuale non usa mock del programma: salva su Neon, riapre con reload, modifica carico, attiva, verifica Home, archivia con conferma e crea/aggiunge Push-Up Deficit. Il global teardown attende una pulizia esplicita dei soli dati dell'utente E2E prima di terminare il processo. La route `/__e2e/cleanup` esiste soltanto nel harness test su loopback, dopo il controllo del branch development; non è registrata nell'app API ordinaria. Gli E2E della shell usano invece la sola risposta lista vuota per mantenere deterministica la regressione onboarding e lingua. Non si usano credenziali production.

Prima di ripetere E2E con un'altra porta API, impostare E2E_API_PORT e ricostruire con EXPO_PUBLIC_API_URL coerente. Il bundle usato dai test punta alla porta 4301; per sviluppo ordinario ricostruire/riavviare Metro con l'URL development desiderato. Le build Android/iOS sono export JavaScript/Hermes, non APK/IPA firmati.

Restano da verificare su telefono reale tastiera decimale, VoiceOver/TalkBack, scaling testo, safe area e connettività dell'origin API da Expo Go/development build. Non sono implementati workout execution, actual, timer, statistiche, AI, import, production auth, notifiche, pagamenti o sync offline. Task 5 non iniziato.

Verifica eseguita il 2026-10-06: lint, typecheck, 30 test unitari, build Android/iOS/web e format check passati; 12 test runner API e 11 test runner database su Neon HTTP development passati senza skip; 3 E2E Chromium passati. `/health` e `/ready` restituiscono 200 anche dal server compilato. Rigenerazione Drizzle senza differenze e migration runner ripetuto con `applied: 0, total: 4`. Il seed ripetuto inserisce zero record. Controllo finale: 12 esercizi system, 24 traduzioni IT/EN, zero duplicati, nessun utente con più active e zero record utente isolati residui. Scansione dei file repository, log e bundle senza credenziali; nessun driver Neon nel bundle mobile. Production non contattata.
