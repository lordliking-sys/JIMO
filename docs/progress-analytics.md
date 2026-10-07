# Task 7 — Progressi, statistiche e record personali

## Source of truth e API

Le statistiche sono calcolate dal server su PostgreSQL via Neon HTTP. La source of truth è lo storico workout actual. Nessuna tabella analytics, stats o PR, nessuna AI, e1RM, body metrics o social. Task 8 non iniziato. La cache mobile contiene esclusivamente risposte server validate e non ricalcola analytics su SQLite.

Tutti gli endpoint richiedono CurrentUser. Gli schemi Zod e i tipi inferiti sono in `packages/schemas/src/progress.ts`, esportati da `@jimo/schemas`; nessun driver/database importato nel mobile.

| Endpoint GET                     | Risultato                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| `/progress/summary`              | Conteggi, tempo, reps, RPE, frequenza, aderenza corrente                                      |
| `/progress/weekly`               | Bucket settimanali lunedì, inclusi bucket senza sessioni                                      |
| `/progress/prs`                  | Record del periodo, paginazione per chiave stabile esercizio/modalità/tipo                    |
| `/progress/exercises`            | Solo esercizi allenati, ricerca, ultima prestazione, trend della stessa modalità, cursor UUID |
| `/progress/exercises/:id`        | Metriche, record e timeline separate per tracking/load mode                                   |
| `/progress/workouts/:id/records` | Record migliorati in quella sessione rispetto alle sessioni precedenti                        |
| `/workouts`                      | Storico esistente, ora con filtro status e cursor composto startedAt/UUID                     |

I primi cinque endpoint accettano `range=4w|8w|12w|6m|all` (default `8w`) e `timeZone` IANA obbligatorio, ad esempio `Europe/Rome`. Header locale `x-jimo-locale=it|en`. Parametri sconosciuti, userId, from/to arbitrari, limiti e cursor invalidi sono rifiutati: questo task offre periodi nominali, non intervalli liberi. Limiti: PR/esercizi 1–50, storico 1–100. Cursor PR restituito dal server; ordinamento stabile per identità/modalità/tipo, non classifica di carico tra esercizi.

Esempi senza credenziali:

```sh
curl --fail 'http://localhost:3001/progress/summary?range=8w&timeZone=Europe%2FRome'
curl --fail 'http://localhost:3001/progress/weekly?range=4w&timeZone=Europe%2FRome'
curl --fail 'http://localhost:3001/workouts?status=completed&limit=15'
```

## Inclusione e formule

Analytics principali: solo sessioni `completed`, con `completedAt` nel periodo half-open `[from,to)`. Solo serie `completed`; pending e skipped non entrano in reps, RPE, carichi, volume, durata delle tenute o PR. Le serie skipped hanno un proprio conteggio nelle sessioni completate. Sessioni cancelled/in_progress escluse anche se contengono actual già completati.

- `completedWorkouts`: conteggio delle sessioni completate nel periodo.
- `completedSets`: conteggio serie completate di quelle sessioni.
- `skippedSets`: conteggio serie skipped di quelle sessioni.
- `trainingSeconds`: somma `completedAt-startedAt`, solo timestamp coerenti. Include recuperi e pause della sessione; non è tempo di attività fisica stimato. Nessuna durata negativa. Se non esistono durate valide: null.
- `totalReps`: somma actualReps delle sole serie trackingMode reps; null se non esistono osservazioni reps, zero se osservazioni valide hanno realmente zero reps.
- `averageRpe`: media dei soli actualRpe non-null; null quando nessuna osservazione. Mai RPE mancante = 0. PostgreSQL calcola la media; arrotondamento a un decimale solo in UI.
- `sessionsPerWeek`: completedWorkouts/effectiveWeeks. effectiveWeeks è il tempo di calendario locale effettivamente trascorso dal confine iniziale, in giorni/7, con denominatore minimo di un giorno. Il periodo di oggi non viene trattato come otto settimane intere. Non si calcolano delta percentuali con denominatore precedente zero.

