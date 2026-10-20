# JIMO Dev — build Android Studio su Windows

Questo ZIP contiene lo stato corrente completo dei sorgenti, inclusi i package
del monorepo e **`apps/mobile/android/` già generato tramite Expo prebuild**.
Aprire questa cartella Android, senza spostarla fuori dal monorepo.

Identità: **JIMO Dev**, package **`com.jimo.development`**, Expo Development
Client, build **debug**. Non usare Expo Go per questo APK. Il debug richiede
Metro acceso sul PC per caricare JavaScript. Non è un APK release autonomo.

Non sono inclusi node_modules, cache, output di build, cronologia Git, `.env`
privati, configurazioni locali SDK o chiavi di firma. Il Gradle wrapper JAR è
incluso perché serve ad avviare Gradle. La chiave debug sarà creata sul PC.
Non occorrono nuove migration, seed, reset o modifiche a production.

## 1. Estrarre lo ZIP e preparare Windows

Da Esplora file: tasto destro sullo ZIP → **Estrai tutto**. Scegliere un percorso
corto, ad esempio `C:\dev`. La cartella risultante `C:\dev\JIMO` deve contenere
`package.json`, `pnpm-lock.yaml`, `apps` e `packages`. Non aprire né compilare
direttamente dal file ZIP. Nei comandi seguenti si usa `C:\dev\JIMO`: sostituirlo
se si sceglie un'altra destinazione.

Installare **Node.js 24.19.0** (comunque Node 24, almeno 24.3) e Android Studio
con JDK/JBR **21**. In Android Studio → **SDK Manager** installare:

- Android SDK Platform **36**.
- Android SDK Build-Tools **36.0.0**.
- Android SDK Platform-Tools e Android SDK Command-line Tools (latest).
- NDK (Side by side) **27.1.12297006**, selezionabile con Show Package Details.
- CMake se richiesto dalla build delle dipendenze native; consentire a Gradle
  l'installazione della versione richiesta, senza aggiornare il progetto.

Il wrapper incluso usa Gradle **9.3.1**: non installare una versione globale di
Gradle e non accettare aggiornamenti automatici di Gradle/AGP proposti dall'IDE.
La prima build richiede Internet per npm, Gradle, Maven e componenti Android SDK.

## 2. Installare le dipendenze e compilare i package condivisi

Aprire **PowerShell** nella root del progetto:

```powershell
Set-Location C:\dev\JIMO
node --version
npm.cmd install --global pnpm@11.19.0
pnpm.cmd --version
pnpm.cmd install --frozen-lockfile
pnpm.cmd exec turbo run build --filter="@jimo/mobile^..."
```

L'ultimo comando ricrea i `dist` dei soli package condivisi necessari al mobile,
che per scelta non sono distribuiti nello ZIP. Non esegue migration.

## 3. Configurare la `.env` development del backend

Se si usa già un endpoint API development raggiungibile dal telefono, tenerlo
acceso e passare al punto 4. In alternativa avviare l'API su questo PC:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Compilare **privatamente** con i valori della propria istanza development:

- `DATABASE_URL`: connessione del branch Neon **development**, mai production.
- `CLERK_SECRET_KEY`: secret development, solo backend.
- `CLERK_ISSUER_URL`: issuer HTTPS della stessa istanza Clerk development.
- `CLERK_AUTHORIZED_PARTIES`: origini HTTP(S) autorizzate per il proprio setup
  development; mantenere quelle valide già configurate. Per Metro LAN aggiungere
  l'origine esatta `http://IP_DEL_PC:8081` se necessaria al proprio token Clerk.
- `API_ALLOWED_ORIGINS`: origini development ammesse, con l'origine LAN se serve.
- `NODE_ENV=development`, `PORT=3001`, `ALLOW_DEV_AUTH=false`, `DEV_USER_ID=`.
- Conservare `NEON_DEVELOPMENT_BRANCH_ID=br-purple-math-b1fsq2wb` per il branch
  development attuale; il server controlla che la connessione corrisponda.
- `AI_IMPORT_ENABLED=false`, `EXPO_PUBLIC_AI_IMPORT_ENABLED=false`.
  `OPENAI_API_KEY` può restare vuota.

Lo ZIP contiene solo template vuoti: non contiene le credenziali cloud.
Non copiare questa `.env` dentro il mobile e non inviarla insieme al progetto.
L'API usa Neon HTTP: non serve PostgreSQL locale né accesso TCP alla porta 5432.

In questo **terminale 1**, dalla root:

```powershell
pnpm.cmd exec turbo run build --filter=@jimo/api
$env:NODE_ENV="development"
$env:ALLOW_DEV_AUTH="false"
$env:DEV_USER_ID=""
$env:AI_IMPORT_ENABLED="false"
$env:NEON_DEVELOPMENT_BRANCH_ID="br-purple-math-b1fsq2wb"
node --env-file=.env apps/api/dist/server.js
```

