# UI/UX mobile — Program Management

Il polish riguarda esclusivamente le schermate mobile e i componenti UI. Backend, API, schema, migration e dati Neon restano invariati. Task 5 non è iniziato.

## Direzione visiva

Home, Programma e creazione manuale condividono un header con branding piccolo, titolo leggibile, sottotitolo discreto e linee astratte che richiamano una pista. Profilo, Allenamento, Progressi ed editor usano la variante leggera. Tutti i colori provengono dai token JIMO; niente immagini remote, personaggi, gradienti o nuove animazioni.

Gli ingranaggi di Home e Programma hanno lo stesso stile grigio e aprono il Profilo esistente. Nel Profilo l'icona della card lingua è un simbolo Lingue, non un ulteriore pulsante impostazioni. La selezione delle lingue conserva testo, check, bordo e stato accessibile, con righe di almeno 48 px.

Gli empty state hanno un'icona incorniciata e una gerarchia più leggibile. La CTA degli empty state Home e Programma apre direttamente la creazione manuale. In Programma AI e import rimangono testo secondario «In arrivo», senza azioni. Il selettore metodi esistente rimane disponibile dal flusso Nuovo programma.

La tab bar conserva cinque tab, label a 13 px e target di almeno 48 px. Usa Scheda e Workout in italiano; i nomi accessibili rimangono Programma e Allenamento. Le label restano su una riga. La larghezza del testo include il padding interno delle tab di React Navigation; con font di sistema più grandi le caption diventano Dati/Gym/Piano/Io. Solo le caption della tab bar hanno un massimo di scaling 1,5 per mantenere cinque label leggibili su una riga; i nomi accessibili completi restano disponibili. Lo stato attivo usa soltanto i token verde/elevated.

## Input rapidi

I valori sono mostrati come pulsanti centrali, affiancati da −/+. Stepper e preset non aprono la tastiera. Il tap sul valore abilita esplicitamente l'inserimento manuale inline, con una conferma a check. I controlli RPE e recupero presentano prima i preset:

| Campo                 | Passo      | Scorciatoie                                 |
| --------------------- | ---------- | ------------------------------------------- |
| Settimane             | 1          | Non impostato, 4, 8, 12                     |
| Serie                 | 1          | Limiti 1–100                                |
| Ripetizioni e min/max | 1          | Limiti del contratto esistente              |
| Durata esercizio      | 15 secondi | Inserimento manuale preciso mantenuto       |
| Kg                    | 2,5 kg     | Inserimento manuale, anche 1,25 kg          |
| RPE                   | 0,5        | Nessuno, 7, 7,5, 8, 8,5, 9, 9,5, 10         |
| Recupero              | 30 secondi | Non impostato, 30, 60, 90, 120, 180 secondi |

Gli step interi rispettano i limiti esistenti. I kg e RPE continuano a usare gli helper decimali esatti con BigInt, accettano la virgola e vengono inviati come stringhe canoniche. Nessun arrotondamento del carico manuale per adattarlo al passo. La validazione Zod precedente rimane in uso.

Il form programma distingue i dettagli dalla pianificazione; la prescrizione distingue modalità/carico, volume, intensità e recupero/note. Placeholder e bordo di focus sono tradotti e leggibili. Gli errori di validazione appaiono vicino alla CTA fissa. Kg compaiono accanto alla modalità; zavorra mostra `+`, assistito mostra «Assistenza». Il builder e le chip dei giorni sono descritti in [program-builder-ux.md](program-builder-ux.md).

## Calendario e tastiera

`@react-native-community/datetimepicker` 9.1.0 corrisponde alla versione inclusa nell'SDK Expo 57 del progetto. Android usa il dialog nativo; iOS un calendario inline in un modal con Conferma/Annulla. Non servono APK/IPA per Expo Go compatibile. Il web usa un input calendario del browser. La data selezionata viene mostrata in formato leggibile IT/EN e può essere rimossa. Il calendario Android segue la lingua del sistema operativo.

