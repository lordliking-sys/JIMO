# Task 5 — Workout Engine

> Questo documento descrive la consegna storica del Task 5. Dal Task 6 il mobile usa SQLite come sorgente operativa e sync in background; i flussi di salvataggio server descritti qui restano disponibili tramite le route online. Vedi [offline-sync.md](offline-sync.md).

## Ambito e contratto

Il runtime rimane Fastify + Neon HTTP (`@neondatabase/serverless` / Drizzle neon-http). Non usa TCP, TLS disabilitato, database float, offline queue, SQLite, AI, push o statistiche avanzate. Gli schemi DTO/actual in `@jimo/schemas` sono mobile-safe: nessun driver o secret nel bundle mobile. L'identità proviene esclusivamente da CurrentUser; il provider development esistente verifica il branch Neon, mentre production resta senza fallback di identità development.

| Endpoint                        | Semantica                                                                   |
| ------------------------------- | --------------------------------------------------------------------------- |
| POST /workouts/start            | `{programDayId}`; snapshot atomico; 201                                     |
| GET /workouts/active            | `{workout: detail oppure null}`; 200                                        |
| GET /workouts/:id               | Detail ordinato e scoped                                                    |
| GET /workouts                   | Ultime sessioni completed/cancelled, limit 1–100, since/until ISO opzionali |
| POST /workout-sets/:id/complete | Actual completo; pending → completed, server timestamp                      |
| PATCH /workout-sets/:id         | Correzione actual completed; timestamp originale                            |
| POST /workout-sets/:id/skip     | Pending → skipped, actual null                                              |
| POST /workouts/:id/complete     | Finish; `{skipPending:true}` solo dopo conferma client                      |
| POST /workouts/:id/cancel       | Conserva sessione cancelled e salta pending                                 |

Le richieste mutation sono strict: non accettano userId, target, status o completedAt arbitrari. Ownership è verificata su ogni lettura/mutazione e nuovamente nelle condizioni SQL di scrittura. Risorse estranee e inesistenti restituiscono lo stesso 404. Il conflitto di start è 409 `ACTIVE_WORKOUT_EXISTS`, con il solo sessionId della sessione appartenente a CurrentUser. Il mobile propone Riprendi allenamento. I messaggi del driver, query e credenziali non vengono restituiti né registrati.

## Migration e transazioni HTTP

`0004_single_active_workout.sql`, con snapshot e journal Drizzle, aggiunge soltanto `workout_sessions_single_active_unique`: indice unique parziale su user_id con status in_progress. Nessuna colonna target/actual cambiata. Prima dell'applicazione sono stati verificati il branch `br-purple-math-b1fsq2wb` (development confermato dall'utente) e l'assenza di gruppi duplicati. Il runner migration HTTP versionato esistente ha applicato 1 migration, totale 5. Production non è stata contattata.

Neon HTTP non permette transazioni interattive. Start usa `sqlClient.transaction`: prima lock advisory per utente (namespace 5), poi una sola query SQL con CTE source materialized → session → exercise snapshot → generate_series dei set. Tutti gli insert fanno parte della stessa transazione; un errore annulla l'intero snapshot. Source legge insieme programma active, giornata, prescrizioni ed esercizi visibili. Il nome custom viene copiato; per gli esercizi standard si copia il nome localizzato alla partenza. Posizione, tracking/load mode, recupero, note e tutti i target vengono copiati; actual e completedAt iniziano null, status pending.

Gli snapshot non vengono riletti dal programma durante il workout. Modifiche a prescrizione/nome sorgente non cambiano sessioni in corso o storiche. GET ordina exercise.position e set.setNumber. Finish, cancel, check, skip e correzione condividono lo stesso lock per utente e condizioni di stato nella transazione; l'indice è una protezione aggiuntiva sul database. Un doppio POST check riconosce il primo risultato senza sovrascriverlo o riavviare il recupero; un doppio finish/cancel conserva il timestamp originale. Una correzione usa PATCH esplicito. Modifiche concorrenti diverse dello stesso actual seguono l'ultimo PATCH confermato dal server.

## Actual e prefill

Ogni pending set inizializza un draft in memoria dal proprio target; non effettua scritture. Reps a range iniziano dal minimo prescritto e la UI mostra il range completo. Dopo il recupero il prossimo draft riparte dal proprio snapshot, non dall'actual precedente. Un completed set apre la correzione precompilata dal suo actual.

