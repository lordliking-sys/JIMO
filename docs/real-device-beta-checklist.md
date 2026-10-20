# JIMO — Checklist beta su dispositivo

Le caselle fisiche sono ancora **da eseguire sul telefono**. Task 12 prepara una
development build Android locale; non pubblica sullo store e non usa production.
Risultati e limiti: [android-development-build.md](android-development-build.md).
Registrare commit, modello/OS, timezone, tastiera e navigazione gesture/tre tasti.

## ANDROID FIRST INSTALL — Windows

Percorso consigliato: **USB per installare, stessa Wi-Fi per API e Metro**.
Dopo la prima installazione il cavo può essere scollegato per le prove online.
L'app installata si chiama **JIMO Dev**, package `com.jimo.development`; non è
Expo Go. Prima di passare da Expo Go sincronizzare eventuali operazioni pendenti:
i dati solo locali del suo sandbox non vengono trasferiti alla nuova app.
Accedendo allo stesso account development si ritrovano i dati già sincronizzati.

### 1. Prerequisiti e dipendenze

Installare Android Studio per Windows. In **Settings → Languages & Frameworks →
Android SDK** selezionare Android SDK Platform **36**, Build-Tools **36.0.0**,
Android SDK Platform-Tools e Command-line Tools (latest). La toolchain usa NDK
**27.1.12297006**; installarlo da SDK Tools con Show Package Details, o consentire
a Gradle di installarlo dopo aver accettato le licenze. Non serve un emulatore.
Usare la JDK inclusa in Android Studio (JBR 21 compatibile con il wrapper Gradle
9.3.1 generato). Installare il driver USB del produttore se Windows non vede il
telefono.

Aprire PowerShell/terminale Visual Studio **nella cartella JIMO con package.json**:

```powershell
node --version
pnpm.cmd --version
pnpm.cmd install --frozen-lockfile
```

Richiesti Node 24 e pnpm 11.19.0. Nel terminale destinato al mobile impostare:

```powershell
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"
java -version
adb version
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
```

Se Android Studio/JDK/SDK sono installati altrove, usare i loro percorsi effettivi.
Accettare le licenze Android richieste, poi lasciare aperto questo terminale.

### 2. Database e configurazione server

Non avviare PostgreSQL locale: l'API usa **Neon HTTP development**. Non eseguire
migration, seed, `drizzle push` o reset. Nella `.env` privata della root conservare
DATABASE_URL e Clerk secret/issuer/authorized parties development già configurati.
La publishable key mobile deve appartenere alla stessa istanza Clerk development.
Non copiare la `.env` server dentro `apps/mobile`.

### 3. Avviare API — terminale 1

Da un secondo PowerShell, sempre nella root JIMO:

```powershell
pnpm.cmd exec turbo run build --filter=@jimo/api
$env:NODE_ENV="development"
$env:PORT="3001"
$env:ALLOW_DEV_AUTH="false"
$env:DEV_USER_ID=""
$env:AI_IMPORT_ENABLED="false"
$env:NEON_DEVELOPMENT_BRANCH_ID="br-purple-math-b1fsq2wb"
node --env-file=.env apps/api/dist/server.js
```

Lasciare questo terminale acceso. Fastify ascolta già su `0.0.0.0`; non è stato
cambiato il bind production. Il guard controlla il branch development prima di
aprire l'API. Non vengono eseguite migration o chiamate OpenAI.

### 4. Trovare IPv4 del PC e verificare la rete

Nel terminale mobile, eseguire:

```powershell
ipconfig
```

Leggere **Indirizzo IPv4** della scheda Wi-Fi/Ethernet collegata al router del
telefono. PC e telefono devono stare sulla stessa rete; evitare Wi-Fi ospiti con
isolamento client. Non usare `0.0.0.0`, `localhost` o `127.0.0.1` come indirizzo
LAN del telefono. Il repository non contiene il tuo IP.

Se Windows chiede l'autorizzazione di Node, consentire l'accesso sulla **rete
privata** usata per il test. Nessuna regola firewall viene modificata dagli script.
Su un PC gestito, fare verificare l'accesso alle porte API 3001 e Metro 8081.