Conteggi reali di elementi sono 0 quando non ce ne sono. Misurazioni senza osservazioni sono null, visualizzate `—`.

**Caso critico**: target 8×80, actual 7×82.50 → reps 7, carico 82.50, volume esercizio 577.50 kg·reps. Target immutabili rimangono solo confronto nel riepilogo sessione. Le query analytics non selezionano target.

## Timezone e periodi

Il dispositivo invia `Intl.DateTimeFormat().resolvedOptions().timeZone`; fallback UTC. Zod verifica che sia una zona IANA riconosciuta (UTC ammesso, offset e abbreviazioni non ammessi). PostgreSQL usa `AT TIME ZONE` per costruire confini locali e `date_trunc('week',...)` per bucket lunedì. Date della UI sono nel timezone locale dispositivo.

Periodi 4/8/12 settimane: mezzanotte locale di oggi meno 27/55/83 giorni, fino all'istante corrente. Sei mesi: mezzanotte di oggi meno sei mesi calendario. All: mezzanotte locale del primo workout completato dell'utente, oppure oggi quando lo storico è vuoto. Limite controllato di 5200 settimane (circa 100 anni); nessuna generazione illimitata di bucket. Confini SQL tengono conto di DST, anno e mese; la frequenza usa giorni di calendario locale, non presume che ogni giorno duri esattamente 24 ore UTC.

Una sessione completata domenica 23:30 UTC può appartenere al lunedì della settimana successiva in Europe/Rome. Si usa **completedAt**, sia per analytics che per i check Home/aderenza. startedAt resta visibile nello storico sessione e parte della chiave stabile di pagination.

Ogni bucket weekly contiene weekStart, completedWorkouts, completedSets, totalReps, averageRpe e trainingSeconds. Bucket vuoto: conteggi zero, misurazioni null. RPE non osservato non viene interpolato nel grafico.

## Modalità e metriche esercizio

La coppia trackingModeSnapshot/loadModeSnapshot è la chiave di aggregazione. Il tracking corrente del catalogo non riscrive il passato. Un esercizio con più modalità mostra un selettore solo delle modalità effettivamente presenti nel periodo; grafici e PR non mescolano modalità.

| Modalità          | Metriche / grafico                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| bodyweight + reps | totale reps, max reps in un set, serie, sessioni; max reps per sessione; nessun volume kg                  |
| external + reps   | max actualLoadKg con reps associate; volume carico `sum(actualReps*actualLoadKg)`; max carico per sessione |
| weighted + reps   | max zavorra con reps associate; volume **zavorra aggiunta**; nessun peso corporeo/sistema totale           |
| assisted + reps   | min actualAssistanceKg con reps associate; assistenza minima per sessione; nessun volume kg inventato      |
| duration          | max, media e somma actualDurationSeconds; durata massima per sessione, separata anche per load mode        |

Weighted 8×20 + 6×25 + 3×35 = **415 kg·reps**, record +35×3. Assisted 8×30/25/20 = record 20 kg assistenza×8. Push-Up 20/25/18 = MAX_REPS 25. Plank 60/75/90 = MAX_DURATION 90, display 1:30, media 75 e totale 225 secondi.

Nessuna card volume kg globale: carico esterno, zavorra, assistenza e corpo libero hanno semantiche differenti. Volume duration×kg non calcolato. Il volume esercizio aggrega SQL numeric e resta string nel DTO; ogni timeline espone anche il volume per sessione.

Ogni modalità nel dettaglio espone anche sessionsPerWeek = sessioni dell’esercizio/modalità divise per le settimane effettive del periodo, calcolato dal server e visualizzato in UI.

Lista esercizi: ultima serie completata della sessione più recente; indicatore deterministico confronta le ultime due sessioni della **stessa coppia tracking/load mode**, usando max reps/carico/durata o min assistenza. Nessun trend con una sola sessione, nessuna comparazione tra modalità e nessuna interpretazione coach.

