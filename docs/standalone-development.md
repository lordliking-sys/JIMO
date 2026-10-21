# JIMO standalone development — Android + Render

Obiettivo: aprire JIMO dal telefono senza Metro e senza tenere acceso il PC.
Il backend rimane online su Render; login e sincronizzazione richiedono Internet.
La variante resta **JIMO Dev / `com.jimo.development`**, con Clerk development e
Neon development. Questo percorso non pubblica sugli store e non usa production.

## 1. Pubblicare l'API development su Render

Il repository contiene `render.yaml` e `apps/api/Dockerfile`. Il container compila
solo l'API e i suoi package condivisi, usa Node 24 e non esegue migration o seed.
La health check usa `/ready`. Il processo mantiene `NODE_ENV=development`, quindi
il controllo esistente sul branch Neon rimane attivo prima dell'apertura API.

**Il blueprint propone il piano Starter, a pagamento**, per evitare la sospensione
per inattività del piano gratuito. Verificare il prezzo corrente nel riepilogo
Render prima di confermare la creazione. Il piano gratuito è utilizzabile per
prove cambiando `plan` in `free`, ma può richiedere un avvio a freddo e non offre
la stessa disponibilità. La preparazione dei file non crea servizi né addebiti.

1. Accedere a <https://dashboard.render.com/> con il proprio account.
2. Scegliere **New → Blueprint**, collegare il repository GitHub JIMO e selezionare
   il branch `downloads/jimo-standalone-development-20261021`.
3. Verificare servizio `jimo-api-development`, regione Frankfurt e piano scelto.
4. Inserire direttamente nei campi riservati Render i valori development:

   | Campo                    | Valore da usare                                        |
   | ------------------------ | ------------------------------------------------------ |
   | DATABASE_URL             | Connessione del branch Neon development già confermato |
   | CLERK_SECRET_KEY         | Secret dell'istanza Clerk development                  |
   | CLERK_ISSUER_URL         | Issuer HTTPS della stessa istanza Clerk                |
   | CLERK_AUTHORIZED_PARTIES | Origini development valide già configurate             |
   | API_ALLOWED_ORIGINS      | Origini HTTPS development ammesse; nessun wildcard     |

5. Conservare i valori impostati dal blueprint: `NODE_ENV=development`,
   `ALLOW_DEV_AUTH=false`, `DEV_USER_ID` vuoto, `AI_IMPORT_ENABLED=false` e
   `NEON_DEVELOPMENT_BRANCH_ID=br-purple-math-b1fsq2wb`.
6. Confermare solo dopo aver esaminato configurazione e costo, quindi attendere
   il primo deploy. Se serve, usare **Manual Deploy → Deploy latest commit**.
7. Copiare l'URL HTTPS effettivo mostrato dalla dashboard. Non assumere che il
   nome del servizio corrisponda a un dominio già assegnato.

Le credenziali cloud non vengono copiate automaticamente dal progetto a Render.
Non incollarle in chat, nei file pubblici o nella configurazione mobile.
Non aggiungere un database Render: viene usato Neon HTTP development esistente.
I deploy automatici sono disattivati; nessun comando di migrazione è configurato.

## 2. Verificare l'API online

Aprire nel browser del telefono l'URL effettivo di Render seguito da:

- `/health`: HTTP 200, `status: ok`, `service: jimo-api`.
- `/ready`: HTTP 200, `status: ready`, `database: ok`.
- `/me`: HTTP 401 senza autenticazione.

Le prime due risposte verificano server e database. La terza verifica che le
route private restino protette. Il comando mobile di preflight ripete questi
controlli senza token e senza stampare i corpi delle risposte in caso di errore.

## 3. Configurazione pubblica del mobile

Estrarre il progetto in un percorso corto, ad esempio `C:\jm`. Dalla root:

```powershell
pnpm.cmd install --frozen-lockfile
Copy-Item apps/mobile/standalone.env.example apps/mobile/.env.standalone.local
notepad apps/mobile/.env.standalone.local
```

Compilare con i dati reali del servizio appena creato:

```dotenv
EXPO_PUBLIC_API_URL=https://INSERIRE_IL_DOMINIO_REALE_RENDER
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=INSERIRE_LA_PUBLISHABLE_KEY_DEVELOPMENT
EXPO_PUBLIC_AI_IMPORT_ENABLED=false
```

