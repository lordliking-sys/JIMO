# Scheda attiva e superfici anime/pink

Il refinement mantiene il tema anime/pink e i placeholder esistenti. Non introduce asset, endpoint, stati PostgreSQL o migration.

## Gerarchia visiva

`SectionBody` collega hero e contenuto con una sola superficie arrotondata, sovrapposta di 24 px. Scheda usa un body bianco; Profilo inserisce identity, statistiche e menu direttamente nello stesso body; Progressi usa un body rosa chiaro con card riservate ai singoli dati. Home conserva il proprio layout. La thumbnail condivisa degli esercizi perde il riquadro grafico interno: artwork originale trasparente, `contain`, senza bordo o shadow.

## Flusso quotidiano

Scheda mostra esclusivamente il programma `active`: nome, badge ATTIVA e giornate con esercizi assegnati. Il refinement successivo in [daily-plan-refinements.md](daily-plan-refinements.md) sostituisce il selettore settimane con i giorni della settimana e introduce il popup essenziale di modifica. Il tap su una giornata apre il relativo editor; l'avvio workout resta un'azione esplicita nell'editor.

La navigazione percepita è Scheda → Giornata → editor esercizio in overlay. La libreria contiene back, titolo, ricerca su tutto il catalogo e lista paginata, senza filtri per origine o tracking. La creazione di esercizi personalizzati rimane disponibile nel menu della giornata.

`Cambia scheda` apre un overlay con programmi attivi e non attivi. Selezionare una voce apre il dettaglio minimale; `Imposta come attiva` richiede conferma e riusa l'endpoint di attivazione esistente. La scheda precedente diventa inattiva secondo gli stati già implementati. Le label ATTIVA/NON ATTIVA mappano `active` e `draft`/`archived`, senza modificare lo schema.

`+ Nuova scheda` riusa form, validazione e API di creazione: salva una bozza, poi apre la gestione nello stesso overlay. Non attiva automaticamente il programma. Metadata, giornate, ordinamento, archiviazione ed eliminazione restano nella gestione. Le vecchie route restano compatibili con i deep link; il normale flusso dalla tab non richiede una pagina Programma intermedia. Su iOS l'overlay viene chiuso prima della navigazione verso una giornata.

L'eliminazione riusa le protezioni esistenti per sync, outbox e cache locale. I workout storici e i loro snapshot rimangono consultabili.

## Workout

Il hub e il menu della sessione non espongono più le anteprime EMOM/Piramidale. Il componente interno di preview rimane nel repository ma non è importato dalle route dell'app. Standard, Recupero, EMOM e Piramidale reali conservano engine, timer, target/actual, persistenza offline e sync. La stima dello spazio delle label nel modal Correggi serie è stata resa conservativa per il font Inter: quando non entra una riga orizzontale, tutte le righe adottano insieme il layout compatto già esistente. Questo evita la troncatura di ZAVORRA (kg), senza cambiare valori o logica.

## Verifica

I test browser usano fixture locali e verificano il flusso A–P, incluse attivazione, bozza, modifica di un esercizio e storico dopo eliminazione. Le dimensioni verificate sono 320×740, 390×780, 393×851 e 430×860, con controlli su safe area, font al 130%, tab bar, giorni della settimana, popup e layout dei workout reali.

Gli screenshot web verificano il layout React Native Web. Il comportamento nativo del picker avatar, della tastiera e della chiusura dei modal su iOS richiede anche una prova su Expo Go; non viene dichiarata una verifica fisica del telefono.

I check richiesti sono `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check` e credential scan. Le prove locali escludono le credenziali backend; non richiedono connessioni a Neon, Clerk o OpenAI. Production non viene contattata.

Esito delle verifiche locali: lint (11 task), typecheck (10 task), 181 test unitari e 87 casi browser distinti superati. I casi browser sono stati completati in più esecuzioni, ripetendo i fallimenti dopo aver aggiornato i vecchi controlli di navigazione e isolato i clock delle fixture. Nessun caso della selezione finale è saltato. I clock delle prove EMOM evitano che il caricamento consumi i 10 secondi di preparazione e verificano anche il retry HTTP già presente dopo un salto virtuale del tempo.

`pnpm build` ha completato 6 task ed esportato Android, iOS e web con `EXPO_PUBLIC_AUTH_TEST=false`. Non sono stati prodotti APK/IPA né eseguite migration.
