# Task 6 — Offline workout e sincronizzazione

SQLite è la sorgente operativa immediata dei workout. Neon è la persistenza server.
Il Program Builder rimane online. Questo documento descrive il Task 6; il Task 7 è ora documentato in [Progress Analytics](progress-analytics.md). Auth production e AI
non sono inclusi.

## Percorso dei dati

```text
CHECK / modifica / salto / fine / annullamento
  → transazione SQLite (stato + operation outbox)
  → conferma locale e aggiornamento UI / timer
  → SyncEngine in background
  → POST /sync/workout-operations
  → transazione Neon HTTP (mutazione + ricevuta)
```

Un errore Internet non annulla un CHECK già salvato. Un errore SQLite invece fa
rollback, conserva il draft nella schermata e mostra «Impossibile salvare la serie
sul dispositivo». Il timer non parte per un salvataggio fallito.

## SQLite e repository

Database `jimo-workouts.db`, aperto con `expo-sqlite`. Migration locale
`apps/mobile/src/db/migrations/0001_offline_workouts.ts`, versione
`PRAGMA user_version = 1`. Il bootstrap abilita foreign key e busy timeout,
applica solo migration mancanti nella stessa transazione e recupera operation
`syncing` interrotte riportandole a `pending`. Una versione sconosciuta interrompe
l'apertura con un errore leggibile: nessun reset o DROP automatico.

| Tabella                    | Contenuto                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `cached_programs`          | Programma active completo, status e DTO validato                                      |
| `cached_program_days`      | Giorni, weekday e relazione al programma                                              |
| `cached_program_exercises` | Prescrizioni e nomi/mode degli esercizi                                               |
| `local_workout_sessions`   | UUID, status, timestamp e riepilogo                                                   |
| `local_workout_exercises`  | Snapshot immutabile, posizione e relazione alla sessione                              |
| `local_workout_sets`       | Target e actual distinti, numero/status/completedAt                                   |
| `sync_outbox`              | Operation UUID, session/entity/type, sequence, payload, tentativi/error/status        |
| `sync_metadata`            | Identità verificata, sequence, ultimo sync, recupero saltato, cache storico/conflitto |

Tutti i dati sono scoped a `owner_user_id`. UUID e timestamp ISO UTC sono TEXT.
Kg e RPE sono TEXT canonico (`82.50`, `20.00`, `8.0`, `8.5`), mai REAL.
Le colonne decimali esplicite consentono ispezione SQL; i payload JSON contengono
DTO Zod validati e mantengono tutti i campi senza conversioni floating point.
Le foreign key composite impediscono relazioni tra dati di utenti diversi.
Sessione → esercizi → serie usa cascade; la outbox impedisce di eliminare una
sessione con operation ancora presenti. Il refresh del programma non elimina
workout o storico.

`LocalDatabase` serializza tutte le letture/scritture sul collegamento e usa
BEGIN IMMEDIATE/COMMIT/ROLLBACK. Questo evita che operazioni concorrenti entrino
inavvertitamente nella transazione Expo di un'altra azione; funziona anche nel
backend web, che non supporta withExclusiveTransactionAsync.

Responsabilità:

- `WorkoutLocalRepository`: lettura/restore, snapshot, actual, skip, finish/cancel,
  scritture atomiche, download protetto da pending changes.
- `ProgramCacheRepository`: programma active e struttura completa necessaria allo
  start offline; nessuna scrittura offline nel Builder.
- `SyncOutboxRepository`: FIFO, batch max 50, tentativi, ACK e compattazione sicura.
- `SyncEngine`: istanza singola, mutex, trigger, retry e riconciliazione.
- `OfflineRuntime`: identità, coordinamento API/cache/repository.
- `OfflineProvider`: apertura locale, NetInfo, foreground e aggiornamenti query.

## Cache e start offline