### 5. Configurare i soli valori pubblici mobile

Nel terminale mobile, dalla root JIMO:

```powershell
if (!(Test-Path "apps/mobile/.env.local")) {
  Copy-Item "apps/mobile/.env.example" "apps/mobile/.env.local"
}
notepad "apps/mobile/.env.local"
```

Compilare queste tre righe, sostituendo `PC_IP` con l'IPv4 trovato e il placeholder
Clerk con la **Publishable key development `pk_test_...`**, poi salvare:

```dotenv
EXPO_PUBLIC_API_URL=http://PC_IP:3001
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=INSERISCI_LA_PUBLISHABLE_KEY_DEVELOPMENT
EXPO_PUBLIC_AI_IMPORT_ENABLED=false
```

Niente database URL, secret key Clerk, OpenAI key o token. Non abilitare
EXPO_PUBLIC_AUTH_TEST. Gli script selezionano automaticamente la variante
development e disabilitano AI/auth test. HTTP LAN è consentito solo in questa
variante; la configurazione standard non riceve URL, package o policy HTTP dev.

### 6. Health check dal PC e dal telefono — prima di aprire JIMO

Nel terminale mobile:

```powershell
pnpm.cmd --filter @jimo/mobile android:check
```

Attendere `/health 200; /ready 200, database ready`. Il comando non invia token,
scade dopo pochi secondi in caso di rete non disponibile e blocca build/Metro se
il controllo fallisce. Il successo dal PC non dimostra ancora la LAN del telefono.

Nel **browser del telefono** aprire entrambi gli indirizzi, con il proprio IPv4:

```text
http://PC_IP:3001/health
http://PC_IP:3001/ready
```

Attesi rispettivamente `status: ok` e `status: ready, database: ok`. Se non si
aprono: controllare API ancora accesa, IPv4/porta, stessa rete e firewall privato.
Un tunnel Metro non espone automaticamente l'API.

### 7. Creare e installare la development build — terminale mobile

Sul telefono attivare **Opzioni sviluppatore → Debug USB**, collegarlo via USB,
sbloccarlo e accettare la richiesta di autorizzazione del PC. Poi:

```powershell
adb devices
pnpm.cmd --filter @jimo/mobile android:dev
```

Se compare `unauthorized`, accettare la richiesta sul telefono e riprovare.
Expo genera `apps/mobile/android` (ignorato da Git), compila il debug APK, permette
di scegliere il telefono e installa **JIMO Dev**. La prima build richiede download
Gradle/SDK e può durare diversi minuti. Non viene cambiata la firma production.
Non serve EAS, un account Expo o una pubblicazione sullo store per questo metodo.

### 8. Metro e apertura dell'app

`android:dev` normalmente avvia anche Metro: lasciare il terminale aperto. Se la
build è già installata e si riapre la sessione in un altro momento:

```powershell
pnpm.cmd --filter @jimo/mobile android:metro
```

Aprire **JIMO Dev** sul telefono, oppure premere **a** nel terminale Metro con il
cavo collegato. Se viene mostrato il launcher, aprire il server Metro/QR indicato.
Il QR deve aprire JIMO Dev. Usare la stessa Wi-Fi anche per il bundle Metro.
Quando si cambia API URL, riavviare `android:metro` (pulisce la cache). Dopo cambio
di package/plugin/native dependency ricompilare con `android:dev`.

### 9. Smoke test iniziale

- [ ] Browser telefono: health/ready ancora OK.
- [ ] JIMO Dev: signup development, codice email reale, login, logout, reset email
      e login con nuova password. Nessun bypass, email o token da incollare nei log.
- [ ] Stesso account/JIMO users.id dopo riapertura; nessun loop auth/onboarding.
- [ ] Scheda reale visibile; avvio da Home su workout con almeno 3 esercizi.
- [ ] Standard, EMOM breve (5 round da 60 s), Back/keyboard, foto e rete: completare
      le sezioni fisiche sotto. Le caselle non sono state eseguite da Codex.

