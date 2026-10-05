# Fondamenta tecniche

Il checkout JIMO è la radice del monorepo, senza un'ulteriore cartella `jimo/` annidata.

- L'API separa costruzione dell'app, registrazione delle route e avvio del processo.
- La validazione Zod della configurazione avviene prima di aprire la porta.
- SIGINT e SIGTERM chiudono Fastify in modo ordinato.
- I package condivisi sono privati e usano `workspace:*`.
- ESLint e Prettier hanno un'unica configurazione riutilizzabile in `@jimo/config`.
- TypeScript resta strict; nessun controllo viene disabilitato per correggere errori applicativi.
- L'export Expo verifica il bundle per le tre piattaforme; non sostituisce prove su dispositivi o build native firmate.

Nessuna infrastruttura dati, autenticazione o funzionalità fitness viene introdotta in questa fase.
