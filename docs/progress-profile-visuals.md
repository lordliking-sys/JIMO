# Progressi e Profilo — CLEAN

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

Hero scuro del pack, nome reale da AccountProvider, monogramma derivato dal nome e motto editoriale. Non esiste un avatar fotografico nel contratto attuale: nessuna fotografia illustrativa è attribuita all’utente. L’altezza dell’hero segue il layout del testo, anche quando cresce il nome.

L’ingranaggio parchment nell’hero porta al menu della stessa schermata con uno scroll immediato e touch target di 48 px. Non introduce una route o un’impostazione nuova. Una superficie fissa nell’inset superiore mantiene il contrasto delle icone di sistema anche dopo lo scroll.

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

ScrollView verticali, padding inferiore pari all’altezza completa della tab bar (già comprensiva di safe area) più 24 px; safe area superiore/laterale; larghezza massima 560 e nessun overflow orizzontale. Touch target menu e scelte almeno 48 px, etichette Inter, selezione dei tab con underline/stato accessibile e selezione navbar Progressi/Profilo anche con label più marcata. Navbar a quattro destinazioni; Workout resta escluso. Lo stile navbar Home/Scheda rimane invariato.

Test browser a 320×740, 390×780, 393×851 e 430×860 con safe area simulate: valori DTO, grafici, selezione, route persistente, periodi, fallback, IT/EN e bottom inset. Il Profilo viene inoltre verificato con il componente reale e hook fixture isolati: nome/email, salvataggio nome, lingua, unità, assenza di menu fittizi, logout e guard offline/attivo/pending. Questa fixture vive solo nei test e genera un bundle temporaneo separato dal bundle Expo; non modifica Auth e non simula una verifica Clerk reale. Test helper per gap null, zero, punto singolo, limiti e monogramma.

Tutti i comandi sono eseguiti senza DATABASE_URL e OPENAI_API_KEY nel processo: lint, typecheck, test, build Android/iOS/web e format:check. Nessuna migration e nessuna connessione a Neon, OpenAI o production. Il bundle finale usa `EXPO_PUBLIC_AUTH_TEST=false`. Le prove browser e i bundle Expo non sostituiscono la verifica fisica su Expo Go, VoiceOver/TalkBack e tastiera nativa.