All'avvio si apre SQLite e si legge l'ultima identità verificata, senza aspettare
Neon. La schermata operativa legge subito il workout locale. In background il
runtime verifica `/sync/identity`, sincronizza la outbox e aggiorna programma,
workout active e storico recente. Il refresh viene richiesto anche da Home,
modifiche/attivazione del programma, cambio lingua, foreground e ritorno rete.
Una cache valida resta utilizzabile durante il refresh.

Lo start offline richiede un giorno non vuoto nel programma active già cached.
Senza cache compare «Connettiti almeno una volta per sincronizzare il programma».
Per uno start online con cache ancora assente è ammesso il download preliminare;
la creazione operativa passa comunque da SQLite/outbox.

`expo-crypto.randomUUID()` genera session/exercise/set/operation IDs. Gli stessi
UUID sono inseriti su Neon: nessun mapping locale/server. Il payload START copia
nome, identità e source reference, tracking/load mode, rest, note, posizione e
target di ogni serie. Le modifiche successive alla scheda non cambiano lo
snapshot. Il server convalida la struttura e le referenze/ownership ma non
rigenera target dalla scheda corrente.

## Outbox e protocollo

Operation: START_WORKOUT, COMPLETE_SET, UPDATE_SET, SKIP_SET,
COMPLETE_WORKOUT, CANCEL_WORKOUT. Una sequenza monotona per sessione è salvata
insieme alla modifica locale. Le sessioni sono elaborate nell’ordine della prima operation ancora accodata
(rowid SQLite, senza dipendere dall’orologio); dentro ogni sessione vale sequence.
Così finish/cancel del workout precedente precede lo start del successivo e non
crea falsi conflitti sul vincolo single-active. Le operation restano ordinate e non vengono
compattate prima dell'ACK. Gli ACK eliminano solo operation inviate e riconosciute;
la sequence rimane nei metadata. Un ACK che salta una operation precedente viene
rifiutato. Operation non riconosciute tornano pending. Una failed/conflict blocca
le operation successive della stessa sessione, senza cancellarle.

```json
{
  "expectedUserId": "UUID già verificato tramite CurrentUser",
  "operations": [
    {
      "operationId": "UUID",
      "sessionId": "UUID",
      "entityId": "UUID",
      "sequence": 2,
      "createdAt": "2026-10-06T10:00:00.000Z",
      "operationType": "COMPLETE_SET",
      "payload": {
        "actualReps": 7,
        "actualDurationSeconds": null,
        "actualLoadKg": "82.50",
        "actualAssistanceKg": null,
        "actualRpe": "9.0"
      }
    }
  ]
}
```

`POST /sync/workout-operations` richiede CurrentUser, max 50 operation e body max
1 MiB. Input strict: userId/ownerUserId e campi target nelle operation actual sono
rifiutati. expectedUserId serve solo a verificare che l'account non sia cambiato;
non autorizza né sceglie l'identità.

Risposta: `acknowledged: UUID[]`, `failed: { operationId, sessionId,
status: failed | conflict | retry, code }[]`. Gli errori non includono messaggi
PostgreSQL, query, stack o credenziali. Un fallimento interrompe quella sessione;
altre sessioni nel batch possono procedere. Ogni operation usa una transazione
separata: se la risposta si perde dopo 5 operation su 10, ritentare tutte e 10 è
sicuro.

## Server e idempotenza

Migration Drizzle **0005_workout_sync.sql**, applicata esclusivamente a Neon
**development**, branch `br-purple-math-b1fsq2wb` verificato prima della scrittura.
Aggiunge solo `sync_operations`: operation/user/session/entity IDs, type,
sequence, processedAt e hash SHA-256 del contenuto normalizzato. Non conserva il
payload completo. Unique `(user_id, operation_id)` e
`(user_id, session_id, sequence)`; FK alla sessione con cascade per cleanup dei
dati isolati. Gli altri enum/schema del dominio restano invariati.