La chiave deve iniziare con `pk_test_` e appartenere alla stessa istanza Clerk
dell'API. Sono gli unici valori da mettere nel mobile. Il build script elimina
le variabili backend, forza AI disabilitata, rimuove il bypass auth e disabilita
il caricamento automatico degli altri `.env` durante la build.

Lo standalone richiede un dominio HTTPS pubblico, non un IP LAN o localhost.
Il dominio definitivo viene incorporato nel bundle: per cambiarlo ricompilare
l'APK. `.env.standalone.local` non va pubblicato su GitHub.

## 4. Percorsi pnpm e package condivisi

`pnpm-workspace.yaml` salva `nodeLinker: hoisted`, per mantenere corti i percorsi
nativi su Windows. Se si usa una vecchia cartella con installazione `isolated`,
le directory `node_modules` dei workspace possono conservare collegamenti
precedenti anche dopo una reinstallazione forzata.

Chiudere Metro e Android Studio, fermare il daemon Gradle e rimuovere **solo le
directory node_modules della root e dentro apps e packages**, poi eseguire
di nuovo l'installazione. Questo ricrea anche i collegamenti dei package JIMO:

```powershell
Set-Location C:\jm
$cartelle = @("C:\jm\node_modules") + @(Get-ChildItem .\apps,.\packages -Directory |
  ForEach-Object { Join-Path $_.FullName "node_modules" })
foreach ($cartella in $cartelle) {
  if (Test-Path $cartella) { cmd /c rmdir /s /q "$cartella" }
}
pnpm.cmd install --frozen-lockfile
```

Il comando standalone controlla i percorsi reali di Worklets/Screens e si ferma
se restano collegamenti `.pnpm` isolati. Compila automaticamente i package
condivisi **prima del bundle**, incluso `@jimo/ui`, e verifica i relativi export.
Non occorre eseguire manualmente Metro o aggiungere alias al codice UI.

## 5. Compilare l'APK standalone sul PC Windows

Richiesti Android SDK 36, Build-Tools 36.0.0, NDK 27.1.12297006 e JDK **21**.
Usare il percorso effettivo della JDK installata, per esempio:

```powershell
Set-Location C:\jm
$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.12.1"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
pnpm.cmd --filter @jimo/mobile android:standalone:check
pnpm.cmd --filter @jimo/mobile android:standalone
```

Se l'SDK è in un'altra posizione, impostare quel percorso. Il preflight deve
riuscire prima di procedere. Il comando di build:

1. Verifica l'API HTTPS, database ready e route privata senza sessione 401.
2. Controlla JDK 21 e layout nativo hoisted.
3. Compila i package condivisi necessari e risolve `@jimo/ui` e `@jimo/schemas`.
4. Aggiorna il progetto nativo tramite Expo prebuild, mantenendo com.jimo.development
   e disattivando HTTP cleartext e scheme del launcher generato.
5. Imposta i criteri locali del daemon a Java 21, conservando un backup se esistono.
6. Genera una firma locale di test solo se manca `app/debug.keystore`.
7. Rigenera autolinking/CMake e compila **assembleRelease**, includendo JavaScript
   e asset. Il launcher Expo Dev Client è disabilitato nelle build release dal
   modulo Expo, salvo override esplicito che il comando rifiuta.

Il file risultante è:

```text
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

Questa è una release **di test development**, firmata con la chiave locale debug
del progetto. Non è una firma per pubblicazione su Google Play. Per aggiornare
un'installazione JIMO Dev esistente, riusare la sua chiave locale. Se le firme
sono diverse, sincronizzare prima i dati pendenti e reinstallare l'app; la
disinstallazione cancella i dati non sincronizzati.

## 6. Installazione e verifica finale

Trasferire `app-release.apk` sul telefono, aprirlo dal file manager e autorizzare
l'installazione da quell'origine. In alternativa, con Debug USB autorizzato:

```powershell
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

Chiudere Metro e spegnere il PC. Dal telefono, usando rete mobile o un'altra
Wi-Fi, aprire JIMO Dev. Deve aprirsi il login, senza launcher o richiesta server
Metro. Verificare login Clerk, caricamento scheda e sincronizzazione con l'API
Render. Provare chiusura/riapertura e riavvio telefono. I dati solo locali restano
sul dispositivo; login e sincronizzazione richiedono API e connessione disponibili.

La compilazione JavaScript/Hermes e i test in Codex non sostituiscono questa prova
fisica. Finché Render non ha un URL verificato e l'APK non supera il test senza PC,
non considerare completata la distribuzione standalone.
