# Fondamenta tecniche

Il checkout JIMO è la radice del monorepo, senza un'ulteriore cartella `jimo/` annidata.

- L'API separa costruzione dell'app, registrazione delle route e avvio del processo.
- La validazione Zod della configurazione avviene prima di aprire la porta.
- SIGINT e SIGTERM chiudono Fastify in modo ordinato.
- I package condivisi sono privati e usano `workspace:*`.
- ESLint e Prettier hanno un'unica configurazione riutilizzabile in `@jimo/config`.
- TypeScript resta strict; nessun controllo viene disabilitato per correggere errori applicativi.
- L'export Expo verifica il bundle per le tre piattaforme; non sostituisce prove su dispositivi o build native firmate.

Il Task 2 aggiunge la application shell mobile e le preferenze locali; struttura e decisioni sono descritte in [application-shell.md](application-shell.md). Il Task 3 introduce schema Neon/Drizzle, migration HTTP transazionali e readiness Fastify; dettagli in [database.md](database.md). Task 4–5 aggiungono programmi e Workout Engine; il Task 6 introduce SQLite locale, outbox transazionale e sync idempotente, descritti in [offline-sync.md](offline-sync.md). Task 8 ora integra Clerk e profilo account, con fail-closed production.

Task 7 aggiunge analytics server read-only e cache SQLite delle ultime risposte. Formule, API, ownership, modalità, timezone e limiti: [Progress Analytics](progress-analytics.md). Nessuna tabella PR/aggregati o migration Neon.

Task 8 replaces temporary development identity with verified provider-backed authentication. See [Authentication and account identity](authentication.md) for Clerk → CurrentUser → internal UUID, versioned Neon identity migration, profile preferences and account-scoped offline/401 behavior.
