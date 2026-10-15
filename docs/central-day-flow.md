# Gestione quotidiana con dialog centrali

La Scheda mostra solo i giorni, il nome dell'allenamento e il numero di esercizi.
Nomi esercizi e prescrizioni sono nel dialog della giornata. Un giorno di riposo
apre lo stesso dialog con la creazione già riferita al weekday selezionato.
Nome e note sono modificabili senza riproporre il selettore del giorno.

`components/JimoDialog.tsx` è la base comune dei popup Nuova/Cambia/Modifica
scheda, giornata, libreria, configurazione esercizio e foto profilo. Usa una
superficie blush, larghezza 86% con massimo 370 px, altezza intrinseca con limite
80% e scroll interno. Gestisce X, backdrop, Android back/Escape, safe area,
tastiera, focus, fade/scale e reduced motion. Le modifiche non salvate chiedono
conferma; operazioni pendenti impediscono di chiudere o cambiare step.

`programs/DayDialog.tsx` mantiene un unico Modal nativo passando fra dettaglio,
modifica giorno, ricerca esercizi, creazione custom e prescrizione. Gli editor
esistenti vengono renderizzati senza Screen/hero annidati. Dopo salvataggio o
rimozione si torna alla lista aggiornata. Restano ricerca, miniature, esercizi
custom, ordinamento di giornate/esercizi e conferme di eliminazione.

Standard, range/fisse, durata, carichi, assistenza preesistente, RPE, recuperi,
note, target per serie Piramidale ed EMOM continuano a usare schemi e mutation
esistenti. Nessuna modifica al modello dati o a TARGET/ACTUAL.

La Home conserva solo la chiave della data selezionata nella settimana locale.
Legge sempre i DTO correnti della scheda attiva; le completate sono associate
alla data locale effettiva, anche attraverso DST. Distingue selezionato, oggi e
completato. Riposo e giornata vuota mostrano Modifica, senza Play/Start; senza
scheda attiva si accede alla Scheda. Modifica apre la tab Scheda e il dialog del
giorno richiesto. Start usa l'azione reale esistente e apre direttamente la
sessione; una sessione in corso ha precedenza e viene ripresa senza duplicati.

Non è stato introdotto un secondo cache layer: salvataggi e rimozioni passano
da `useProgramMutation`, applicazione del DTO in SQLite, aggiornamento della
query locale e invalidazione/refetch già presenti. Il dialog conserva ID e step,
non copie di giornate o prescrizioni da riutilizzare dopo una mutation.

Le route legacy restano per compatibilità con deep link esistenti. La UI
Scheda e i link di gestione della giornata non le usano più per dettaglio,
libreria o prescrizioni.

Login: asset originali invariati, fata leggermente rientrata per appoggiare le
mani alla pill; larghezza e crop del lifter adattati per mostrare torso e inizio
addome. Il background copre l'intera vista misurata, incluso il fondo e la safe
area, senza pannello/footer bianco artificiale. Auth/Clerk non cambiano.

Foto profilo: usa il dialog condiviso senza il precedente PaperCard/ScrollView
che poteva occupare tutta l'altezza. Camera, galleria, permessi, rimozione e
associazione locale all'account mantengono gli stessi adapter e store.

Le verifiche browser usano solo API HTTP, Auth e picker simulati. Viewport:
320×740, 390×780, 393×851 e 430×860; il login copre anche 360×800 e 412×915.
La prova di tastiera è una riduzione del viewport: il controllo su telefono
fisico con Expo Go resta distinto. Nessun contatto con Neon, Clerk reale,
OpenAI o production; nessuna migration.

Check: lint, typecheck, 193 test unitari, format check ed export Android/iOS/web.
Superati 68 casi browser selezionati fra flussi quotidiani, cache/cancellazione,
popup, navbar, layout Home/Scheda, login, password e foto profilo. Le asserzioni
dei test precedenti sono aggiornate al nome della giornata in Home, al nuovo
calendario e ai passaggi nello stesso dialog. Confronto SHA-256 di 237 file
protetti superato, inclusi API, schema, Auth, sync, engine e artwork originali.
