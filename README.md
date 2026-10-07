# JIMO

JIMO è un’app fitness Expo per Android/iOS/web. I Task 1–8 includono shell dark IT/EN, onboarding, Program Management, Workout Engine con target/actual e snapshot, SQLite offline-first/outbox/sync Neon, calendario Home e Progressi con statistiche e record deterministici. Task 8 aggiunge autenticazione Clerk, profilo account e isolamento offline; configurazione Clerk reale e verifica su telefono richiedono le chiavi development. AI e Task 9 restano futuri. Vedi [Progress Analytics](docs/progress-analytics.md) e [offline workout](docs/offline-sync.md).

## Stack e prerequisiti

- Node.js 24 LTS (versione di riferimento in `.node-version`).
- pnpm 11.19.0, indicato in `packageManager`.
- Expo SDK 57, React Native 0.86, React 19, Expo Router.
- Fastify 5, Zod 4, TypeScript 5.9 strict e Turborepo 2.
- ESLint 9 con configurazione Expo condivisa e Prettier 3.
- TanStack Query 5 per server state mobile.
- Inter, i18next/react-i18next, expo-localization, AsyncStorage, Reanimated e icone Lucide.

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

Prima dello sviluppo API impostare `NEON_DEVELOPMENT_BRANCH_ID=br-purple-math-b1fsq2wb` e, per il mobile, `EXPO_PUBLIC_API_URL` sull’origin raggiungibile dell’API. Con secret già iniettato eseguire `pnpm db:migrate` e `NODE_ENV=development ALLOW_DEV_SEED=1 pnpm db:seed`. CurrentUser ora risolve il token Clerk nell’UUID interno JIMO; vedi [autenticazione](docs/authentication.md). Il bypass legacy richiede esplicitamente `ALLOW_DEV_AUTH=true` solo development.

Turbo compila le dipendenze workspace prima di avviare le app. Con `pnpm dev` avvia anche i watcher dei package condivisi; dopo modifiche ai package durante l'avvio di una sola app, eseguire `pnpm build` o usare `pnpm dev`.

Al primo avvio si apre l'onboarding; dopo il completamento si aprono le tab Home, Programma, Allenamento, Progressi e Profilo. Lingua e scelte onboarding sono salvate localmente. Da Profilo si può passare subito a Italiano, English o Sistema. Expo offre i comandi per aprire Android, iOS o il browser. In un ambiente cloud usare `pnpm --filter @jimo/mobile dev --localhost` per controlli interni; l'accesso da telefono richiede una rete raggiungibile e non è validato dal cloud.

L'API ascolta sulla porta 3001 e su `0.0.0.0`. Per cambiare porta:

```sh
PORT=4321 pnpm dev:api
```

`.env.example` documenta `PORT`, `NODE_ENV` e `DATABASE_URL`; il secret Neon deve essere disponibile nel processo API. Il file `.env` non viene caricato automaticamente: iniettare le variabili nel processo, oppure usare il supporto nativo Node per il server compilato:

```sh
cp .env.example .env
pnpm build
node --env-file=.env apps/api/dist/server.js
```

Zod rifiuta porte non intere o fuori dall'intervallo 1–65535 e interrompe l'avvio. Zod richiede inoltre `DATABASE_URL` valido; gli errori non espongono il suo valore.

```sh
curl --fail http://localhost:3001/health
# {"status":"ok","service":"jimo-api"}
curl --fail http://localhost:3001/ready
# {"status":"ready","database":"ok"}
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

`pnpm build` compila i package condivisi e l'API e genera i bundle Expo Android/iOS e il sito statico web in `apps/mobile/dist`. Non genera APK, AAB o IPA: quelli richiedono una toolchain nativa o un servizio di build, fuori da questo task. I test API verificano health/readiness, configurazione e identità development; `pnpm test:api:db` verifica Program Management, Workout Engine, snapshot, actual, concorrenza e ownership A/B su Neon development. I test database verificano snapshot e validation, con integrazione Neon tramite `pnpm test:db`; i test mobile coprono onboarding, lingua, preferenze, form, decimali, client API, draft workout, recupero a timestamp e calendario settimanale. Il percorso browser reale è verificato con Playwright (vedi `docs/programs.md`). Per formattare: `pnpm format`.

## Struttura

```text
apps/
  mobile/              Expo Router, application shell
    app/_layout.tsx
    app/onboarding.tsx
    app/(tabs)/
    app/program/create.tsx
    src/
    test/
    e2e/
  api/                 Fastify
    src/app.ts
    src/server.ts
    src/env.ts
    src/routes/health.ts
    test/health.test.ts
packages/
  config/              ESLint e Prettier condivisi
  types/               HealthStatus
  database/            Schema Drizzle, Neon HTTP, migration e seed
  schemas/             Health, onboarding e validation DB Zod
  ui/                  Design tokens e componenti React Native
docs/                  Note tecniche e verifica
```

`@jimo/schemas` importa `HealthStatus` da `@jimo/types`; l'API importa entrambi. Il mobile importa componenti e token da `@jimo/ui` e gli schemi da `@jimo/schemas`. I package runtime esportano JavaScript e dichiarazioni compilati in `dist`, senza alias TypeScript che nascondano problemi di risoluzione.

`tsconfig.base.json` abilita `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` e `noFallthroughCasesInSwitch`. Il mobile estende anche la configurazione Expo. `skipLibCheck` salta soltanto il controllo interno delle dichiarazioni delle dipendenze, non i controlli del codice applicativo.

## Ambito

I Task 5–6 includono Workout Engine, recupero automatico, ripresa sessione, Home settimanale, storico basilare e workout offline-first con SQLite/outbox/sync. Autenticazione production, OpenAI, AI Coach, importazione foto/PDF, statistiche avanzate, pagamenti, notifiche push saranno trattati in task successivi. La base dati è documentata in [docs/database.md](docs/database.md); API, ownership, flussi manuali, configurazione e test in [docs/programs.md](docs/programs.md).

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

La struttura della shell, i flussi, le decisioni tecniche e i test end-to-end sono documentati in [docs/application-shell.md](docs/application-shell.md). Il report Task 1 in `docs/verification.md` resta una verifica storica del bootstrap.

Workout API, transazioni Neon HTTP, migration `0004`, target/actual, timer, test e verifiche telefono: [docs/workout-engine.md](docs/workout-engine.md).

Task 6: workout offline-first con SQLite, outbox e sync idempotente. Vedi [Offline e sync](docs/offline-sync.md). Il Program Builder resta online; Progressi Task 7 e autenticazione Task 8 sono descritti nella documentazione dedicata.

Authentication and account identity (Task 8): [setup, security, offline behavior and Clerk/device checklist](docs/authentication.md). Real auth requires a Clerk development instance; server-only development identity now needs explicit `ALLOW_DEV_AUTH=true`. Never place API secrets in mobile configuration.