Il check richiede actualReps per tracking reps oppure actualDurationSeconds per duration; il campo incompatibile deve essere null. Bodyweight non presenta kg; weighted usa peso aggiunto con `+`, external carico, assisted solo Assistenza. Per weighted/external serve actualLoadKg; per assisted serve actualAssistanceKg. Se il vecchio programma non prescrive kg, la UI mostra un valore non impostato e richiede di inserirlo prima del check. RPE è opzionale, 1–10 a step 0,5, con Nessun RPE e chip 7–10. I numeri si modificano tramite stepper/preset o input inline esplicito; kg/RPE usano gli helper decimali esatti e stringhe canoniche a 2/1 cifre.

Il server salva actual e completedAt solo al check riuscito. Se il salvataggio fallisce, non parte il recupero: il draft resta nella schermata e può essere ritentato. Se il server aveva salvato ma la risposta si perde, il retry idempotente riconosce il salvataggio originale. Uscire dalla schermata prima di salvare non persiste il draft: nessun sistema offline viene introdotto.

## Recupero e progressione

Il timer deriva da `completedAt + restSecondsSnapshot`, con remaining calcolato a ogni render da timestamp reali. L'intervallo aggiorna la visualizzazione; non decrementa un contatore come fonte di verità. AppState active ricalcola l'orologio e ricarica la sessione. GET active/detail recuperano l'ultimo completed set per ricostruire il recupero dopo reload o riavvio. L'orologio del dispositivo deve essere corretto; non vengono aggiunti sincronizzazione temporale o notifiche background.

Fra le serie dello stesso esercizio parte automaticamente il recupero dopo conferma server. La vista dedicata mostra countdown, prossimo target e Salta recupero, senza bottom sheet. Il countdown adatta la dimensione alla larghezza e al font scale del dispositivo, mantenendo cifre grandi senza overflow. La scelta di saltare è memorizzata in AsyncStorage con il solo ID dell'ultimo set, per conservarla dopo riapertura; non è una coda di salvataggio actual né un timer separato nel DB. Se questo piccolo salvataggio locale fallisce, la scelta resta efficace durante la schermata corrente.

Dopo l'ultima serie risolta di un esercizio non parte un recupero lungo: la UI mostra Esercizio completato → prossimo nome → Continua. Dopo riapertura si accede direttamente al prossimo pending. Dopo l'ultimo set viene mostrato il riepilogo e Termina allenamento. Finish anticipato richiede conferma e, se accettato, salta i pending e completa la sessione atomicamente. Cancel richiede conferma forte, mantiene lo storico cancelled e non elimina righe. Skip resta una mutazione secondaria; non cancella il set e non scrive actual.

`expo-haptics` ~57.0.3 è la versione compatibile con Expo 57 / Expo Go. Feedback dopo check riuscito e fine recupero foreground; il funzionamento non dipende dagli haptic. Sono disabilitati sul web e quando reduced motion è attivo. Nessun audio o push aggiunto.

## Home, tab e storico

La Home mostra una striscia Lun–Dom con target almeno 48 px: sui telefoni stretti si scorre orizzontalmente, senza sette grandi card. Giorni programmati, oggi e completamento hanno anche label accessibili e simboli, oltre al colore. Il check indica il giorno locale in cui una sessione completed del programma è stata iniziata nella settimana corrente; cancelled non produce check. Le sessioni mantengono il proprio nome anche se il programma viene cambiato.

Il workout in corso domina Home con Riprendi. Altrimenti un giorno assegnato a oggi mostra nome, esercizi e Inizia; più giornate dello stesso weekday rimangono tutte disponibili. Se nessun dayOfWeek è assegnato, Home propone Scegli allenamento senza inventare una rotazione. Un giorno di riposo permette comunque di scegliere dal programma. Workout tab offre i giorni active o la ripresa; Builder permette Start solo quando active e il giorno contiene esercizi. I programmi draft non possono iniziare nemmeno via API.

Progressi mostra solo uno storico basilare bounded agli ultimi 100 record: data, nome, durata, status, riepilogo read-only con target e actual distinti quando differiscono. Nessun grafico, PR o volume analytics. La navigazione mantiene cinque tab accessibili senza wrapping/clipping. Tutte le nuove stringhe sono IT/EN; i form mantengono safe area, KeyboardAvoidingView, scroll al campo e CTA nel footer.

