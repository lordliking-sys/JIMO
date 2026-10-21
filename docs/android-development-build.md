# Task 12 — Android development build

Percorso scelto: Expo Development Build **locale Windows**, senza EAS/store o
credenziali Expo aggiuntive. Guida completa:
[ANDROID FIRST INSTALL](real-device-beta-checklist.md#android-first-install--windows).

## Configurazione minima

- `app.json` conserva nome/scheme/plugin di base. `app.config.ts` abilita con
  `JIMO_APP_VARIANT=development` nome **JIMO Dev**, package
  **com.jimo.development**, scheme **jimo-dev**, dev launcher e policy HTTP adatta
  all'API scelta. Nessun URL personale hardcoded.
- Fuori dalla variante development restano identità, extra e policy rete
  precedenti; il plugin dev-client ha addGeneratedScheme=false per impedire che
  l'auto-plugin Expo aggiunga il nuovo scheme launcher alla configurazione base.
  Non sono stati creati identificativi, URL o chiavi di firma production.
- Pacchetti allineati alla mappa Expo SDK 57: expo-dev-client `~57.0.20`
  (compatibile con il range SDK `~57.0.19`) ed expo-build-properties `~57.0.22`,
  con lockfile versionato. Nessun altro upgrade.
- `.env.local` del mobile: solo API URL, Clerk **publishable** key development e
  AI flag false. Template pubblico in `apps/mobile/.env.example`; server secrets
  restano nella `.env` della root, esclusa da Git.
- Le tre entry `android:check`, `android:dev`, `android:metro` sono comandi Node
  compatibili PowerShell: caricano la `.env.local` del mobile, selezionano la
  variante development, disabilitano AI/auth test e verificano health/ready prima
  di proseguire. Al processo Expo figlio non vengono inoltrati i principali
  secret server eventualmente ereditati dal terminale.
- URL loopback rifiutato, salvo opt-in esplicito `JIMO_DEV_API_TRANSPORT=adb`
  documentato insieme ad adb reverse. `0.0.0.0`, URL con credenziali/query e chiavi
  Clerk live non sono accettati per questo flusso.
- Fastify era già su `0.0.0.0`; nessuna modifica API/bind production. Neon usa
  ancora HTTP e guard branch development. Nessun Postgres locale, migration o seed.
- Clerk email/password/verifica/reset usa il flusso esistente; nessun OAuth o
  redirect aggiunto. Restano SecureStore e resourceCache ufficiali, SQLite,
  outbox, image picker on-demand e permessi localizzati. Nessuna policy nuova per
  i conflitti offline: resta la documentazione Task 11.

## Blocker reale corretto

Primo login con `/me` non raggiungibile e senza cache account: l'errore veniva
ridotto a boolean e presentato come errore delle **preferenze**. Ora il provider
mantiene una categoria sicura; nella sola variante development il fallback già
esistente distingue rete/timeout, configurazione, sessione e server 500. Testo
IT/EN, Retry e timeout esistenti; nessun raw JSON, stack, URL o secret mostrato.
Gli account già cached continuano a funzionare offline. Il testo standard fuori
dalla variante development è preservato, senza aggiungere schermate o redesign.

## Verifiche concrete e limiti

- Prebuild Android da template Expo installato, offline e `--no-install`, in
  `/tmp/jimo-task12-native-project`: **PASS**. I progetti nativi generati non sono
  stati copiati/committati nel repository.
- Verificati namespace/applicationId com.jimo.development, intent jimo-dev,
  cleartext development per LAN, adjustResize e signingConfigs.debug. Nel default
  l'introspezione mantiene scheme jimo e nessun override cleartext.
- INTERNET presente; CAMERA proviene anche dal manifest della libreria image
  picker, foto/galleria richieste on-demand, RECORD_AUDIO bloccato tramite merge
  rule remove. Nessun permesso camera richiesto al primo avvio dal codice JIMO.
- Prebuild avvisa che i vecchi campi androidStatusBar/androidNavigationBar sono
  deprecati in Expo 57. Non è un errore di generazione: il contrasto status bar è
  già gestito dai componenti expo-status-bar delle schermate; comportamento OS e
  navigation bar richiedono prova fisica. Nessun redesign/config bar speculativa.
- Artwork preservati: le hero già registrate sono circa 1,57 MP, fino a 6 MiB
  stimati RGBA ciascuna, con dimensioni/resize espliciti. Nessuna compressione
  speculativa; RAM e jank effettivi restano nella checklist fisica del Task 11.
- API reale avviata temporaneamente con Clerk configurato, AI disabilitata e guard
  sul branch development già confermato. Nuovo preflight: **health 200, ready 200,
  database ready**. Richieste GET anonime, nessuna scrittura fixture/schema o
  chiamata OpenAI. API poi arrestata. Non dimostra il Wi-Fi del PC del tester.
- Nel cloud mancano Android SDK/ADB/device/KVM e toolchain iOS: **nessun APK/IPA
  compilato/installato** e nessun test fisico dichiarato. La toolchain del progetto
  richiede Platform 36, Build-Tools 36.0.0, NDK 27.1.12297006; wrapper Gradle 9.3.1.
- Health script verificato anche con server HTTP isolato: health/ready veri 200,
  errore ready 503 con exit nonzero e body privato non stampato. Timeout bounded.

## Risultati finali

- Installazione `pnpm install --frozen-lockfile`: PASS; `expo install --check`
  offline: versioni compatibili con SDK 57, nessun upgrade implicito.
- `pnpm lint`: PASS, 11 task; `pnpm typecheck`: PASS, 10 task, strict senza cast
  per il ConfigContext parziale di Expo.
- `pnpm test`: PASS, **213 casi**, nessuno skipped: 173 mobile, 21 API, 14 schema,
  5 database. Quattro nuovi casi mirati: separazione config, guard env, errore
  startup API e preflight HTTP con fallimento ready/assenza di body privati.
- `pnpm build`: PASS, 6 task; API/package ed export Expo Android/iOS/web, flag
  auth test assente e AI disabilitata. È un export JS/Hermes, **non un APK**.
- `pnpm format:check` e `git diff --check`: PASS.
- Nuovi wrapper run/start: preflight e handoff alle CLI Expo reali verificati con
  `--help`, comprese le opzioni device/variant/no-bundler/dev-client/LAN/localhost.
  Non vengono descritti come una compilazione o un avvio su Android.
- Scan su sorgenti/asset/export mobile: nessun valore configurato dei secret
  server, incluse forme escaped JSON. Nessun secret stampato.
- API reale temporanea arrestata dopo health/ready; nessun firewall modificato,
  commit/push automatico, vendor aggiunto, contatto production o nuova migration.

Per collaudo fisico usare la checklist: Clerk con email reali, Back/keyboard,
camera/galleria, 3 esercizi in sequenza, EMOM 5x60, background/lock/force kill,
riapertura offline con bundle incorporato, flapping e A→B→A. Nessuna casella fisica
è stata marcata PASS nel cloud. Nessun contatto con production.
