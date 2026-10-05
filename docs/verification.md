# Verifica delle fondamenta

Controlli eseguiti nell'ambiente cloud il 6 ottobre 2026 (Europe/Berlin), con Node 24.19.0 e pnpm 11.19.0.

| Controllo                        | Risultato                                                        |
| -------------------------------- | ---------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Riuscito, ripetibile                                             |
| `pnpm peers check`               | Nessun conflitto peer                                            |
| `pnpm lint`                      | Riuscito su tutti i package con script lint                      |
| `pnpm typecheck`                 | Riuscito, inclusi i test API                                     |
| `pnpm test`                      | 2 test API passati, nessuno saltato                              |
| `pnpm build`                     | Package e API compilati; export Expo Android, iOS e web riuscito |
| `pnpm format:check`              | Riuscito dopo formattazione                                      |
| Avvio API compilata              | Riuscito sulla porta 3001                                        |
| Avvio `PORT=4321 pnpm dev:api`   | Riuscito, override conservato da Turbo                           |
| `GET /health` via HTTP           | Risposta 200 con `status: ok` e `service: jimo-api`              |
| `expo config --type public`      | Configurazione risolta correttamente                             |
| Avvio Expo headless offline      | Metro avviato senza errori di configurazione                     |
| Richiesta HTTP alla home Expo    | HTML contiene JIMO e Train. Track. Progress.                     |

## Limiti dei controlli

La verifica **online** `expo install --check` è bloccata dalla policy di rete (`api.expo.dev`). La variante offline riferisce dipendenze aggiornate, ma Expo avvisa che questa validazione è meno affidabile. Le versioni principali sono state selezionate dal file ufficiale `bundledNativeModules.json` dell'SDK installato; gli export di tutte le piattaforme sono riusciti.

Il primo avvio Expo ha tentato di preparare i DevTools desktop, incompatibili con il sandbox del runner. L'opzione Expo `EXPO_UNSTABLE_HEADLESS=1` risolve questo problema senza modificare dipendenze o disabilitare il sandbox. Il server è stato riavviato e la home verificata via HTTP.

Non sono state eseguite build APK/AAB/IPA, prove su emulatori/dispositivi o verifica in un nuovo task dopo la pubblicazione. I bundle JavaScript/Hermes non equivalgono a una build nativa firmata. Nessun database, servizio AI o sistema di autenticazione è stato installato.

Il registry segnala ESLint 9 e la dipendenza transitiva uuid 7 come deprecati. ESLint 9 è compatibile con l'attuale configurazione Expo; il suo aggiornamento richiede verificare insieme i plugin.
