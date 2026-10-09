# Progressi e Profilo — CLEAN

## Correzione funzionale avatar Android

Il contratto Expo 57 di `File.copy()` è asincrono. La precedente implementazione controllava la destinazione prima che la copia terminasse, rifiutando foto valide e rischiando di lasciare una copia tardiva. L'adapter ora attende la copia e verifica file non vuoto e decodifica con `Image.getSize` prima di aggiornare l'associazione. Il controllo preventivo `File.exists` sulla sorgente è stato rimosso: un provider Android `content://` può offrire uno stream leggibile senza uno stat affidabile.

Galleria e camera condividono questo percorso per `file://` e `content://`; la destinazione resta univoca e privata per UUID account. Filename/estensione del picker non sono necessari e la validazione verifica l'immagine effettiva. Solo la copia persistente viene salvata nei metadata esistenti. File illeggibili, vuoti o corrotti conservano il vecchio avatar ed eliminano la nuova copia; annullamento e permessi negati non salvano nulla. Nessuna modifica a schema, sync, API o grafica.

La regressione dell'adapter esegue il codice reale con il contratto nativo simulato (copia asincrona e provider senza stat): prima 4 casi fallivano, dopo 5/5 passano. Sono coperti galleria/camera, URI senza estensione, cancellazione/permessi, corruzione, rollback, restart, isolamento e rimozione. I test store/hook/browser coprono logout e riaccesso. Non è disponibile un telefono fisico: confermare su Android galleria → avatar immediato → chiusura/riapertura → logout/login stesso account, poi camera e account B.

La presentazione usa esclusivamente `JIMO_progressi_profilo_CLEAN.zip`. I cinque PNG in `apps/mobile/assets/jimo/progress-profile/` conservano i nomi e i byte originali. Le reference complete non sono incorporate nell’app. `dark-texture.png` è conservata per il pack ma non sovrapposta: l’hero scuro contiene già la texture necessaria.

Componenti locali in `apps/mobile/src/progress-profile/`: EditorialScreen, EditorialText, Copy, PaperCard, ProgressHero, ProfileHero, ProgressTabs, PeriodSelector, StatCard, ProgressChart, PersonalRecordRow, VolumePanel, ProfileStats, ProfileMenuRow e ProfileChoice. Titoli e valori usano il Cormorant Garamond già presente nel progetto; testi e controlli usano Inter già caricato dall’app. Nessuna dipendenza o immagine nuova.

## Progressi

Panoramica, Forza, Volume e Frequenza cambiano contenuto nella stessa route; le query, il periodo e la schermata restano montati. Volume conserva la selezione dell’esercizio e consulta il dettaglio solo quando la sezione è attiva. Il suo elenco non eredita la ricerca della sezione Forza. Restano tutti i periodi già supportati: 4/8/12 settimane, sei mesi e tutto lo storico; default otto settimane.

- Panoramica: completedWorkouts, completedSets, trainingSeconds e record server, con periodo effettivo restituito dall’API. Le barre usano i bucket settimanali esistenti.
- Forza: PR deterministici, ultima prestazione della stessa modalità se disponibile, ricerca degli esercizi allenati e paginazione esistente. Le righe aprono il dettaglio esercizio già disponibile.
- Volume: loadVolume e timeline reali per esercizio e coppia tracking/load mode, in **kg·reps**. Carico esterno e zavorra restano separati; corpo libero, assistenza e durata non ricevono un volume kg inventato. Paginazione, cache e limiti timeline restano visibili.
- Frequenza: sessionsPerWeek, bucket completedWorkouts, RPE osservato, reps, skipped sets e aderenza quando restituita dal server. Conserva storico, filtri completed/cancelled/all e apertura dei riepiloghi esistenti.

**Differenza necessaria dalla reference:** il contratto analytics non espone un volume globale, né serie storiche dei periodi precedenti per delta affidabili. La card “Volume totale” mostra `—` e rimanda alla sezione Volume; non viene inventato un grafico globale. Nessuna percentuale decorativa. Il numero di barre dipende dai bucket reali, non dai giorni illustrativi del mockup. Dati assenti/null, rete indisponibile, assenza di cache e dati cached hanno messaggi distinti e Retry dove applicabile. Il codice di cache/sync non è stato modificato.

SVG nativi responsivi alla larghezza effettiva della card, palette verde/sage, etichette delle date locali e summary accessibile con i valori rappresentati. I null interrompono le linee; lo zero resta zero. Un singolo punto non crea un trend. Oltre 26 punti viene dichiarato il limite visivo. Nessuna animazione introdotta.

## Profilo

Hero scuro del pack, nome reale da AccountProvider, monogramma derivato dal nome e motto editoriale. La foto opzionale è esclusivamente locale: non aggiunge campi al contratto account. L’altezza dell’hero segue il layout del testo, anche quando cresce il nome.

L’ingranaggio parchment nell’hero porta al menu della stessa schermata con uno scroll immediato e touch target di 48 px. Non introduce una route o un’impostazione nuova.

### Avatar locale

Il monogramma/foto è un pulsante di 84 px con un piccolo indicatore camera. Apre un modal accessibile con Scatta foto, Scegli dalla galleria, Rimuovi foto (solo quando presente) e Annulla. L’immagine usa crop circolare, `cover` e bordo cream. Nessuna modifica del resto del menu o di Clerk.