## Record deterministici

- MAX_REPS: massimo actualReps positivo in una singola serie reps.
- MAX_LOAD: massimo actualLoadKg per external/weighted, con performance reps/duration positiva e valida. Weighted è peso aggiunto.
- MAX_DURATION: massimo actualDurationSeconds positivo in una serie duration.
- MIN_ASSISTANCE: minimo actualAssistanceKg per assisted, con performance positiva valida. Zero assistenza reale è ammessa.

Record separati per exerciseId, tracking mode, load mode, tipo. DTO include valore numeric come string, reps/duration context, data completamento sessione, sessionId e setId. Valori DB kg/RPE restano string; nessuna scrittura analytics nelle tabelle workout.

Tie della metrica primaria: maggiori reps, maggiore durata, prima data della sessione, UUID sessione e set. Il risultato è stabile. `/progress/workouts/:id/records` richiede un miglioramento **stretto della metrica primaria** rispetto alle sessioni precedenti (ordinamento completedAt/UUID): pareggio non è un nuovo record. Una prima prestazione valida è un record. Modifiche/correzioni dello storico aggiornano i record alla successiva lettura; nessuna tabella PR divergente.

Nessuna stima 1RM: servirebbero formula, ambito e limiti espliciti, rinviati a un task futuro.

## Aderenza corrente e Home

`packages/schemas/src/calendar.ts` condivide zonedDateKey, calendarWeekStart, scheduledDayCompleted e currentWeekAdherence tra server e Home. Per ogni program day assegnato, un check richiede sessione completed dello **stesso programId e programDayId**, nella settimana corrente e nel giorno locale programmato. Duplicati non aumentano planned/completed. Un allenamento fatto in un altro giorno resta nello storico ma non spunta il giorno programmato.

Se esiste un programma active e **tutti** i suoi giorni hanno weekday assegnato: planned = numero giorni; completed = giorni coperti; percentage = completed/planned×100. Tre giorni Mon/Wed/Fri, Push e Pull completati → 2/3 ≈66.7%. Programma senza schedule completo: null, widget omesso. Non esiste schedule history: nessuna percentuale storica perfetta né pretesa di conoscere il programma attivo in passato. Anche l'aderenza della settimana corrente usa lo schedule **attuale**, quindi un cambio programma/schedule può cambiare il widget.

## UI e accessibilità

Panoramica compatta, quattro metriche nella stessa composizione, verde JIMO tenue, dark theme e tokens esistenti. Periodo default otto settimane. Nessuna nuova libreria: SVG già disponibile. Frequenza a barre, RPE e andamento esercizio con linee sottili, griglia minima e buchi per dati mancanti. Singolo punto mostrato senza linea trend, con messaggio di dati insufficienti.

I grafici espongono summary testuale primo→ultimo punto, accessibilityLabel, valori selezionabili tramite touch target ≥48px. SVG decorativo; nessuna informazione accessibile solo graficamente. Per leggibilità si mostrano gli ultimi 26 punti con nota esplicita; dataset completo resta nel DTO. Timeline dettaglio: ultime 100 sessioni per modalità con flag; metriche/record sempre sull'intero periodo. Nessuna animazione nuova, reduced motion preservato, IT/EN, safe area e scaling testo.

Storico: default completati, filtri Completati/Annullati/Tutti, cursor composto startedAt/id, più recente prima, data/durata/esercizi/serie. In Progress il filtro periodo viene applicato a completedAt. Tap apre il riepilogo esistente; actual dominanti e target aggiunti solo se differenti. Schermata conclusiva espone durata leggibile e nuovi record dopo ACK server; non mostra una sezione PR vuota o PR calcolati localmente.

System exercises: nome tradotto secondo locale quando presente; custom: nome corrente dell'utente. Aggregato identifica per exerciseId. Dettaglio sessione preserva exerciseNameSnapshot originale anche dopo rename. FK exercise restrict impedisce cancellazioni che eliminino l'identità dello storico; fallback del nome al snapshot se il catalogo manca.