Le schermate email/password Clerk esistenti non richiedono redirect OAuth nuovi.
Il deep link nativo è `jimo-dev`; non aggiungerlo a CLERK_AUTHORIZED_PARTIES, che
contiene origini HTTP(S). Le eventuali origini web devono restare nella allowlist
development esplicita dell'API/Clerk. Non disabilitare verifica email, TLS o captcha.

### 10. Riapertura completamente offline, senza Metro

La development build debug richiede Metro per caricare JS: il suo kill/reopen
offline non certifica il recovery dell'app se manca proprio il bundle. Per quel
caso generare localmente un APK con **bundle incorporato**, sempre con package,
Clerk, API e dati development:

```powershell
pnpm.cmd --filter @jimo/mobile android:dev --variant release --no-bundler
```

È una build interna release-like di **JIMO Dev**, non una release production/store;
il template generato usa la debug signing configuration anche per questa variante.
Non servono chiavi di firma production. Fermare Metro, aprire online una volta,
poi provare aereo → completamento → force kill → reopen offline → reconnect.
API/Neon/Clerk rimangono development. Se cambia l'URL API, ricompilare questo APK.
Non disinstallare o cancellare storage tra le prove di recovery.

## Opzione B — USB/ADB per API e Metro

Utile se Wi-Fi aziendale/ospiti blocca la LAN; richiede cavo collegato e ADB
autorizzato. Nel terminale mobile, con API accesa nel terminale 1:

```powershell
adb devices
adb reverse tcp:3001 tcp:3001
adb reverse tcp:8081 tcp:8081
$env:JIMO_DEV_API_TRANSPORT="adb"
$env:EXPO_PUBLIC_API_URL="http://127.0.0.1:3001"
pnpm.cmd --filter @jimo/mobile android:check
pnpm.cmd --filter @jimo/mobile android:dev --no-bundler
pnpm.cmd --filter @jimo/mobile android:metro
```

Premere **a** in Metro per aprire JIMO Dev. In questa sola opzione il loopback del
telefono è inoltrato esplicitamente al PC da `adb reverse`; non è un URL LAN.
Verificare nel browser del telefono `http://127.0.0.1:3001/health` e `/ready`.
Dopo disconnessione/riavvio ripetere `adb reverse`; per tornare a Wi-Fi eliminare
gli override del terminale e riavviare Metro:

```powershell
Remove-Item Env:JIMO_DEV_API_TRANSPORT -ErrorAction SilentlyContinue
Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
pnpm.cmd --filter @jimo/mobile android:metro
```

L'URL LAN torna a essere letto da `apps/mobile/.env.local`.

## ADB opzionale — APK e log filtrati

Expo gestisce già installazione e avvio. Per reinstallare manualmente il debug APK
generato sul PC, dalla root JIMO:

```powershell
adb install -r ".\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk"
adb shell monkey -p com.jimo.development -c android.intent.category.LAUNCHER 1
$jimoProcessId=(adb shell pidof -s com.jimo.development).Trim()
adb logcat --pid=$jimoProcessId -v brief ReactNativeJS:E AndroidRuntime:E "*:S"
```

Aprire prima l'app per ottenere il PID. I log sono locali: non condividere dump
integrali, credenziali o informazioni dell'account. L'API registra stato richieste
e startup con redazione dei dati sensibili; l'app mostra sync/retry e, nella sola
variante development, distingue API non raggiungibile/configurazione/sessione/500
dagli errori delle preferenze. Nessun logging per tick, vendor o telemetria aggiunti.

## AUTH / ACCOUNT SWITCH

- [ ] Signup Clerk development, codice email reale, riapertura, logout/login,
      password errata, reset email e login con nuova password.
- [ ] Sessione scaduta/revocata: richiesta di login, nessun loop/flash privato;
      operazioni locali preservate. Dopo login, stesso JIMO `users.id`.
