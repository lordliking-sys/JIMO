# JIMO — Task 2: application shell

## Routing

```text
app/
  _layout.tsx             Bootstrap, tema, splash e route protette
  +html.tsx               Documento web scuro prima dell'idratazione
  onboarding.tsx          Wizard di sette passaggi
  (tabs)/
    _layout.tsx           Home, Programma, Allenamento, Progressi, Profilo
    index.tsx
    program.tsx
    workout.tsx
    progress.tsx
    profile.tsx
  program/create.tsx      Tre modalità, tutte «In arrivo»
```

Le route delegano il lavoro a componenti e helper in `src/`. L'API Fastify resta invariata.

## Avvio e preferenze

1. La splash nativa resta visibile durante il caricamento di AsyncStorage, Inter e lingua.
2. Dopo aver determinato le preferenze e le route consentite, compare il wordmark animato.
3. Al primo avvio si apre l'onboarding; dopo il completamento si aprono le tab.

La transizione dura circa 1070 ms al primo avvio e 900 ms agli avvii successivi. Con reduced motion dura circa 30 ms. Durante la transizione il contenuto sottostante non è interattivo né esposto agli screen reader.

I sette passaggi sono: benvenuto, lingua, obiettivo, livello, giorni, attrezzatura e modalità iniziale. Le scelte obbligatorie abilitano il proseguimento. L'attrezzatura è multi-select; giorni, obiettivo e livello sono a selezione singola. Indietro conserva le scelte del wizard nella sessione.

La scelta della modalità finale valida il profilo completo e scrive un unico record `jimo.preferences.v1`, comprendente `onboardingCompleted`, `localePreference` e i dati onboarding. La navigazione cambia soltanto dopo il salvataggio riuscito. Le modalità AI, importazione e manuale sono semplici preferenze; nessuna genera un programma.

La lingua viene persistita anche durante l'onboarding. Le altre scelte incomplete restano in memoria: interrompere il wizard richiede ripartire dal benvenuto. Dati persistiti malformati o di versione sconosciuta ricadono su un primo avvio sicuro. Un errore di lettura mostra Riprova; un errore di scrittura conserva la schermata corrente e mostra un messaggio tradotto.

Le route principali non sono accessibili prima del completamento, anche tramite deep link. Il wizard non si riapre involontariamente dopo il completamento.

## Design system

`packages/ui/src/tokens.ts` centralizza colori, spacing, radius, typography e sizes. `components.tsx` esporta Screen, Text, Button, Card, IconButton e Divider. I componenti usano StyleSheet, target di almeno 48 px, scaling del testo e SafeAreaView. Le schermate delle tab delegano il bordo inferiore alla tab bar; le altre lo gestiscono direttamente.

Inter 400/500/600/700 è inclusa localmente tramite `@expo-google-fonts/inter`, senza richieste a un CDN. Le icone Lucide usano i subpath pubblici delle singole icone per contenere i bundle. Nessun framework UI aggiuntivo.

`assets/wordmark.png` è soltanto l'adattamento provvisorio del testo JIMO per la splash nativa. Non è un logo o un'icona definitiva. Il wordmark nell'app è testo React Native. Lo sfondo resta `#090B0F`, anche nel documento web prima dell'avvio.

## Lingue

```text
src/i18n/
  index.ts                Istanza i18next e aggiornamento lang sul web
  locale.ts               Risoluzione pura della preferenza
  resources.ts
  types.d.ts              Chiavi tipizzate
  locales/
    it/{common,onboarding,navigation}.json
    en/{common,onboarding,navigation}.json
```

System segue `expo-localization/useLocales`; le preferenze it/en forzano la lingua. Un dispositivo italiano usa italiano, tutti gli altri usano English come fallback. Profilo permette di cambiare realmente la preferenza senza riavviare l'app. La tagline ufficiale resta «Train. Track. Progress.» in entrambe le risorse.

## Controlli

Dalla radice, con le variabili cloud indicate nel README:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
CI=1 pnpm build
pnpm format:check
pnpm peers check
```

`pnpm test` esegue 9 test mobile e i 2 test API. I test mobile coprono schema, gating degli step, record persistiti, corruzione, errori di storage, risoluzione lingua, parità delle traduzioni e plurali.

Dopo la build, per le due prove end-to-end web:

```sh
pnpm --filter @jimo/mobile exec playwright install chromium
pnpm --filter @jimo/mobile test:ui
```

Nel cloud Chromium è già disponibile; è stato usato:

```sh
CHROMIUM_PATH=/usr/bin/chromium pnpm --filter @jimo/mobile test:ui
```

Il runner avvia e arresta il server statico di test. Verifica il flusso completo, il secondo avvio, le tab, i placeholder, IT/EN/System, i deep link, il fallback di una lingua non supportata e assenza di errori JavaScript. Controlla l'assenza di overflow orizzontale a 320, 375, 390, 393 e 430 px e che le etichette delle tab rimangano nel viewport. Screenshot e trace sono in `apps/mobile/test-results/`, ignorati da Git.

## Verifiche su dispositivi reali

Export Android/iOS/web e introspezione dei plugin nativi Expo non equivalgono a una build APK/IPA. Verificare in un development/release build Android e iOS: splash effettiva (Expo Go non è una verifica fedele), assenza di flash, notch, navigation bar Android, Dynamic Type, VoiceOver/TalkBack, reduced motion e cambi di lingua del sistema. Il browser verifica il flusso e il layout, non questi comportamenti hardware.

Database, autenticazione, AI, importazione, workout engine e statistiche restano fuori da questo task.