## SQLite cache, offline e sync

Migration mobile versionata `0002_progress_cache.ts`, PRAGMA user_version 1→2, eseguita atomicamente all'apertura. Aggiunge solo progress_cache(owner_user_id,cache_key,payload_json,fetched_at), chiave composta; preserva dati, outbox e metadata v1. Versione futura sconosciuta rifiutata senza reset.

Chiave cache include origin logico endpoint/parametri, locale, timezone, periodo e cursor; namespace owner. Ultime 100 risposte per account, upsert validato Zod, payload JSON invalidi ignorati senza cancellare workout. Mai source of truth. Offline/errore rete: ultime risposte con “Ultimo aggiornamento …”; assenza cache: stato offline chiaro e Retry. Dataset diversi possono essere stati scaricati in istanti differenti: il timestamp è visibile sui dati cached. La cache non aggiunge gli ultimi actual locali a statistiche server.

Outbox non vuota (anche failed/conflict): avviso discreto “Dati recenti in attesa di sincronizzazione.” ACK di operazioni → invalidazione di tutte le query Progress, weekly, PR, dettaglio e history attive; riconnessione/foreground e ritorno alla tab aggiornano. Endpoint `/progress/workouts/:id/records` può essere temporaneamente assente prima che il workout offline arrivi al server; il riepilogo locale resta utilizzabile e dopo ACK viene richiesto di nuovo.

Client invia `x-jimo-owner` come guardia del namespace atteso, mai come identità autorevole; server verifica contro CurrentUser e risponde 403 in caso di account differente. Risposta in-flight non viene cached/renderizzata se l'owner cambia. Nessuna credenziale nel payload/mobile.

## Query, indici e sicurezza

`ProgressService` usa query aggregate PostgreSQL in transazioni HTTP **read-only**, timeout statement 8s. Summary e weekly aggregano senza scaricare ogni workout in JS; PR usa window ranking; dettaglio usa gruppi/timeline per modalità in query set-based. Nessun N+1 per sessione/esercizio/card. In JS vengono trattati solo periodi, DTO aggregati e il piccolo schedule corrente condiviso con Home.

Indici ispezionati prima della scelta: workout_sessions_user_idx, started_idx, program_idx, day_idx e single_active_unique; workout_exercises_position_unique (prefisso workout_session_id), exercise_idx/source_idx; workout_sets_number_unique (prefisso workout_exercise_id). Questi indici coprono ownership e join attuali. Nessun indice duplicato né migration Neon nuova per Task 7: il dataset attuale non giustifica costi di scrittura extra. All rimane una scansione aggregata dello storico dell'utente, controllata da timeout/range/output; quando crescerà, profilare EXPLAIN ANALYZE e valutare un indice parziale user/completedAt su completed, senza tabelle aggregate premature.

Tutti i percorsi partono da workout_sessions.user_id = CurrentUser. Nessun userId accettato dal client. Exercise/session UUID straniero o inesistente → stesso 404; catalogo da solo non autorizza analytics. Guard owner, date filters e cursor non possono cambiare l'utente. Le route senza identità non interrogano Neon. Nessun messaggio driver/secret in output.

