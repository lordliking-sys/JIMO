# Task 11 — Device reliability findings

Task 10 preservato. Nessun redesign, asset, nuova feature, API, schema o migration
modificati dal Task 11. Nessun contatto con production, Neon o OpenAI in questo
pass. I bug sotto sono riprodotti su codice reale con adapter di eventi nativi o
browser; non sono presentati come prove su telefono fisico.

## T11-01 — Clock attivo in background

- **Severity:** P2, lavoro nascosto e aggiornamenti non necessari.
- **Screen/Flow:** Home/Scheda e workout standard/EMOM, `useClock`.
- **Steps:** montare il clock, emettere AppState inactive/background, avanzare
  l'orologio 30 s / 2 / 5 / 10 min; riattivare anche con eventi active ripetuti.
- **Expected:** polling sospeso fuori foreground; un solo intervallo alla ripresa,
  ora ricavata subito da Date.now, listener eliminato allo smontaggio.
- **Actual:** prima del fix 30 aggiornamenti in 30 s di background e 120 in 2 min
  anche montando il clock mentre l'app era già backgrounded.
- **Fix:** fermare l'intervallo su inactive/background; ripristinarlo una sola
  volta su active, aggiornando subito l'ora e il callback foreground. I timestamp
  persistiti del motore e le formule EMOM/recupero non cambiano.
- **Regression test:** `apps/mobile/test/device-clock.test.ts`, due casi prima
  rossi e poi verdi. Adapter AppState/effetti con fake clock, non scheduler OS.

## T11-02 — Back del Modal con tastiera visibile

- **Severity:** P2, uscita dallo step invece di dismiss della tastiera.
- **Screen/Flow:** JimoDialog condiviso e ProgramOverlay di compatibilità.
- **Steps:** aprire uno step del popup con campo attivo/IME visibile, invocare
  `Modal.onRequestClose` Android, poi invocarlo una seconda volta a IME chiusa.
- **Expected:** primo Back chiude solo IME; secondo torna allo step precedente;
  guard dirty/busy mantenuti. RN Modal intercetta Back prima dei listener globali.
- **Actual:** prima del fix il callback tornava subito allo step precedente;
  l'assert sull'assenza di navigazione falliva (1 invece di 0).
- **Fix:** controllare Keyboard.isVisible nel callback nativo di entrambi i modal
  prima di eseguire back/close/discard. Pulsanti X e backdrop mantengono i guard.
- **Regression test:** nuovo caso in `apps/mobile/test/popup-native.test.ts` che
  richiama i callback dei componenti reali per entrambi i contenitori. Stress
  browser degli step/popup ripetuti; la tastiera Android fisica resta da provare.

## T11-03 — Tap su oggi bloccava la Home al giorno precedente

- **Severity:** P2, calendario/piano inatteso dopo la mezzanotte.
- **Screen/Flow:** Home, selectedDate locale.
- **Steps:** lunedì 23:59 Europe/Rome, tap su lunedì/oggi, start workout, ritorno
  Home e tap su oggi; avanzare oltre mezzanotte senza refresh.
- **Expected:** martedì/oggi selezionato, riposo del martedì, sessione del lunedì
  ancora riprendibile sullo stesso URL.
- **Actual:** il badge oggi si spostava su martedì ma il piano restava lunedì,
  perché il tap su oggi salvava una selezione fissa nella stessa settimana.
- **Fix:** il tap sulla data odierna torna alla selezione live, senza salvare una
  copia fissa di today. Le selezioni intenzionali diverse da oggi sono preservate.
- **Regression test:** `apps/mobile/e2e/task11-device-reliability.spec.ts`;
  riprodotto prima del fix, più caso domenica → lunedì e selezione esplicita.

## Build, configurazione e limiti di verifica

- Expo 57: introspezione config Android/iOS PASS; `expo install --check` offline
  non segnala disallineamenti (non certifica la disponibilità remota dei pacchetti).
- Config nativa generata: INTERNET, adjustResize, permessi camera/foto descritti,
  microfono bloccato con merge rule `tools:node=remove`. I default di rete Expo
  non sono stati allargati; per beta release-like usare API development HTTPS.
- Android package e iOS bundleIdentifier non sono espliciti nel sorgente. Non
  pubblicare identificativi di fallback: scegliere quelli development nel primo
  setup nativo. Nessun progetto EAS/store o vendor creato automaticamente.
