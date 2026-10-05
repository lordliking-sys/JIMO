# JIMO

JIMO è una futura app fitness per Android e iOS. Questa prima base contiene soltanto una home Expo Router e una API Fastify con health check. Non include database, autenticazione, AI o logica di allenamento.

## Stack e prerequisiti

- Node.js 24 LTS (versione di riferimento in `.node-version`).
- pnpm 11.19.0, indicato in `packageManager`.
- Expo SDK 57, React Native 0.86, React 19, Expo Router.
- Fastify 5, Zod 4, TypeScript 5.9 strict e Turborepo 2.
- ESLint 9 con configurazione Expo condivisa e Prettier 3.

Per provare il mobile su un dispositivo serve Expo Go compatibile con SDK 57, oppure un development build. Emulatori Android e simulatori iOS richiedono i rispettivi SDK; il simulatore iOS richiede macOS.

## Installazione

Dalla radice del checkout:

```sh
pnpm install --frozen-lockfile
pnpm build
```

Usare il checkout esistente: non serve creare un worktree. Il lockfile è versionato e le dipendenze Expo seguono le versioni compatibili ufficiali dell'SDK.

## Sviluppo

```sh
pnpm dev:mobile
pnpm dev:api
# oppure entrambi e i watcher dei package condivisi:
pnpm dev
```

Turbo compila le dipendenze workspace prima di avviare le app. Con `pnpm dev` avvia anche i watcher dei package condivisi; dopo modifiche ai package durante l'avvio di una sola app, eseguire `pnpm build` o usare `pnpm dev`.

La home mostra **JIMO** e **Train. Track. Progress.**. Expo offre i comandi per aprire Android, iOS o il browser. In un ambiente cloud usare `pnpm --filter @jimo/mobile dev --localhost` per controlli interni; l'accesso da telefono richiede una rete raggiungibile e non è validato dal cloud.

L'API ascolta sulla porta 3001 e su `0.0.0.0`. Per cambiare porta:

```sh
PORT=4321 pnpm dev:api
```

`.env.example` documenta `PORT`. Il file `.env` non viene caricato automaticamente: esportare la variabile nel processo, oppure usare il supporto nativo Node per il server compilato:

```sh
cp .env.example .env
pnpm build
node --env-file=.env apps/api/dist/server.js
```

Zod rifiuta porte non intere o fuori dall'intervallo 1–65535 e interrompe l'avvio. Nessun segreto è richiesto.

```sh
curl --fail http://localhost:3001/health
# {"status":"ok","service":"jimo-api"}
```

## Controlli

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
pnpm --filter @jimo/mobile check
```

`pnpm build` compila i package condivisi e l'API e genera i bundle Expo Android/iOS e il sito statico web in `apps/mobile/dist`. Non genera APK, AAB o IPA: quelli richiedono una toolchain nativa o un servizio di build, fuori da questo task. I test API verificano il contratto HTTP e la validazione della porta. Per formattare: `pnpm format`.

## Struttura

```text
apps/
  mobile/              Expo Router, home minimale
    app/_layout.tsx
    app/index.tsx
  api/                 Fastify
    src/app.ts
    src/server.ts
    src/env.ts
    src/routes/health.ts
    test/health.test.ts
packages/
  config/              ESLint e Prettier condivisi
  types/               HealthStatus
  schemas/             healthStatusSchema Zod
  ui/                  APP_NAME, nessun design system
docs/                  Note tecniche e verifica
```

`@jimo/schemas` importa `HealthStatus` da `@jimo/types`; l'API importa entrambi. Il mobile importa `APP_NAME` da `@jimo/ui`. I package runtime esportano JavaScript e dichiarazioni compilati in `dist`, senza alias TypeScript che nascondano problemi di risoluzione.

`tsconfig.base.json` abilita `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` e `noFallthroughCasesInSwitch`. Il mobile estende anche la configurazione Expo. `skipLibCheck` salta soltanto il controllo interno delle dichiarazioni delle dipendenze, non i controlli del codice applicativo.

## Ambito

Neon, PostgreSQL, Drizzle, autenticazione, OpenAI, AI Coach, importazione foto/PDF, workout engine, statistiche, pagamenti, notifiche e sincronizzazione offline saranno trattati in task successivi. Nessuno di questi servizi è configurato qui.

## Note per questo ambiente cloud

La home del runner è in sola lettura. Prima dei comandi, impostare:

```sh
export XDG_DATA_HOME=/workspace/.local/share
export XDG_CACHE_HOME=/workspace/.cache
export EXPO_NO_TELEMETRY=1
export EXPO_UNSTABLE_HEADLESS=1
```

La verifica online di Expo contatta `api.expo.dev`, non incluso nella policy di rete attuale. Il bundling non lo richiede. Per avviare Metro nel cloud senza questa connessione:

```sh
EXPO_OFFLINE=1 CI=1 pnpm --filter @jimo/mobile dev --localhost --port 8081
```

`EXPO_OFFLINE=1 pnpm --filter @jimo/mobile check` usa i metadati SDK locali e non equivale alla verifica online completa. Per quest'ultima aggiungere `api.expo.dev` ai domini consentiti nelle impostazioni ambiente. Non è richiesto alcun account Expo per i controlli locali.

ESLint 9 è mantenuto qui per compatibilità con la configurazione e i plugin Expo SDK 57; il registry ne segnala la fine del supporto. Un passaggio a ESLint 10 va effettuato insieme alla compatibilità dei plugin Expo.

`EXPO_UNSTABLE_HEADLESS=1` è l'opzione Expo per il runner senza interfaccia grafica: evita l'avvio dei DevTools desktop, che non funzionano nel sandbox. Metro e il bundling restano disponibili.
