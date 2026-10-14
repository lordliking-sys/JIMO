# Refinement anime/pink

## Home: dati correnti

La Home legge il programma attivo da SQLite. In precedenza le mutation di giorni/esercizi invalidavano solo le query API e avviavano il sync in background: il vecchio payload locale restava visibile fino alla riconciliazione.

Ora una mutation riuscita applica il `ProgramDetail` restituito dall'API alla cache locale prima di chiudere il modal/navigare, cancella eventuali letture React Query precedenti e aggiorna la query del programma attivo. Payload, giorni e prescrizioni vengono riscritti nella stessa transazione, usando lo schema locale esistente. La creazione di una bozza non sostituisce il programma attivo. Attivazione, archiviazione e cancellazione aggiornano anche la Home.

Una revisione in memoria, separata per account, impedisce a un GET del sync iniziato prima di un edit/delete di ripristinare dati superati. Il ritorno su Home/Scheda invalida programma, sessione e storico locali oltre a richiedere il sync. Nessuna migration è aggiunta o applicata a Neon.

Se una sessione sincronizzata è sparita dal server, una risposta autenticata `404` al dettaglio elimina la relativa copia locale. Il solo elenco limitato dello storico non dimostra una cancellazione: per le sessioni della settimana corrente mancanti nell'elenco si verifica il dettaglio. Le operazioni offline pendenti impediscono la rimozione della sessione; errori di rete, 401/403 e 5xx non cancellano la cache. Le snapshot di workout ancora validi rimangono indipendenti dalle prescrizioni del programma.

Le modifiche effettuate nell'app aggiornano Home dal risultato della mutation, senza attendere il sync. Le modifiche di un altro dispositivo diventano visibili alla successiva riconciliazione riuscita; senza rete si mantengono i dati locali e il relativo stato offline.

## Refinement visivi e modal

- `HOME` è in alto a sinistra; saluto locale e identità restano disponibili. L'overlay inferiore è alleggerito perché il testo non occupa più le gambe dell'artwork.
- Il contenuto di Home, Scheda, Progressi e Profilo resta sotto la safe area superiore. `SectionStatusFade` usa un gradiente non interattivo esteso di 28 px oltre l'inset, senza lo stacco del vecchio scrim Profilo. Gli indicatori della status bar cambiano contrasto quando si scorre sul body chiaro.
- I quattro tab Progressi usano una riga vincolata alla larghezza disponibile, con spazio proporzionato alle label, pill pink/dark e target di almeno 48 px. Il testo può andare a capo con caratteri ingranditi senza ellissi o overflow orizzontale.
- La Scheda usa il PNG originale `profilo-mood-reference.png`; il titolo nell'hero è soltanto `SCHEDA`. Nessun asset è rigenerato o modificato.
- `+ Nuova scheda` resta un overlay sulla Scheda: nome, descrizione, durata e data opzionale, pulsante `Salva`. Il risultato è una bozza; il modal si chiude e il programma attivo resta invariato.
- `Cambia scheda` mostra ATTIVA/NON ATTIVA. Il tap su una scheda non attiva chiede subito conferma. Dopo l'attivazione il modal si chiude, la Scheda e la Home si aggiornano. Annullando rimangono disponibili le azioni di modifica già esistenti.
- Il Profilo non mostra ingranaggi nell'hero o nel body. Le righe Account, Lingua, Unità, Privacy, Informazioni e Logout mantengono i loro comandi.

Palette, font, navbar, radius e struttura della superficie principale restano quelli approvati. Auth, API, schema PostgreSQL, database development/production e workout engine non vengono modificati. Le sole modifiche funzionali riguardano l'aggiornamento della cache Home e i comportamenti dei modal richiesti.

## Verifica

I test SQLite aggiunti coprono rimozione di esercizi/giorni, risposta GET tardiva, creazione bozza, attivazione, cancellazione, isolamento per account e protezione dei workout con outbox pendente. Usano database in memoria e le definizioni locali già esistenti.

Le prove browser usano esclusivamente fixture HTTP locali, con credenziali backend rimosse. Le viewport richieste sono 320×740, 390×780, 393×851 e 430×860; le safe area simulate includono inset superiore di 24/47 px e inferiore di 48/34 px. Una prova cancella esercizio, giorno e scheda mentre il sync è indisponibile e verifica Home anche dopo il reload. Si verificano inoltre workout eliminato lato server, modal, attivazione, tab, testo ingrandito e assenza di gear.

Le prove React Native Web e gli export Expo non sostituiscono il controllo fisico su Expo Go, VoiceOver/TalkBack e status bar nativa. Nessun test contatta Neon, Clerk, OpenAI o production reali.

Risultati locali: `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm format:check` superati; 186 test complessivi, di cui 146 mobile. Superati 51 casi browser selezionati: 47 nella prima esecuzione e i quattro controlli Profilo alla riesecuzione, dopo aver circoscritto il selettore di scroll alla schermata Profilo. Gli altri tab restano montati dal navigator e rendevano ambiguo il selettore generico del test. Non erano presenti errori applicativi in quei quattro casi.

Confronto dei file protetti superato: 203 file originali, inclusi API, schema PostgreSQL, asset e workout engine. I sei PNG del tema mantengono gli hash SHA-256 originali.

`pnpm build` superato: sei task e export Android, iOS e web con `EXPO_PUBLIC_AUTH_TEST=false` e AI disabilitata. Non sono stati creati APK/IPA. Scansione delle credenziali nei sorgenti e nei bundle superata, senza stampare valori riservati.