Ogni mutazione e ricevuta sono nella stessa transazione Neon HTTP, protetta dal
lock per utente usato anche dalle route online. SQL è parametrizzato. La gate
rifiuta sequence fuori ordine e deduplica prima di mutare. Stessa operation/stesso
hash → ACK; stesso UUID/contenuto diverso → conflitto. Rollback preserva anche
l'assenza della ricevuta. Le route online e il sync riusano i writer/predicati di
complete/edit/skip/finish/cancel e la validazione `actualFor` del snapshot.

START verifica programma active/day appartenenti a CurrentUser, esercizi visibili
all'utente, source prescription coerente con day/exercise quando presente,
tracking mode, struttura e collisioni di UUID. Il partial unique index del Task 5
continua a garantire un solo active server. Un source eliminato o un programma
non più active può quindi provocare conflitto: i dati offline rimangono conservati.

La risposta workout include `syncSequence`; il download inizializza la sequence
locale dal server, così un workout già sincronizzato può essere continuato da un
nuovo dispositivo senza ripartire da 1.

## Timestamp e timer

Timestamp accettati: ISO UTC valido, data dal 1970 in avanti e non oltre 5 minuti
nel futuro rispetto al server. Nessuna scadenza breve: un allenamento offline di
ore/giorni prima è accettabile. Eventi di set/fine non possono precedere lo start;
la correzione non precede il completedAt originale; la fine non precede serie già
completate. Un clock sbagliato produce un errore sicuro senza perdita locale;
non correggiamo silenziosamente l'orario del workout. Non implementiamo un
sistema di sincronizzazione degli orologi.

startedAt, completedAt delle serie e completedAt finale vengono dal dispositivo.
Una correzione preserva completedAt della serie. Rest è derivato localmente da
completedAt + restSecondsSnapshot: intervallo grafico e background/restart non
spostano la scadenza. Il marker «recupero saltato» è metadata SQLite scoped al
workout/utente, non AsyncStorage. Non parte un recupero dopo l'ultima serie di un
esercizio, come nel Task 5.

## Retry, stato e riconciliazione

NetInfo segnala disponibilità di rete, non raggiungibilità dell'API. Il batch
sync ha un timeout di 60 secondi (le richieste comuni restano a 12 secondi): le
transazioni Neon HTTP per molte operation non devono causare abort prematuri.
Questa attesa avviene solo nel worker e non blocca le azioni SQLite/UI. Timeout,
DNS/rete, 5xx, 408 e 429 usano backoff 2s → 5s → 15s → 30s (cap 30s).
Ritorno rete, foreground e Retry azzerano l'attesa. Il worker non si sovrappone a
sé stesso; nuove richieste vengono coalesced. 400/403 e invalid snapshot diventano
failed, 409/conflict bloccano la sessione: nessun retry automatico infinito.
Retry esplicito riprova coda retryable e refresh; non scarta né forza una operation
permanentemente rifiutata. La risoluzione manuale dei conflitti è futura.

Indicatore discreto IT/EN solo sulla schermata attiva: Offline / Salvato sul
dispositivo, Sincronizzazione, errore con Retry oppure conflitto. Nessun grande
banner, conferma offline o cambio generale di design. CHECK dipende dalla
transazione locale; haptics, safe area, touch target, dark theme e reduced motion
restano quelli del Task 5.

- Local active + stesso server active: upload prima, download solo se la sessione
  non ha operation pending/failed/conflict. Il merge è conservativo per sessione;
  non sovrascriviamo singoli actual mentre la coda è ancora aperta.
- Local none + server active: persistenza SQLite prima dell'uso offline.
- Local active pending + server none: upload locale, nessuna cancellazione.
- Local active A + server active B: conflict metadata; A resta intatto, B non viene
  importato sopra A. Il messaggio chiede di risolvere il conflitto.
- Local active senza coda + server none: fetch dello stesso ID per riconoscere una
  chiusura su altro device; un 404 conserva il locale come conflitto.

TanStack Query coordina letture/invalidation. Le chiavi operative sono
`local / owner / ...` e leggono repository SQLite con networkMode always.
Le query del Builder restano server state. Nessuna cache server concorrente
modifica direttamente actual o stato operativo.