Lasciarlo aperto. Non eseguire comandi `db:migrate`, `db:seed` o `drizzle push`.

## 4. Configurare EXPO_PUBLIC_API_URL

Aprire un **terminale 2 PowerShell**, dalla root, e trovare l'IPv4 del PC:

```powershell
Set-Location C:\dev\JIMO
ipconfig
if (!(Test-Path apps/mobile/.env.local)) {
  Copy-Item apps/mobile/.env.example apps/mobile/.env.local
}
notepad apps/mobile/.env.local
```

Impostare `EXPO_PUBLIC_API_URL=http://IP_DEL_PC:3001` con l'IPv4 reale della scheda
Wi-Fi/Ethernet collegata alla stessa rete del telefono. Ad esempio, **solo se è
ancora l'IP attuale del PC**, `http://192.168.1.138:3001`. In alternativa usare
l'URL HTTPS dell'API development già disponibile.

Non usare `localhost`, `127.0.0.1` o `0.0.0.0` per la modalità LAN. Il telefono
deve poter raggiungere direttamente l'API; il QR Metro non espone il backend.

## 5. Configurare Clerk publishable key development

Nello stesso **`apps/mobile/.env.local`** compilare esattamente questi valori
pubblici (sostituire IP e chiave):

```dotenv
EXPO_PUBLIC_API_URL=http://IP_DEL_PC:3001
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_INSERIRE_LA_PROPRIA_CHIAVE
EXPO_PUBLIC_AI_IMPORT_ENABLED=false
```

La publishable key si trova nella dashboard Clerk → istanza **Development** →
API keys. Deve appartenere alla stessa istanza della secret e dell'issuer API.
Non usare `pk_live_`. Non impostare `EXPO_PUBLIC_AUTH_TEST`.
Non inserire DATABASE_URL, secret Clerk, token o chiavi OpenAI nel mobile.

Prima di aprire JIMO, verificare dal terminale 2:

```powershell
pnpm.cmd --filter @jimo/mobile android:check
```