- [ ] A → logout → B → A: Home, scheda, workout, progressi e avatar isolati;
      onboarding non ripetuto per errore. Nessuna credenziale nei log/screenshot.

## HOME / PROGRAM

- [ ] Lun Upper / mar riposo / mer Pull: piano corretto a ogni tap; start diretto
      al primo pending, riprendi sulla stessa sessione; check esercizi completati.
- [ ] Oggi/ieri/domani, domenica → lunedì, 23:59 → 00:01 in timezone locale:
      oggi segue la mezzanotte, una selezione esplicita diversa resta intenzionale.
- [ ] Nuova/modifica/cambia scheda, giornata, libreria/config esercizio: salvataggi
      singoli, nessun duplicato con doppio tap, stato disabilitato durante mutation.

## WORKOUT / EMOM / BACKGROUND / FORCE KILL

- [ ] Standard: completa set 1, correggi actual, recupero; background e lock per
      30 s / 2 / 5 / 10 min; ritorno sul prossimo pending con tempo reale.
- [ ] EMOM 10 min: preparazione 10 s, dopo 2–3 round force kill, attendere 2 min,
      riaprire: timestamp e round coerenti; già terminato → avanzamento corretto.
- [ ] Force kill dopo due set anche offline; riaprire senza rete: actual, target,
      recupero e outbox presenti; riprendere senza ricreare la sessione.
- [ ] Interrompere dalla Home e avviare altro giorno; le serie registrate restano
      nello storico della sessione annullata. TARGET rimane distinto da ACTUAL.

Per il kill su JIMO Dev installato, senza cancellare storage o disinstallare:

```powershell
$devPackage="com.jimo.development"
adb shell am force-stop $devPackage
adb shell am start -n "$devPackage/.MainActivity"
```

## OFFLINE / SYNC

- [ ] Aprire online → aereo → set/actual/skip → navigazione → background →
      completamento → kill → reopen offline → rete: sync automatica, zero duplicati.
- [ ] Durante la sessione alternare online/offline/online/offline/online; niente
      spinner permanente, spam errori o completamenti ripetuti.
- [ ] API offline/timeout/401/500: messaggio umano e recovery; retry dopo rete,
      nessun raw JSON/stack trace. Non svuotare la outbox per risolvere un errore.

## KEYBOARD / BACK / POPUP

- [ ] Email/password, nome scheda/giorno, note, ricerca, reps/kg/RPE e piramidale:
      campo e Salva raggiungibili, virgola decimale, dismiss e scroll coerenti.
- [ ] Back Android con IME visibile chiude prima la tastiera; poi lo step interno,
      poi il popup. Modifiche sporche richiedono conferma; pending non si chiude.
- [ ] Back su Login/Signup, quattro tab, editor, avatar, workout ed EMOM:
      navigazione recuperabile, sessione persistita, nessuna perdita accidentale.
- [ ] Aprire/chiudere 20 volte giornata, libreria, config, modifica giorno,
      cambia/nuova scheda e avatar: un solo modal, backdrop sempre rimosso.

## PROFILE / CAMERA / GALLERY

- [ ] Negare/consentire camera e galleria, annullare entrambe, scegliere/sostituire/
      rimuovere foto, kill/reopen: nessun crash, vecchia foto preservata su errore.
- [ ] Ricreazione Activity durante picker/permessi: nessun avatar attribuito
      all'altro account e nessun dialog bloccato. Verificare sui device OEM.

## SAFE AREA / ACCESSIBILITY / PERFORMANCE

- [ ] Login, Home, Scheda, Progressi, Profilo e workout: contrasto status bar,
      notch, gesture/tre pulsanti, CTA sopra barra sistema, nessun flash bianco.
- [ ] TalkBack/VoiceOver: label CTA/input/icon-only, focus nel dialog, tap target
      circa 44–48 px, scala font moderata e reduced motion.
- [ ] Liste lunghe, scroll hero, popup, input ed EMOM: assenza di jank evidente;
      con profiler nativo osservare memoria dopo 20 cicli e cambio tab, senza
      dedurre misure di RAM/batteria dai soli test browser.