Storico: sessioni locali chiuse + ultimi 100 riepiloghi server cached, con download
limitato a 5 dettagli recenti mancanti. I dettagli locali già presenti non sono
eliminati. Home ricostruisce settimana e completed days anche dalla storia locale.

## Identità, upgrade e limiti

Task 8 ora richiede una sessione Clerk per risolvere CurrentUser sul server. La prima configurazione account/cache richiede rete; restart offline usa solo il profilo SQLite indicizzato dal subject ripristinato dall’SDK, mai il semplice ultimo UUID dispositivo. Logout/account switch non eliminano workout o outbox: B vede solo B e A può riprendere i propri dati. Il vecchio DEV_USER_ID è esclusivamente un bypass server development esplicitamente abilitato e separato dagli account Clerk. Nessuna API si autentica tramite UUID locale. Vedi [authentication.md](authentication.md) per 401/auth_required, storage e verifiche native.

Non cancelliamo SQLite per API error, identity mismatch, 401 o schema mismatch. La protezione completa dei dati workout a riposo e la cancellazione account coordinata restano requisiti release; i token native sono già in SecureStore.

Concorrenza multi-device: sequence concorrenti e active diversi diventano conflitti
sicuri. Non c'è un resolver che sceglie un device o sovrascrive in silenzio.
Non sono implementati pruning dello storico locale o retention delle ricevute:
la outbox acknowledged viene compattata, le ricevute server restano per replay
sicuri; una retention futura richiederà un protocollo esplicito.

Web usa il vero backend WASM/OPFS di expo-sqlite. Richiede browser compatibile,
secure context (HTTPS o localhost), SharedArrayBuffer e header COOP/COEP. Metro
e il server test hanno questi header; un hosting web deve configurarli. Nessun
fallback a workout in AsyncStorage o memoria. Una chiusura/reload web viene
testata con API irraggiungibile ma asset dell'app disponibili: senza service worker
un browser non può ricaricare anche il bundle completamente offline. Su native
SQLite è indipendente da HTTP; in Expo Go la disponibilità del bundle dev/Metro
può limitare l'avvio offline dopo kill. Non dichiariamo questo comportamento
nativo verificato senza un telefono.

## Verifica e riproduzione

Dalla root, con Node 24 e pnpm del packageManager:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
pnpm test:api:db
pnpm test:db
pnpm db:check
pnpm --filter @jimo/mobile test:ui
```

Per integration impostare DATABASE_URL solo lato server e
NEON_DEVELOPMENT_BRANCH_ID al branch development verificato. I test usano UUID
isolati, verificano il branch prima di scrivere e puliscono sessioni/ricevute,
programmi, esercizi custom e utenti. Non eseguire seed per questi test.
L'export mobile deve ricevere solo EXPO_PUBLIC_API_URL, mai DATABASE_URL.

I test repository usano SQLite reale (`node:sqlite`) e la stessa migration e SQL
usati da Expo; simulano failure mediante trigger SQLite e chiusura/riapertura del
file. I test API collegano questi repository a Neon development. I test web usano
expo-sqlite reale in Chromium, con API intercept oppure server development reale.
Non sono prove del comportamento nativo di iOS/Android.

## Checklist telefono reale (Expo Go)

1. Avvia API con Neon development, build dei package condivisi e guard del branch.
   Sul PC Windows già configurato usare `pnpm.cmd exec turbo run build --filter=@jimo/api`
   e `pnpm.cmd dev:api` nel primo terminale, con DATABASE_URL development già
   configurata solo lì e `$env:NEON_DEVELOPMENT_BRANCH_ID="br-purple-math-b1fsq2wb"`.
   Verifica `/health` e `/ready` dal telefono.
2. Nel secondo terminale puoi impostare
   `$env:EXPO_PUBLIC_API_URL="http://192.168.1.138:3001"`, oppure usare il file mobile
   `.env.local`. EXPO_PUBLIC_API_URL deve usare l'endpoint raggiungibile
   dal telefono, ad esempio `http://192.168.1.138:3001` se quello è ancora IP/porta
   del PC. Mai localhost sul telefono. Nessuna credenziale Neon nel mobile.