Le date vengono convertite con i componenti locali anno/mese/giorno, senza `toISOString()` o passaggi UTC. I test includono date impossibili, anni bisestili, fusi orari diversi e cambi dell'ora legale.

I form hanno KeyboardAvoidingView, scroll del campo attivo basato sulla misura del viewport e un footer fuori dallo scroll. Il viewport misurato esclude il footer: il campo deve rimanere sopra la CTA, oltre che sopra la tastiera. Il ricalcolo avviene su focus, layout, contenuto e apertura/cambio della tastiera; lo scroll non aggiunge animazioni. «Chiudi tastiera» rende gestibili anche le tastiere numeriche senza tasto Done. La ricerca esercizi adotta lo stesso scroll e comando di chiusura. Non sono introdotte bottom sheet per i numeri.

## Verifica senza Neon

Per questa verifica rimuovere `DATABASE_URL` e `NEON_DEVELOPMENT_BRANCH_ID` dall'ambiente dei comandi. Playwright avvia il backend Neon quando il secret è presente: non va fornito per i test UI di questo polish.

```sh
env -u DATABASE_URL -u NEON_DEVELOPMENT_BRANCH_ID pnpm lint
env -u DATABASE_URL -u NEON_DEVELOPMENT_BRANCH_ID pnpm typecheck
env -u DATABASE_URL -u NEON_DEVELOPMENT_BRANCH_ID pnpm test
env -u DATABASE_URL -u NEON_DEVELOPMENT_BRANCH_ID EXPO_PUBLIC_API_URL=http://localhost:4301 pnpm build
env -u DATABASE_URL -u NEON_DEVELOPMENT_BRANCH_ID CHROMIUM_PATH=/usr/bin/chromium pnpm --filter @jimo/mobile test:ui
env -u DATABASE_URL -u NEON_DEVELOPMENT_BRANCH_ID pnpm format:check
```

L'URL localhost sopra serve soltanto ai test Chromium sullo stesso computer. Expo Go sul telefono deve continuare a usare l'API LAN raggiungibile del PC, per esempio `EXPO_PUBLIC_API_URL=http://192.168.1.138:3001` in `apps/mobile/.env.local`. Non inserire secret nel mobile e non eseguire migration per installare questo polish.

I test UI del form intercettano l'intero origin API e verificano i payload senza backend reale: metadata/date, settimane, decimali, RPE, recupero, fixed/range/time e validazione. Controllano larghezze 320/390/430 e simulano un viewport ridotto a 430 px con campo attivo e CTA visibili. Rimangono le regressioni onboarding, lingue, saluto e tab bar; il test che persiste su Neon viene intenzionalmente saltato.

Restano da verificare fisicamente su Android/iPhone: dialog/calendario nativo, tastiere OEM, rotazione e riapertura tastiera, safe area, scaling del testo molto alto, VoiceOver/TalkBack. Il viewport ridotto nel browser non sostituisce una prova della tastiera nativa. Gli export Android/iOS sono bundle JavaScript/Hermes, non build native firmate.

Verifica del primo polish, 2026-10-06: lint, typecheck, 36 test unitari, export Android/iOS/web e format check passati; 7 test UI Chromium passati e 1 test Neon intenzionalmente saltato. Nessuna migration o connessione Neon eseguita per quel polish. I risultati successivi del completamento Program Builder sono in [program-builder-ux.md](program-builder-ux.md).

## Visual / UX cleanup dopo Task 8

Questo pass modifica solo presentazione mobile e componenti UI. API, database,
Neon, workout engine, sync, analytics e architettura account restano invariati.
Settings è nel Profilo: gli header non espongono più alcun ingranaggio e non
esistono controlli settings sovrapposti alle schermate o ai form.

`BrandMark` è un componente autonomo con placeholder tipografico neutro e prop
`asset` per il futuro SVG/PNG originale JIMO; `Wordmark` mantiene il punto di
integrazione delle schermate esistenti. Nessuna falsa J brush o font decorativo.
Gli header usano il brand discreto, titolo e spazio, senza il grande pannello.

