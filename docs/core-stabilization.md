# Task 10 — Core stabilization audit

Audit del 19 ottobre 2026 su mobile, API, package condivisi, schema/migration
versionate, SQLite, auth, query, programmi, workout, sync e analytics. UI e asset
approvati preservati. Nessuna nuova feature AI, chiamata OpenAI, migration o seed.
Le modifiche del pass precedente sono state conservate.

## Difetti dimostrati e fix

| Priorità | Problema                                                                                                                                                        | Correzione e prova                                                                                                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Cambio account durante il decoding HTTP: una risposta vecchia poteva superare il controllo d'identità; un errore 401 poteva coinvolgere il provider successivo. | Controllo della generazione anche dopo il decoding; notifica 401 solo al provider catturato. Regressione riprodotta prima del fix.                                                              |
| P0       | Risultato di una mutation workout dopo logout: il namespace era ricavato dall'account corrente alla risoluzione.                                                | Owner catturato all'avvio; nessun aggiornamento cache/callback dopo cambio account. Test con MutationObserver e risposta ritardata. Nessuna evidenza di accesso cross-account sull'API.         |
| P0       | Un download precedente all'ACK poteva riscrivere serie già sincronizzate quando la outbox era ormai vuota.                                                      | Import rifiutato se syncSequence precede la sequenza locale persistita. Regressione SQLite riprodotta prima del fix.                                                                            |
| P1       | Cancellare giorni/prescrizioni o archiviare/cambiare la scheda poteva invalidare uno START ancora in outbox.                                                    | Preparazione prima delle modifiche distruttive, errore tradotto se lo start resta pendente. Creazione e modifiche non distruttive restano disponibili; riattivazione della sorgente consentita. |
| P1       | Scheda poteva scegliere il programma da una lista remota vecchia invece del dettaglio attivo usato dalla Home.                                                  | Un solo dettaglio attivo validato in SQLite per Home, Scheda e start; lista usata per la selezione.                                                                                             |
| P1       | Due route di compatibilità non erano dichiarate nel gruppo Stack.Protected.                                                                                     | Aggiunti program/manage e program/[id]/day-detail al guard. Il test deep-link senza login falliva prima del fix.                                                                                |
| P2       | Timeout HTTP non copriva l'attesa del rinnovo token.                                                                                                            | Deadline anche per token, fetch e decoding; nessuna richiesta inviata dopo timeout.                                                                                                             |
| P2       | Invalidazioni globali e chiave sync-status con owner in posizione incoerente.                                                                                   | Invalidazioni distinte per status, programmi e workout, sempre scoped all'owner. Progressi aggiornati dopo ACK/rete ripristinata.                                                               |
| P2       | Refresh identici riscrivevano l'intera struttura cached.                                                                                                        | Il payload invariato non viene riscritto; test del numero effettivo di scritture SQLite.                                                                                                        |
| P2       | Correzioni di serie non rendevano riconoscibile l'aggiornamento nello storico cached.                                                                           | updatedAt dell'API comprende esercizi/serie; refresh dei dettagli recenti solo se revisione o timestamp avanzano, senza sovrascrivere outbox pendente.                                          |
| P2       | Correzione non raggiungibile dopo la conferma finale, benché supportata dal motore.                                                                             | Stesso modal già esistente disponibile per workout completed; cancelled resta read-only. Target e timestamp originali preservati.                                                               |
| P2       | Ritorno Home dal workout sostituiva la route e poteva aggiungere un'altra istanza delle tab.                                                                    | dismissTo riutilizza la route esistente. Guard sincrono anche sul doppio tap di eliminazione programma.                                                                                         |

Ulteriore fix P2: i salvataggi del builder online-only non rimangono più sospesi
offline. Falliscono subito con un messaggio tradotto, conservano i campi e
lasciano chiudibile il modal; non viene introdotta una outbox dei programmi.

## Matrice delle invalidazioni

Tutte le chiavi private includono l'owner; cambio account cancella le query in
memoria e conserva separatamente i dati SQLite/outbox dei rispettivi utenti.

| Evento                                                                    | Aggiornamento                                                                                                                                        |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create/update/activate/archive di programma, giorno, prescrizione, ordine | Risposta validata applicata alla cache programmi; dettaglio attivo locale e lista/dettaglio remoto interessati. Nessun reset degli snapshot workout. |
| Delete programma                                                          | Rimozione della sola struttura cached e delle query del programma; storico/outbox preservati.                                                        |
| Start/complete/skip/correct/finish/cancel workout                         | Dettaglio restituito salvato nella query della sessione; active workout, storico, sync status e indicatore pending aggiornati per l'owner.           |
| Cambio stato sync/errore/rete                                             | Solo stato sync e pending locale; nessun refetch dei programmi per ogni notifica di stato.                                                           |
| ACK                                                                       | Progress summary, weekly, esercizi e PR dell'owner invalidati; nuove risposte server salvate nella cache analytics.                                  |
| Reconcile                                                                 | Aggiornamenti locali notificati; lista programmi aggiornata quando cambia realmente il dettaglio attivo. Cache valida utilizzabile offline.          |

