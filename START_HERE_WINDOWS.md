# JIMO Dev senza Metro e senza PC acceso

1. Pubblica API development su Render seguendo `docs/standalone-development.md`, sezione 1. Branch: `downloads/jimo-standalone-development-20261021`. Il blueprint propone Starter **a pagamento**: verifica il costo su Render prima di confermare. Non è stato creato alcun servizio da Codex.
2. Estrai questo progetto in `C:\jm` (cartella pulita), esegui `pnpm.cmd install --frozen-lockfile`. Copia `apps/mobile/standalone.env.example` in `apps/mobile/.env.standalone.local`; inserisci URL HTTPS reale di Render e Clerk publishable key development. Nessun secret nel mobile.
3. Con JDK 21 e Android SDK configurati, esegui dalla root:

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.12.1"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
pnpm.cmd --filter @jimo/mobile android:standalone
```

Il comando compila automaticamente i package condivisi, aggiorna il progetto Android e genera una release development firmata localmente. Non avvia Metro.

APK previsto: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`. Trasferiscilo al telefono e aprilo per installarlo. Per aggiornare la vecchia installazione conserva la sua `app/debug.keystore` locale; con una firma diversa serve reinstallare, perdendo i dati locali non sincronizzati.

L'APK **non è incluso**: va compilato dopo aver configurato l'URL reale di Render. La build JavaScript/Hermes è stata verificata con un URL sintetico; non prova la raggiungibilità del futuro servizio Render.

Production invariata. Nessuna migration. AI disabilitata. Package `com.jimo.development`.