## Verifica e ripetizione

Le prove pure/build non necessitano di secret. Per il browser esportare con `EXPO_PUBLIC_API_URL=http://localhost:4301` e attendere la fine del build. Questa origin serve esclusivamente al browser di test. Expo Go sul telefono continua a richiedere l'IP LAN o un endpoint pubblico, per esempio `http://192.168.1.138:3001`, mai localhost del telefono. DATABASE_URL resta solo nell'API.

```sh
env -u DATABASE_URL -u NEON_DEVELOPMENT_BRANCH_ID pnpm lint
env -u DATABASE_URL -u NEON_DEVELOPMENT_BRANCH_ID pnpm typecheck
env -u DATABASE_URL -u NEON_DEVELOPMENT_BRANCH_ID pnpm test
env -u DATABASE_URL -u NEON_DEVELOPMENT_BRANCH_ID EXPO_PUBLIC_API_URL=http://localhost:4301 pnpm build
env -u DATABASE_URL -u NEON_DEVELOPMENT_BRANCH_ID CHROMIUM_PATH=/usr/bin/chromium pnpm --filter @jimo/mobile test:ui
pnpm test:api:db
pnpm test:db
CHROMIUM_PATH=/usr/bin/chromium pnpm --filter @jimo/mobile test:ui
env -u DATABASE_URL -u NEON_DEVELOPMENT_BRANCH_ID pnpm format:check
```

Le ultime tre prove live richiedono DATABASE_URL server e NEON_DEVELOPMENT_BRANCH_ID impostati privatamente e verificano il branch prima di ogni inserimento. Usano UUID di utenti isolati; cleanup elimina nell'ordine workout, programmi, esercizi custom e utenti. Il server E2E vive solo in test su loopback e offre un cleanup nel proprio harness; nessuna route di cleanup nel runtime normale.

I test includono snapshot 3×8/+20/RPE8/rest180 invariato dopo modifica a 3×10/+25/RPE9/rest120 e cambio del nome, nonché target 8/80/8 e actual 7/82.50/9.0 letto realmente nel DB. Le prove concorrenti verificano start, check e finish; quelle ownership tentano tutte le route da un secondo utente. Le prove UI coprono retry con draft preservato, rest/reload/skip persistente, correzione actual, transizione esercizi, tutti i load mode, duration, Home week, conferme e storico; una prova separata attraversa UI e API Neon reale.

Restano da verificare su Android/iPhone: haptic fisici, IME/tastiere OEM, lock/background con recupero in corso, safe area, scaling font alto, VoiceOver/TalkBack e sequenza dei modal iOS. I test Chromium con viewport ridotto non sostituiscono una tastiera nativa. Gli export Android/iOS/web sono bundle Expo, non APK/IPA firmati. Il Task 6 aggiunge successivamente SQLite e sync: [offline-sync.md](offline-sync.md).

## Risultati del 6 ottobre 2026

- `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm format:check`: passati; 48 test unitari (30 mobile, 8 schemas, 5 API, 5 database).
- `pnpm build`: export Android/iOS/web e compilazione API/package riusciti.
- `pnpm test:api:db`: 22 test su Neon development, inclusi i 10 casi del nuovo Workout Engine e le regressioni Program Management.
- `pnpm test:db`: 11 test di integrazione passati, con cleanup.
- Playwright con API development isolata: 14 test browser passati, nessuno saltato. Inclusi E2E reale workout e Program Management, regressioni della shell e prove fixture IT/EN. Test della settimana: tutti e sette i target da almeno 48 px visibili a 390 px; recupero e workout senza overflow a 320/390/430 px.
- `/health`: HTTP 200, status ok. `/ready`: HTTP 200, status ready, database ok, verificati via HTTP durante il server E2E.
- `pnpm db:check`: metadata/ledger e schema live coerenti, 9 tabelle, 6 enum, 27 indici, 118 constraint, 5 migration, 9 trigger audit; numeric e UUID default corretti.
- Scansione dei 115 file dell'export mobile: nessun file contiene la DATABASE_URL privata completa. Nessun file ambiente modificato.
- Migration applicata solo al development verificato; nessun seed o contatto con production. Nessun commit/push automatico eseguito per questo task.