## Verifica e confini

- Neon HTTP: branch verificato read-only contro l'ID development già confermato
  dall'utente, prima di ogni suite che scrive fixture. Test API e database usano
  utenti/record sintetici e cleanup. Nessun accesso al branch production.
- API reale avviata con Clerk development, senza OpenAI: health 200, ready 200,
  me senza bearer 401, entrambe le feature AI false.
- Auth: SDK Clerk ufficiale con firme effimere, issuer/azp/scadenza/nbf,
  provisioning concorrente, GET/PATCH me e ownership; le email reali di Clerk
  non vengono inviate dai test automatici.
- Standard, piramidale ed EMOM condividono ancora il motore esistente. Target e
  actual restano distinti; skip non produce actual; timer ricostruiti dai timestamp.
- Sync: replay fino a cinque invii, concorrenza, risposta persa, FIFO,
  rollback, 401/retry e isolamento; nessuna duplicazione server.
- Test browser correnti: flusso live creazione/start/actual/skip/fine/progressi,
  cache dopo add/remove/delete, chiusura e riapertura offline di SQLite/OPFS e
  riconnessione automatica. Auth interattiva del test browser usa il solo
  harness loopback; non equivale a un login Clerk reale.
- I test di riapertura web mantengono raggiungibili gli asset Expo e interrompono
  solo il trasporto API. Non equivalgono al kill del processo Android/Expo Go.
- Le route legacy workout/progress restano redirect compatibili; nessuna nuova
  sottopagina Progressi o preview eseguibile. Nessuna rimozione speculativa di
  componenti riusati da route o harness nativi.

## Punti da verificare sul telefono

Expo Go: signup/verifica email/login/logout/reset Clerk reale, hardware Back,
tastiera sui form/modal, safe area/status bar, lock/unlock, minimize/foreground,
EMOM durante quattro minuti in background, kill/reopen offline e modalità aereo.
Il cold start offline del bundle può richiedere una build nativa se Expo Go deve
ricontattare Metro.

Il conflitto tra due dispositivi che avviano offline sessioni diverse resta
esplicitamente segnalato con dati locali preservati. La risoluzione/riconciliazione
guidata di questi conflitti richiede una scelta di prodotto e non è stata inventata
in questo task. I normali retry transitori e la riconnessione sono automatici.

Le suite E2E storiche riferite a layout/route sostituiti non costituiscono una
verifica della UI attuale. Il report distingue le suite correnti eseguite dai
controlli fisici ancora da effettuare; non dichiara l'intera raccolta legacy verde.

## Risultati finali

- `pnpm lint`: PASS, 11 task.
- `pnpm typecheck`: PASS, 10 task.
- `pnpm test`: PASS, 206 test (166 mobile, 21 API, 14 schema, 5 database).
- `pnpm build`: PASS, package/API ed export Expo Android/iOS/web, 6 task.
- `pnpm format:check`: PASS.
- Integrazione reale Neon development: 58 test API e 11 database, tutti PASS,
  nessuno skipped; fixture isolate eliminate dai teardown.
- Browser: 55 casi di regressione correnti passati tra le esecuzioni, più il
  nuovo caso builder offline e i 3 scenari end-to-end reali contro development
  (59 casi distinti). L'ultima suite di 6 casi include auth/deep-link, onboarding,
  active program e builder offline ed è interamente PASS. I casi responsive
  includono 320x740, 390x780, 393x851 e 430x860.
- Le verifiche hanno prima riprodotto i difetti: risposte HTTP e mutation dopo
  cambio account, import stale dopo ACK, deep-link non protetti dal guard e
  salvataggio builder sospeso offline. Le rispettive regressioni passano dopo
  i fix. Un selettore onboarding obsoleto è stato corretto; il test passa.
- Scan su 539 file del mobile (sorgenti, asset ed export): nessuna occorrenza
  dei valori configurati di DATABASE_URL, CLERK_SECRET_KEY e OPENAI_API_KEY,
  incluse le forme con escaping JSON. CLERK_JWT_KEY non presente nell'ambiente.
  Nessun valore sensibile stampato.
- Nessuna modifica ad asset, dipendenze/lockfile o migration PostgreSQL.
  API temporanea arrestata dopo la verifica. Nessun commit/push automatico.

I PASS automatici non sostituiscono la checklist fisica sopra: auth web nel
browser usa il test harness locale, l'offline web interrompe il trasporto API e
la riapertura usa SQLite/OPFS. Non è stato eseguito un test su telefono reale.