- Nessun SDK Android/ADB/emulatore/KVM/Xcode né credenziale EAS qui disponibile:
  APK/IPA non compilati/installati, nessun telefono collegato. Export JS/Hermes
  Android/iOS e web rimangono distinti dalla build nativa.
- Publishable key Clerk test presente e frontend coerente con issuer; binding
  secret/issuer/authorized parties presenti. Nessun secret stampato o copiato nel
  mobile; le binding proxy non vengono interpretate dal loro prefisso locale.
- EXPO_PUBLIC_API_URL assente nel contesto mobile attuale: va configurato con
  endpoint development raggiungibile dal telefono prima del collaudo nativo.
- Signup, verifica/reset email reali, sessione revocata su telefono e A/B reali
  non eseguiti: servono account development e dispositivo del tester. I test auth
  del Task 10 non vengono rietichettati come email reali.
- Camera/galleria: adapter esistente gestisce permessi, cancel, content URI,
  copia persistente e isolamento. Activity recreation/picker OEM resta un test
  fisico, senza presumere che il risultato del picker sopravviva al process kill.
- Hero registrati: circa 1,57 MP, stima fino a 6 MiB RGBA ciascuno; dimensioni
  esplicite e resizeMode già presenti. Nessun asset rigenerato/compresso. Memoria
  totale, decoding nativo, avatar fotografici grandi, batteria e jank richiedono
  profiling sul device; non è stata inventata una misura di RAM.

## Sessioni offline concorrenti — decisione ancora aperta

Il mutex sul singolo client non coordina due dispositivi. Lo stato attuale
preserva le operazioni locali e mostra il conflitto; non applica un merge
silenzioso. I retry transitori sono automatici, i conflitti permanenti no.

| Scenario                                                                 | Record/vincoli che collidono                                                  | Comportamento attuale                                                                                                                                                      |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Due START con sessionId diversi, stesso utente                           | `workout_sessions` con un solo in_progress per user; gate START e lock utente | Il primo START accettato occupa la sessione attiva; l'altro diventa WORKOUT_SYNC_CONFLICT. La sua outbox e lo snapshot restano locali.                                     |
| Due device partono dalla stessa revisione della stessa sessione          | `sync_operations(user_id, session_id, sequence)`                              | Entrambi generano N+1 con operationId diversi: uno viene accettato, l'altro confligge anche se modifica un set diverso. Non esiste merge per campo.                        |
| COMPLETE/SKIP/UPDATE concorrenti sullo stesso set                        | `workout_sets.status`, actual e completed_at, oltre alla sequenza             | Complete/skip richiedono pending; correction richiede completed. Ordine/stato incompatibile produce conflitto, nessuna trasformazione automatica di uno skip in completed. |
| START_EMOM o COMPLETE/CANCEL concorrenti                                 | `workout_exercises.emom_started_at`, stato sessione e sequenza                | Start EMOM una sola volta; un finish/cancel già applicato rende incompatibili eventi successivi o precedenti del secondo device.                                           |
| Programma/giorno/prescrizione rimossi o non più attivi dall'altro device | Provenienza e gate del pending START                                          | Lo snapshot locale non viene perso ma lo START può essere rifiutato. Il guard locale non impedisce una modifica sul secondo device.                                        |
| Stesso operationId con stesso payload / payload diverso                  | `sync_operations(user_id, operation_id)` e payload_hash                       | Identico è un replay idempotente; diverso è conflitto. Anche receipt e sequence persistite non vengono cancellate per forzare retry.                                       |

I vincoli owner/session/set e le outbox sono già presenti: nessuna migration
proposta. Gli ID di set/esercizi nuovi sono UUID; il conflitto ordinario non è una
collisione casuale di UUID. Gli aggiornamenti online diretti non hanno una
revisione condivisa con i device offline, ulteriore motivo per non decidere un
merge dal solo timestamp.