Auth mantiene un'unica CTA primaria nel footer visibile con la tastiera. Crea
account, recupero password, reinvio e ritorno sono text buttons. Le eye icon
sono dentro i campi password, con label localizzata e target di 48 px. L'avviso
password consiglia una password lunga e unica senza inventare la policy Clerk.
Gli errori Clerk distinguono password corta (almeno X se `meta.min_length` è
fornito), comune/debole, compromessa, coincidente con identificatore/password
precedente, troppo lunga e requisiti strutturati su maiuscole/minuscole/numeri/
simboli. Nessun messaggio raw del provider o contenuto inserito viene mostrato.
Le regole definitive e la validazione restano in Clerk, senza nuove chiamate o
cambi al flusso di autenticazione.

Home conserva la settimana compatta e gli stati separati: oggi sottolineato,
programmato con punto, completato con check, e selezione discreta. Le label
visive italiane sono LUN MAR MER GIO VEN SAB DOM; la traduzione di domenica era
già Dom ed è coperta da un'asserzione. La struttura del programma attivo usa
nomi, conteggi e divider. Quando più giorni sono disponibili, solo il primo
start è primario, gli altri restano disponibili come azioni testuali.

Program detail presenta nome/stato, durata e data su una riga, descrizione,
giorni ed esercizi separati da divider. I giorni non sono più card annidate.
Aggiungi giorno/esercizio sono azioni testuali; attivazione rimane primaria.
I form programma/giorno/prescrizione/esercizio personalizzato usano sezioni
senza superfici chiuse. I cataloghi usano righe leggibili con target completo.
Input e chip hanno padding compatto, target minimo 48 px, focus visibile e
scaling del testo. DateField e gestione nativa della tastiera non cambiano.

Workout conserva la struttura e tutti i callback: target su una riga con RPE,
nessuna spiegazione del prefill del range o duplicazione RPE target. Salta
serie/annulla correzione sono testuali. Rest conserva il timer grande, nome e
numero della prossima serie, target e righe completate compatte/tappabili per
correzione; non mostra una seconda spiegazione né le righe ancora da eseguire.

`SegmentedControl` imposta `flexGrow: 0` e `flexShrink: 0` sullo ScrollView:
periodi e filtri storico non assorbono più l'altezza libera dello screen.
I segmenti scorrono orizzontalmente se necessario, conservando label complete
per screen reader, stato radio e target minimo 48 px. I periodi visivi sono
4 sett / 8 sett / 12 sett / 6 mesi / Tutto (equivalenti EN); non si impone
un'altezza fissa che tagli il testo ingrandito. Progressi usa metriche, sezioni,
ANDAMENTO, record, ricerca e storico senza aggiungere card. Exercise detail
riduce le label a PR / ULTIMA, preservando modalità, dati e grafici.

Le cinque tab mantengono Home / Scheda / Workout / Progressi / Profilo in IT
(equivalenti EN), senza sostituzioni con Gym/Dati/Io. Il font resta 12–13 px;
il massimo scaling della sola caption dipende dallo spazio disponibile per
mantenere una riga leggibile. I nomi screen-reader restano completi e i target
non sono ridotti. Palette dark e accent originali, safe area e reduced motion
sono preservati; nessun workaround per i warning Expo Go.

Verifica di questo pass: lint, typecheck, 92 test unitari, build Android/iOS/web
più API/packages e format check. Gli 11 test browser selezionati passano e usano esclusivamente
fixture e SQLite locale, con DATABASE_URL rimosso e senza server Neon. Coprono
auth, builder, offline, Home/tab/lingue, periodi, storico e workout/rest. Il
selector è controllato a 320/390/430 px: una sola riga, altezza 48–64 px e cinque
segmenti; le tab sono controllate per ellissi, righe, leggibilità e touch target.
Il test export con EXPO_PUBLIC_AUTH_TEST=true è solo locale/loopback e viene
sostituito dall'export ordinario alla fine. Nessuna migration o seed.
La verifica browser non sostituisce una nuova prova su telefono per tastiera,
scaling nativo, TalkBack/VoiceOver e safe area. Task 9 non iniziato.