`expo-image-picker` richiede il relativo permesso solo alla scelta di camera/galleria. La copia viene conservata in `Paths.document/jimo/profile-avatars/<JIMO users.id>/`, mai nell’URI temporaneo del picker. Il riferimento persistente è salvato con `runtime.metadata(owner, 'localProfileAvatar:v1', uri)` nella struttura locale già esistente. Non è una nuova tabella e questa chiave non viene inserita nell’outbox né inviata all’API. I messaggi di permesso sono aggiornati in IT/EN; in Expo Go i prompt di sistema appartengono all’app host.

Lo stato visibile è vincolato all’owner corrente e le operazioni in corso vengono invalidate al cambio account. Un riferimento verso un’altra directory/account, un URL remoto o un file mancante viene ignorato. Riavvio e logout/login dello stesso account mantengono la foto sullo stesso dispositivo; disinstallare l’app/cancellarne i dati la rimuove. Non viene trasferita ad altri dispositivi.

Sostituzione: nuova copia prima di aggiornare l’associazione, eliminazione della vecchia copia dopo il salvataggio; se il salvataggio fallisce si elimina la nuova copia e si mantiene la precedente. Rimozione: associazione svuotata e copia locale eliminata, senza logout né modifica del profilo remoto. Le operazioni sono serializzate e un callback tardivo di un’immagine non può eliminare la nuova foto. Annullamento non cambia nulla; permessi negati e file/storage indisponibili producono messaggi locali IT/EN, senza log dei path. Expo web non offre il filesystem documenti nativo: mostra un messaggio di disponibilità sul telefono, senza fingere persistenza web.

Stat row: allenamenti completati, serie completate e allenamenti/settimana dal summary esistente, con intervallo reale (otto settimane). Nessuna streak, variazione di volume o conteggio PR parziale presentato come totale.

Menu su una superficie chiara unica:

- Account: email esistente, displayName e salvataggio tramite `account.update`.
- Lingua: System / Italiano / English, stessa preferenza e stessi callback account/locali. La lingua offline continua a usare il percorso account già presente.
- Unità: metric/imperial tramite `account.update`; aggiornamento disabilitato offline. Resta esplicito che i carichi di workout sono attualmente mostrati in kg.
- Privacy e dati: disclosure informativa dell’archiviazione e sincronizzazione già esistenti. Non offre export, cancellazione o backup inesistenti.
- Informazioni: versione da Expo config e licenza dei font; nessun collegamento supporto inventato.
- Esci: stesso controllo allenamento attivo/outbox e stessi avvisi Annulla/Esci comunque prima di `account.logout`.

Obiettivi, Misure, Tema, Notifiche e Backup manuale sono omessi perché non hanno un’azione disponibile in questo menu. Nessuna voce finge di funzionare. Nei test web Expo senza profilo account, Account/Unità sono disabilitati e l’identità è neutra; nell’app Clerk si usano i dati reali del provider invariato.

## Layout e verifiche

Gli hero di entrambe le schermate partono da y=0 e proseguono dietro la status bar. Rimossa la superficie fissa colorata che copriva l’inset superiore. L’automatismo degli inset della ScrollView è disabilitato: il contenuto applica esplicitamente gli inset, il background no. Status bar visibile, icone scure sull’hero chiaro di Progressi; chiare sull’hero scuro di Profilo e scure quando lo scroll porta il fondo parchment dietro le icone. Nessuna animazione aggiunta.

Titolo Progressi leggermente ridotto (32/36 px), stessi font/brush/background. Tab su una sola riga: pill visive di almeno 34 px, touch target di almeno 44 px, testo 15 px scalabile senza wrap; scorrimento orizzontale quando necessario. Selezione sage e underline/stato accessibile. Period selector e relativa logica invariati. Il warning nativo SVG `".6" is not a valid number or percentage` veniva da `Stop offset=".6"` nel velo del titolo: gli offset di questo SVG e dei grafici sono ora numeri, incluso `0.6`. Nessun LogBox silenziato.

ScrollView verticali, padding inferiore pari all’altezza completa della tab bar (già comprensiva di safe area) più 24 px; safe area superiore/laterale; larghezza massima 560 e nessun overflow orizzontale della schermata. Touch target menu e scelte almeno 48 px, etichette Inter e selezione navbar Progressi/Profilo anche con label più marcata. Navbar a quattro destinazioni; Workout resta escluso. Lo stile navbar Home/Scheda rimane invariato.

Test browser a 320×740, 390×780, 393×851 e 430×860 con safe area simulate: hero da y=0, contenuto protetto, avatar non tagliato, pill su una riga/touch target, valori DTO, grafici, route persistente, periodi, fallback, IT/EN e bottom inset. Il Profilo viene inoltre verificato con il componente reale e hook fixture isolati: nome/email, salvataggio nome, lingua, unità, logout/guard, avatar monogramma/foto/crop/cambio/rimozione/annullamento/permesso negato/file assente, account A/B, riavvio e logout/login. Le primitive OS del picker/filesystem sono simulate; store, hook e UI avatar restano quelli reali. Verificata anche la scelta del colore status bar durante lo scroll, senza simulare le icone native. Questa fixture genera un bundle temporaneo separato da Expo e non modifica Auth. Test unitari per copia persistente, rollback, invalidazione in corso, isolamento, file mancanti, permessi e annullamenti; test helper dei grafici invariati.

Tutti i comandi sono eseguiti senza DATABASE_URL e OPENAI_API_KEY nel processo: lint, typecheck, test, build Android/iOS/web e format:check. Nessuna migration e nessuna connessione a Neon, OpenAI o production. Il bundle finale usa `EXPO_PUBLIC_AUTH_TEST=false`. Le prove browser e i bundle Expo non sostituiscono la verifica fisica su Expo Go, VoiceOver/TalkBack e tastiera nativa.