3. Secondo terminale: `pnpm.cmd --filter @jimo/mobile exec expo start --lan --clear`.
   PC e telefono sulla stessa Wi-Fi, API esposta su 0.0.0.0 e firewall configurato.
   Tunnel Expo trasporta il bundle, non rende automaticamente pubblica l'API.
4. Apri il QR in Expo Go compatibile con l'SDK del progetto. Apri Home/Workout e
   attendi la prima cache del programma active; inizia online.
5. Attiva modalità aereo. Esegui 7 reps, 82.50 kg e RPE 9 su target 8 / 80 / 8;
   premi CHECK: ✓ e recupero devono apparire senza attesa Internet.
6. Completa anche la seconda serie, chiudi completamente l'app e riaprila offline.
   Se Expo Go richiede Metro per il bundle, riapri prima il progetto cached e annota
   il limite: la prova di cold start nativo richiederà un dev build/standalone futuro.
7. Verifica workout, due serie completed, prossimo target e recupero ricostruito.
   Modifica una serie completed: l'orario originale del recupero non deve cambiare.
8. Termina offline; riapri e verifica che rimanga completed nello storico locale.
   Ripeti su un altro workout con annullamento offline.
9. Disattiva modalità aereo; attendi sync o premi Retry per errori temporanei.
   Nessun indicatore significa rete disponibile e nessuna operation pendente/errore.
   Verifica lato API il workout e gli actual, senza mostrare DATABASE_URL.
10. Prova anche start completamente offline dopo cache, kill/reopen e riconnessione.
    Per conflitto con active su altro client verifica messaggio e conservazione locale;
    non cancellare dati per risolverlo. Controlla VoiceOver/TalkBack, font grandi,
    tastiera, safe area e reduced motion su iOS/Android.

## Risultati verificati — 6 ottobre 2026

- `pnpm lint`: PASS, zero warning applicativi.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS, 64 test (44 mobile, 10 schemas, 5 API, 5 database).
- `pnpm build`: PASS, API/package e export Android, iOS e web.
- `pnpm format:check`: PASS.
- `pnpm test:api:db`: PASS, 30 test reali Neon development, inclusi replay di
  10 operation/risposta persa dopo 5, UUID cross-user, snapshot e timestamp.
- `pnpm test:db`: PASS, 11 test reali Neon development.
- `pnpm db:check`: PASS, 10 tabelle, 6 enum stabili, 30 indici, 130 constraint,
  6 migration e 9 trigger audit esistenti.
- Playwright: PASS, 15 test, nessuno skipped; SQLite web reale/OPFS e due
  flussi con API/Neon development reali. La suite completa è stata eseguita
  dopo l'export, con gli asset stabili.
- `/health` e `/ready`: HTTP 200; readiness database `ok`.
- Export mobile: 117 file controllati, zero occorrenze della DATABASE_URL reale.
- Nessun seed, contatto production, commit/push, APK/IPA o Task 7.

Resta da eseguire la checklist su telefono: non sono state effettuate prove
fisiche Android/iOS, né un cold start offline nativo attraverso Expo Go.

Aggiornamento Task 7: SQLite user_version2 aggiunge soltanto progress_cache tramite 0002_progress_cache, senza modificare workflow workout/outbox. Analytics sono server-derived, ultimo aggiornamento offline e invalidazione dopo ACK; vedi [Progress Analytics](progress-analytics.md). I risultati e il limite Task 7 riportati sopra descrivono la verifica storica del Task 6.

Task 8: see [Authentication and account identity](authentication.md) for Clerk → CurrentUser → internal UUID, versioned Neon identity migration, profile preferences and account-scoped offline/401 behavior.
