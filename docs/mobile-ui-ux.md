# UI/UX mobile — Program Management

Il polish riguarda esclusivamente le schermate mobile e i componenti UI. Backend, API, schema, migration e dati Neon restano invariati. Task 5 non è iniziato.

## Direzione visiva

Home, Programma e creazione manuale condividono un header con branding piccolo, titolo leggibile, sottotitolo discreto e linee astratte che richiamano una pista. Profilo, Allenamento, Progressi ed editor usano la variante leggera. Tutti i colori provengono dai token JIMO; niente immagini remote, personaggi, gradienti o nuove animazioni.

Gli ingranaggi di Home e Programma hanno lo stesso stile grigio e aprono il Profilo esistente. Nel Profilo l'icona della card lingua è un simbolo Lingue, non un ulteriore pulsante impostazioni. La selezione delle lingue conserva testo, check, bordo e stato accessibile, con righe di almeno 48 px.

Gli empty state hanno un'icona incorniciata e una gerarchia più leggibile. La CTA degli empty state Home e Programma apre direttamente la creazione manuale. In Programma AI e import rimangono testo secondario «In arrivo», senza azioni. Il selettore metodi esistente rimane disponibile dal flusso Nuovo programma.

La tab bar conserva cinque tab, label a 13 px e target di almeno 48 px. Sui display compatti usa Scheda e Workout in italiano; i nomi accessibili rimangono Programma e Allenamento. Il testo può andare a capo e non viene troncato. Lo stato attivo usa soltanto i token verde/elevated.

## Input rapidi

I valori sono modificabili direttamente nel campo centrale, affiancato da pulsanti −/+:

| Campo                 | Passo      | Scorciatoie                                 |
| --------------------- | ---------- | ------------------------------------------- |
| Settimane             | 1          | Non impostato, 4, 8, 12                     |
| Serie                 | 1          | Limiti 1–100                                |
| Ripetizioni e min/max | 1          | Limiti del contratto esistente              |
| Durata esercizio      | 15 secondi | Inserimento manuale preciso mantenuto       |
| Kg                    | 2,5 kg     | Inserimento manuale, anche 1,25 kg          |
| RPE                   | 0,5        | Nessun RPE, 7, 8, 9                         |
| Recupero              | 30 secondi | Non impostato, 30, 60, 90, 120, 180 secondi |

Gli step interi rispettano i limiti esistenti. I kg e RPE continuano a usare gli helper decimali esatti con BigInt, accettano la virgola e vengono inviati come stringhe canoniche. Nessun arrotondamento del carico manuale per adattarlo al passo. La validazione Zod precedente rimane in uso.

Il form programma distingue i dettagli dalla pianificazione; la prescrizione distingue modalità, volume, intensità e recupero/note. Placeholder e bordo di focus sono tradotti e leggibili. Gli errori di validazione appaiono vicino alla CTA fissa.

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

Verifica del 2026-10-06: lint, typecheck, 36 test unitari, export Android/iOS/web e format check passati; 7 test UI Chromium passati e 1 test Neon intenzionalmente saltato. Nessuna migration o connessione Neon eseguita per questo polish.