Attendere `/health 200; /ready 200, database ready`. Dal **browser del telefono**
aprire anche `http://IP_DEL_PC:3001/health` e `http://IP_DEL_PC:3001/ready`
(oppure gli stessi percorsi sull'endpoint HTTPS). Devono rispondere `ok`/`ready`.
Se falliscono, controllare API accesa, IP, stessa Wi-Fi e firewall Windows:
autorizzare Node sulla rete privata usata per il test, porte API 3001 e Metro 8081.

## 6. Preparare JDK, SDK, firma debug e aprire Android Studio

Chiudere **tutte le finestre Android Studio già aperte**. Continuare nello stesso
terminale 2, dalla root: Android Studio dovrà ereditare queste variabili.
Adattare i percorsi se JDK o SDK sono installati altrove.

```powershell
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"
java -version
adb version
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --licenses

# SDK locale di Windows: non usare percorsi del cloud.
$sdkForGradle=$env:ANDROID_HOME.Replace('\','/')
Set-Content apps/mobile/android/local.properties "sdk.dir=$sdkForGradle" -Encoding ascii

# Solo firma DEBUG locale, senza chiavi private distribuite nello ZIP.
if (!(Test-Path apps/mobile/android/app/debug.keystore)) {
  & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v -storetype JKS -keystore apps/mobile/android/app/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
}

# Carica nel processo esclusivamente le tre variabili pubbliche mobile.
Get-Content apps/mobile/.env.local | ForEach-Object {
  if ($_ -match '^(EXPO_PUBLIC_API_URL|EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY|EXPO_PUBLIC_AI_IMPORT_ENABLED)=(.*)$') {
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim(), 'Process')
  }
}
$env:JIMO_APP_VARIANT="development"
$env:EXPO_PUBLIC_AI_IMPORT_ENABLED="false"
Remove-Item Env:EXPO_PUBLIC_AUTH_TEST -ErrorAction SilentlyContinue
Remove-Item Env:JIMO_DEV_API_TRANSPORT -ErrorAction SilentlyContinue

# Arresta eventuali daemon Gradle precedenti e apre l'IDE con l'ambiente dev.
Push-Location apps/mobile/android
.\gradlew.bat --stop
Pop-Location
& "C:\Program Files\Android\Android Studio\bin\studio64.exe" "$PWD\apps\mobile\android"
```

La cartella da aprire è **`C:\dev\JIMO\apps\mobile\android`**, cioè `/android`
all'interno del progetto mobile. Il monorepo non ha un progetto Android alla root.
Non rilanciare `expo prebuild` e non spostare `android` nella root.
In riaperture future ripetere la preparazione dell'ambiente in questo punto prima
di lanciare l'IDE; conservarlo aperto anche per la build da terminale.

## 7. Attendere Gradle Sync

Autorizzare l'apertura del progetto locale se Android Studio chiede di considerarlo
attendibile. Attendere il termine della sincronizzazione e dei download.
In **Settings → Build, Execution, Deployment → Build Tools → Gradle**, scegliere
il wrapper incluso e **Gradle JDK = JBR 21**. Non attivare Gradle Offline Mode
alla prima compilazione.

Se richiesto, installare SDK/NDK/CMake mancanti e accettare le relative licenze.
Non accettare upgrade di AGP/Gradle/Kotlin suggeriti: usare le versioni già presenti.
Expo autolinking risolve le dipendenze native da node_modules, installate al punto
2; non occorre collegare moduli a mano. Se compare `node not found`, controllare
`node --version` nello stesso PowerShell e riaprire l'IDE da quel terminale.

## 8. Selezionare debug

Aprire **View → Tool Windows → Build Variants** e selezionare **`debug`** per il
modulo **app**. Il package generato deve restare **`com.jimo.development`**.
Non selezionare release e non usare Generate Signed Bundle / APK.

## 9. Generare l'APK

In Android Studio usare **Build → Build Bundle(s) / APK(s) → Build APK(s)**
(nelle versioni recenti: **Generate App Bundles or APKs → Generate APKs**).

In alternativa, nello stesso terminale 2 già configurato:

```powershell
Push-Location apps/mobile/android
.\gradlew.bat assembleDebug
Pop-Location
```

Attendere **BUILD SUCCESSFUL**. La prima build può richiedere parecchi minuti.
Non rigenerare il progetto e non cambiare la variante se un download è ancora in
corso. Non sono necessarie chiavi di firma production né account EAS.

## 10. Trovare l'APK

Percorso relativo alla root del monorepo:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Quindi, rispetto alla cartella `apps/mobile`, il percorso è:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Con l'estrazione dell'esempio:
`C:\dev\JIMO\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk`.
Android Studio mostra anche un collegamento **locate** al termine della build.

## 11. Installare manualmente sul telefono

Trasferire `app-debug.apk` sul telefono via USB, aprirlo dal file manager e
consentire a quel file manager l'installazione da questa origine quando Android
lo richiede. Installare **JIMO Dev**.

Oppure abilitare Opzioni sviluppatore → Debug USB, collegare il telefono,
accettare l'autorizzazione del PC ed eseguire dal terminale 2, root del repository:

```powershell
adb devices
adb install -r .\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

Se una precedente JIMO Dev ha una firma diversa, il nuovo keystore locale non
permette di aggiornarla. Prima sincronizzare i dati pendenti della vecchia app;
poi disinstallarla dal telefono e reinstallare il nuovo APK. La disinstallazione
cancella i dati solo locali. I dati già sincronizzati tornano accedendo allo stesso
account development. La nuova app ha un sandbox separato anche da Expo Go.

## 12. Avviare Metro e aprire JIMO Dev

Tenere il terminale 1 dell'API acceso. Nel terminale 2, dalla root:

```powershell
Set-Location C:\dev\JIMO
pnpm.cmd --filter @jimo/mobile android:metro
```

Lo script verifica prima health/ready, seleziona la variante development e avvia
Metro con Development Client in **LAN**, pulendo la cache. Aprire **JIMO Dev**
sul telefono; dal launcher scegliere il server Metro o scansionare il QR indicato
dal terminale. Non aprire il QR con Expo Go. PC e telefono devono essere sulla
stessa Wi-Fi; Metro usa normalmente la porta 8081.

Se il launcher non trova il PC, inserire manualmente il server
`http://IP_DEL_PC:8081`. Il cavo non serve per la LAN dopo l'installazione.
Mantenere API e Metro accesi durante le prove. Dopo un cambio di `.env.local`,
arrestare Metro con Ctrl+C e rilanciare il comando; aggiornare anche le variabili
del terminale/IDE del punto 6 se si ricompila la parte nativa.

Verifica iniziale: health/ready dal browser del telefono, login con Clerk
development e caricamento della propria scheda. Nessuna funzionalità core richiede
OpenAI. Il backend controlla Neon development; non cambiare credenziali o branch.

## Verifiche effettuate prima del confezionamento

- Cartella Android generata completa di sorgenti Kotlin e risorse native.
- Wrapper Gradle completo, JAR integro e identico al template Expo installato.
- settings.gradle con Expo autolinking; app/build.gradle e manifest coerenti.
- Namespace/applicationId `com.jimo.development`, scheme `jimo-dev`.
- Risoluzione autolinking Expo e React Native riuscita, incluso Dev Client.
- Esclusione di credenziali, chiavi private, dipendenze e output generati.

Il cloud non dispone di Android SDK: **Gradle Sync e compilazione APK nativa
devono essere eseguiti sul PC Windows** con i passaggi sopra. Lo ZIP non contiene
un APK precompilato. Nessuna migration o operazione su production è stata eseguita
per creare questo archivio.