Neon **development soltanto** (`br-purple-math-b1fsq2wb`, nome confermato dall'utente). Integration/E2E verificano assertDevelopment prima di scrivere fixture isolate, poi cleanup sessioni/receipts/programmi/custom esercizi/utenti. Production non contattata. Nessuna migration Neon o seed nel Task 7.

## Verifica e telefono reale

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
# Secret già presente solo nel processo server; guard development verificato:
pnpm test:api:db
pnpm test:db
pnpm db:check
CHROMIUM_PATH=/usr/bin/chromium pnpm --filter @jimo/mobile test:ui
```

I test coprono actual vs target, soli completed, null RPE, durata, frequenza parziale, tutte le modalità, PR/tie/context/date, UTC vs Europe/Rome e DST, aderenza, range/search/pagination, A/B e owner cambiato in-flight, cache SQLite reale e upgrade/persistenza, formati e stati IT/EN. E2E: workout reale → sync → summary/history → dettaglio actual/PR; SVG accessibile, selector modalità, ultimo aggiornamento offline e pending notice. Test trasporto offline web mantiene gli asset del bundle raggiungibili per poter ricaricare, come documentato nel Task 6.

Build Android/iOS/web significa bundle Expo, non binari nativi né prova fisica. Checklist telefono:

1. Avvia API con DATABASE_URL development già configurata privatamente; verifica /health e /ready dal browser del telefono.
2. EXPO_PUBLIC_API_URL deve essere l'IP LAN del PC (esempio storico http://192.168.1.138:3001, da ricontrollare), quindi Expo `--lan --clear` ed Expo Go compatibile SDK57.
3. Completa un workout con target8×80 e actual7×82.5. Attendi sync, apri Progressi: conteggi/PR basati su actual; apri dettaglio e riepilogo.
4. Prova tutti i periodi, ricerca, una modalità bodyweight/weighted/assisted/duration, storico/paginazione e un punto unico senza linea trend.
5. Apri Progressi e un dettaglio online, attiva modalità aereo: dati cached e ultimo aggiornamento; nuovo workout offline mostra pending notice, senza aggiungerlo alle statistiche server. Riconnetti e attendi refresh dopo ACK.
6. Verifica upgrade da DB locale Task6 con workout/outbox già presenti; nessuna perdita, timer e workout ancora operativi.
7. VoiceOver/TalkBack, testo grande, touch48, safe area, IT/EN, reduced motion e riapertura app. Per Expo Go la riapertura completa offline può richiedere Metro per il bundle JS: SQLite non dipende dalla rete.

Queste prove native su telefono non possono essere dichiarate eseguite dall'ambiente Codex.

## Esito della verifica finale — 7 ottobre 2026

- `pnpm lint`: PASS, 11 task, nessun warning applicativo.
- `pnpm typecheck`: PASS, 10 task.
- `pnpm test`: **77 PASS**, zero failure/skip (mobile52, schemas13, API7, database5).
- `pnpm build`: PASS, package/API e bundle Expo **Android, iOS, web**.
- `pnpm format:check`: PASS.
- Neon development API integration: **41 PASS**, inclusi 11 test del nuovo gruppo Progress; database integration **11 PASS**.
- Playwright finale completo: **17 PASS**, zero skip, inclusi percorso workout reale/Neon → analytics/PR e SQLite web cached/offline/pending notice. Screenshot a larghezza390 controllato.
- `/health`, `/ready`, `/progress/summary`, `/progress/weekly`, `/progress/prs`, `/progress/exercises`: HTTP200 sul server di test development; dettaglio e record sessione verificati in integration/E2E.
- `db:check`: 10 tabelle, 6 enum stabili, 30 indici, 130 constraint, 6 migration Neon esistenti, 9 audit trigger. Nessuna nuova migration Neon Task7.
- Upgrade SQLite v1→v2 con workout actual/outbox reali preservati; reopen e foreign_key_check OK. Unknown future schema non resetta i dati.
- Verifica read-only post-cleanup: **0 utenti test rimasti** per fixture Progress/API/Workout/Sync/E2E. FK e cleanup test rimuovono anche dati dipendenti e receipt.
- Scansione118 file export mobile: **0 corrispondenze della DATABASE_URL completa**, senza stamparne il valore.
- Nessun seed, contatto production, commit/push, APK/IPA o Task8. Verifiche fisiche Android/iOS, modalità aereo Expo Go e VoiceOver/TalkBack ancora da eseguire sul dispositivo.

Durante la regressione è stato corretto anche “Salta recupero”: la preferenza SQLite viene ora salvata **prima** di avanzare al set successivo, evitando che un reload immediato riporti al recupero. Un errore di salvataggio resta visibile e non avanza. Nessun cambiamento a target, actual, architettura o protocollo sync.
