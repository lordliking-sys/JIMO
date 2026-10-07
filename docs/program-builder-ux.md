# Program Builder mobile — completamento UX del Task 4

## Diagnosi e ambito

I contratti, `program-service.ts` e ProgramExercise supportano già modalità, serie, reps fisse/range, durata, kg, assistenza, RPE, recupero e note. Non è stato trovato un impedimento di persistenza. Backend, API, database e migration non vengono modificati. Nessun workout, sessione, actual o timer viene creato; Task 5 resta escluso.

La UX precedente mostrava azioni amministrative sopra il contenuto, card annidate e quattro controlli per ogni riga. L'icona Modifica era piccola, mentre kg e RPE erano in una sezione più bassa dell'editor. I numeri erano sempre input con tastiera. Questi elementi rendevano poco evidente la prescrizione anche se i campi esistevano.

## Builder

Il dettaglio presenta nome, stato, durata e data localizzata. Ogni giornata ha intestazione, numero esercizi, eventuale giorno settimana e note. Gli esercizi sono righe compatte separate da divider: nome, target/carico in verde, RPE/recupero sulla stessa riga e note quando presenti. Il tap sull'intera riga apre la prescrizione precompilata.

Ogni giorno ha Aggiungi esercizio; in fondo rimangono Aggiungi giorno e, se disponibile, Attiva programma. Modifica metadata e Archivia sono nel menu programma. Le azioni di giornata e riordino/rimozione esercizio hanno menu contestuali; conferme e contratti HTTP restano quelli esistenti. Su iOS la conferma successiva attende la chiusura del menu nativo.

Non sono presenti hero, immagini o decorazioni nel builder. La gerarchia usa piccoli label uppercase, token JIMO, bordi sottili e card compatte.

## Editor

Aggiungi esercizio → ricerca → selezione → prescrizione. Lo stesso editor viene usato per la modifica, con CTA «Salva modifiche». La modalità selezionata è una chip; i kg corrispondenti sono direttamente nella prima sezione.

| Modalità   | Controllo kg                        | Riepilogo                   |
| ---------- | ----------------------------------- | --------------------------- |
| Bodyweight | Nessun kg                           | `4 × 15 · Corpo libero`     |
| Weighted   | Carico aggiunto, prefisso `+`       | `4 × 8 · +20 kg`            |
| External   | Carico                              | `4 × 8 · 80 kg`             |
| Assisted   | Assistenza; più kg = più assistenza | `3 × 10 · Assistenza 15 kg` |

I campi incompatibili vengono inviati null secondo il contratto esistente. Riselezionare la stessa modalità conserva il peso; cambiarla azzera il valore precedente per evitare di interpretare un carico come assistenza. Serie restano 1–100, reps e durata mantengono i limiti Zod. Fixed/range/time restano mutuamente esclusivi; gli esercizi duration non mostrano reps.

Stepper e preset non montano un TextInput e non aprono la tastiera. Il tap sul valore, o su Recupero personalizzato, apre il campo inline e una conferma a check con target 48 px. L'input manuale conserva virgola e valori precisi, inclusi 1,25/2,50/5/7,50/12,50/22,50 kg. Gli step kg di 2,5 e RPE di 0,5 usano gli helper BigInt; i payload restano stringhe decimali canoniche.

RPE è opzionale: Nessuno e chip 7/7,5/8/8,5/9/9,5/10, più stepper. Recupero ha preset 30/60/90 sec, 2:00 e 3:00, possibilità di non impostarlo e controllo personalizzato. RPE, rest e note sono nell'editor ordinario.

KeyboardAvoidingView, misura del campo attivo, scroll senza animazione e CTA fuori dallo scroll rimangono in uso. La prova include il kg manuale con viewport 320 × 430, campo visibile e CTA raggiungibile. Non ci sono bottom sheet per i numeri.

## Giorni, settings e tab bar

Nome giornata, chip Lun–Dom/Nessun giorno specifico e note sostituiscono il campo numerico. `weekdayValue` mappa le scelte a 1–7 o null; la legenda tecnica è rimossa.

Nel checkout non è presente un ingranaggio JIMO flottante. Le sole icone settings JIMO sono negli header di Home/Programma: 22 px visivi, target 48 px, grigie. Builder, creazione programma, giornata ed editor non mostrano settings globali. Il menu di sviluppo di Expo Go appartiene al contenitore Expo.

La tab bar mantiene cinque tab con label IT Home/Scheda/Workout/Progressi/Profilo su una riga. Il padding interno di React Navigation sottraeva 10 px per tab: la caption viene ora centrata sulla larghezza totale della tab. Per font di sistema grandi usa caption più corte, con nomi completi per screen reader; solo queste caption hanno scaling massimo 1,5. Tutti i touch target rimangono almeno 48 px. I test misurano il testo renderizzato per escludere wrapping e clipping, oltre a contare le tab.

## Verifica FORZA senza Neon

Playwright esegue la UI effettiva: crea FORZA, 8 settimane, data 6 ottobre 2026; aggiunge PUSH/lunedì e PULL/venerdì; cerca e prescrive gli esercizi seguenti:

| Giornata | Esercizio               | Target   | Modalità/kg     | RPE | Recupero |
| -------- | ----------------------- | -------- | --------------- | --- | -------- |
| PUSH     | Panca piana             | 4 × 8    | External 80 kg  | 8   | 180 sec  |
| PUSH     | Dip                     | 3 × 8–12 | Weighted +10 kg | 8   | 120 sec  |
| PULL     | Trazioni                | 4 × 8    | Weighted +20 kg | 8   | 180 sec  |
| PULL     | Rematore con bilanciere | 4 × 10   | External 70 kg  | 8   | 120 sec  |

La prova riapre il builder, controlla le quattro prescrizioni, modifica kg/RPE/note, verifica l'incremento esatto da 81,25 a 83,75 kg, attiva e archivia tramite menu/conferma e cambia lingua per verificare la data inglese. Altri casi verificano assisted → bodyweight, azzeramento dei kg incompatibili, chip/nullo del giorno, riordino/rimozione, fixed/range/time, recupero custom e accesso manuale esplicito.

Le richieste sono intercettate interamente da un fixture HTTP in memoria validato con i contratti Zod esistenti. Non è una nuova prova di persistenza PostgreSQL: il backend era già verificato nel Task 4 e il vincolo di questo task esclude le modifiche Neon. Il test live Neon è preservato e aggiornato alle nuove interazioni, ma viene saltato intenzionalmente.

Per ripetere la verifica usare i comandi senza `DATABASE_URL`/`NEON_DEVELOPMENT_BRANCH_ID` in [mobile-ui-ux.md](mobile-ui-ux.md). Prima esportare con l'origin di test localhost:4301; attendere la fine del build prima di avviare Playwright. L'origin localhost serve solo a Chromium, non a Expo Go sul telefono.

Restano da verificare sul dispositivo tastiere OEM, VoiceOver/TalkBack, font di sistema elevati e la sequenza menu/conferma su iOS. Gli export Expo Android/iOS sono bundle JavaScript/Hermes, non APK/IPA.

Risultati del 2026-10-06: `pnpm lint`, `pnpm typecheck`, `pnpm test` (41 test unitari), `pnpm build` (export Android/iOS/web) e `pnpm format:check` passati. Playwright Chromium: 9 test UI passati e 1 test live Neon intenzionalmente saltato. Il test della tab bar misura una singola riga e l'assenza di clipping a 320/360/390/430 px, anche durante il ridimensionamento. Nessuna connessione Neon, migration o modifica a backend, schema, contratti condivisi o dipendenze eseguita per questo task.