| Strategia da decidere                 | Pro                                                                  | Contro / decisioni necessarie                                                                                                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Server wins                        | Esito semplice, conserva subito gli invarianti server                | Le modifiche offline perdenti devono essere conservate/esportabili o scartate esplicitamente; uno scarto silenzioso perderebbe dati. Non basta svuotare la outbox.                                 |
| B. Latest write wins                  | Può ridurre le richieste di intervento per modifiche compatibili     | Clock device divergenti; un cancel può cancellare progressi, target/actual/stati non sono tutti fondibili. Richiede revisioni affidabili e regole per entità; createdAt da solo non è sufficiente. |
| C. Preserve both + risoluzione utente | Mantiene la provenienza di entrambe le esecuzioni e lascia scegliere | Servono UI/semantica di risoluzione, rimappatura operazioni/snapshot e riconciliazione di storico/PR; non si possono inserire due sessioni attive violando il vincolo attuale.                     |

Nessuna delle tre strategie è stata implementata. La scelta richiede una
decisione di prodotto prima di estendere protocollo o UI.

## Osservabilità beta — punti pronti da valutare

Non è presente un servizio di crash/error reporting mobile centralizzato; non è
stato aggiunto alcun vendor. Restano il fallback Expo Router, gli errori tradotti
e lo stato sync/outbox locale; l'API ha logging con redazione dei dati sensibili.

Punti utili per una futura integrazione esplicita:

- Root/Expo Router error boundary: crash JS, versione build, piattaforma.
- Errori async non gestiti: reason normalizzata, mai messaggi/payload arbitrari.
- `SyncEngine` ramo error/retry/conflitto: codice, conteggio/età pending, tentativi,
  deduplicati per evitare spam al flapping.
- Apertura/migrazione SQLite e recovery active workout/rest/EMOM: esito e codice,
  senza contenuto delle serie o dati dell'account.
- Crash nativo/OOM/ANR: richiede build nativa e symbolication/source map; il solo
  boundary React non lo vede.

Escludere token, header Authorization, password, DATABASE_URL, chiavi, email,
foto, prompt/documenti e payload completi. Valutare consenso e retention prima
di inviare dati a un servizio. Nessun invio di telemetria aggiunto nel Task 11.

## Verifiche

- `pnpm lint`: PASS, 11 task. Corretto anche il nome del componente nell'harness
  di test rilevato dal controllo Rules of Hooks, senza disabilitare la regola.
- `pnpm typecheck`: PASS, 10 task.
- `pnpm test`: PASS, 209 casi (169 mobile, 21 API, 14 schema, 5 database), nessuno
  skipped. Tre casi unitari aggiunti per i difetti del ciclo dispositivo.
- `pnpm build`: PASS, 6 task, API/package ed export Android/iOS/web. Build finale
  eseguita con Clerk normale, flag auth test rimosso e AI disabilitata; nessun
  APK/IPA e nessuna promessa di connettività con API URL non configurata.
- `pnpm format:check` e `git diff --check`: PASS.
- Browser Chromium: 21 casi PASS su export locale con harness auth loopback e
  fixture HTTP, nessun servizio esterno. Inclusi tre nuovi casi Task 11:
  mezzanotte/sessione preservata, domenica/lunedì e 20 cicli di ciascun flow
  popup/giornata/libreria/config/modifica/cambia/nuova/avatar. Regressioni correlate
  alle viewport 320x740, 390x780, 393x851 e 430x860.
- Callback native/clock: i tre nuovi casi unitari e il vecchio test del Modal
  passano. I nuovi casi avevano riprodotto gli errori prima dei fix; il nuovo caso
  browser di mezzanotte era anch'esso rosso sull'export precedente.
- Fault injection locale sul SyncEngine e SQLite isolato: alternanza ripetuta
  online/offline con richiesta interrotta e retry; concorrenza massima di invio 1,
  batch pendente preservato, un solo invio riuscito per operazione e actual/target
  invariati. Prova temporanea, senza duplicare la suite core o contattare Neon.
- Scan credenziali server su sorgenti/asset/export mobile: zero occorrenze dei
  valori configurati, incluse forme escaped JSON. Nessun secret stampato.
- Nessuna modifica a dipendenze/lockfile, asset, app config o migration. I file
  uncommitted del Task 10 sono stati conservati; nessun commit/push automatico.

I controlli fisici ancora aperti sono raccolti nella
[checklist](real-device-beta-checklist.md). Non è stata rieseguita l'integrazione
Neon del Task 10 e non si dichiara eseguito alcun test fisico Android/iOS.
