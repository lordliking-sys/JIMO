const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { getConfig } = require('expo/config');

const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileRoot, '../..');

function publicBuildEnvironment(input) {
  const env = { ...input };
  const publicNames = new Set([
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_AI_IMPORT_ENABLED',
  ]);
  for (const key of Object.keys(env)) {
    if (
      (key.startsWith('EXPO_PUBLIC_') && !publicNames.has(key)) ||
      /SECRET|TOKEN|PASSWORD|DATABASE_URL|OPENAI_API_KEY|DEV_USER_ID/i.test(key)
    )
      delete env[key];
  }
  env.JIMO_APP_VARIANT = 'development';
  env.JIMO_STANDALONE = 'true';
  env.EXPO_PUBLIC_AI_IMPORT_ENABLED = 'false';
  env.EXPO_NO_TELEMETRY = '1';
  env.EXPO_NO_DOTENV = '1';
  return env;
}

async function checkHostedApi(baseUrl, fetcher = fetch) {
  const base = baseUrl.replace(/\/+$/, '');
  for (const route of ['health', 'ready', 'me']) {
    let response;
    try {
      response = await fetcher(`${base}/${route}`, {
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
      if (route === 'me') {
        if (response.status !== 401) throw new Error();
        continue;
      }
      const body = await response.json();
      if (
        !response.ok ||
        (route === 'health'
          ? body.status !== 'ok' || body.service !== 'jimo-api'
          : body.status !== 'ready' || body.database !== 'ok')
      )
        throw new Error();
    } catch {
      throw new Error(
        `JIMO standalone: /${route} non supera il controllo HTTPS development. Verifica il servizio Render.`,
      );
    }
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: mobileRoot,
    env: process.env,
    stdio: 'inherit',
    ...options,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      'JIMO standalone: comando di build fallito; controlla il log precedente.',
    );
}

function checkJava21(env) {
  if (!env.JAVA_HOME)
    throw new Error('JIMO standalone: configura JAVA_HOME con una JDK 21.');
  const java = path.join(
    env.JAVA_HOME,
    'bin',
    process.platform === 'win32' ? 'java.exe' : 'java',
  );
  const result = spawnSync(java, ['-version'], {
    env,
    encoding: 'utf8',
  });
  if (
    result.status !== 0 ||
    !/(?:openjdk|java) version "21(?:\.|\")/.test(
      `${result.stdout ?? ''}\n${result.stderr ?? ''}`,
    )
  )
    throw new Error(
      'JIMO standalone: JAVA_HOME deve indicare una JDK 21 valida.',
    );
  return java;
}

function checkWorkspaceLinks() {
  for (const name of ['react-native-worklets', 'react-native-screens']) {
    const file = fs.realpathSync(
      require.resolve(`${name}/package.json`, { paths: [mobileRoot] }),
    );
    if (file.split(path.sep).includes('.pnpm'))
      throw new Error(
        'JIMO standalone: collegamenti pnpm isolati residui. Segui docs/standalone-development.md per ricreare node_modules.',
      );
  }
}

async function main() {
  const mode = process.argv[2];
  if (!['check', 'build'].includes(mode))
    throw new Error('Usa android:standalone:check oppure android:standalone.');
  const env = publicBuildEnvironment(process.env);
  // Config evaluation sees only the sanitized environment, never backend secrets.
  for (const key of Object.keys(process.env))
    if (!(key in env)) delete process.env[key];
  Object.assign(process.env, env);
  const { exp } = getConfig(mobileRoot);
  if (
    exp.android?.package !== 'com.jimo.development' ||
    exp.extra?.jimoStandalone !== true
  )
    throw new Error('JIMO standalone: identità development non valida.');
  await checkHostedApi(env.EXPO_PUBLIC_API_URL);
  console.log('API HTTPS: /health 200, /ready 200, /me senza sessione 401.');
  if (mode === 'check') return;

  const java = checkJava21(env);
  checkWorkspaceLinks();
  const turboRoot = path.dirname(
    require.resolve('turbo/package.json', { paths: [repoRoot] }),
  );
  console.log('Compilazione dei package condivisi, incluso @jimo/ui.');
  run(
    process.execPath,
    [
      path.join(turboRoot, 'bin/turbo'),
      'run',
      'build',
      '--filter=@jimo/mobile^...',
    ],
    { cwd: repoRoot, env },
  );
  for (const name of ['@jimo/ui', '@jimo/schemas'])
    require.resolve(name, { paths: [mobileRoot] });

  const expoRoot = path.dirname(require.resolve('expo/package.json'));
  run(
    process.execPath,
    [
      path.join(expoRoot, 'bin/cli'),
      'prebuild',
      '--no-install',
      '--platform',
      'android',
    ],
    { env },
  );
  const android = path.join(mobileRoot, 'android');
  const properties = path.join(android, 'gradle.properties');
  if (
    /expo\.devlauncher\.configureInRelease\s*=\s*true/.test(
      fs.readFileSync(properties, 'utf8'),
    )
  )
    throw new Error(
      'JIMO standalone: disattiva il launcher nelle build release.',
    );
  const criteria = path.join(android, 'gradle/gradle-daemon-jvm.properties');
  if (fs.existsSync(criteria)) {
    if (!fs.existsSync(`${criteria}.before-standalone.bak`))
      fs.copyFileSync(criteria, `${criteria}.before-standalone.bak`);
    fs.writeFileSync(criteria, 'toolchainVersion=21\n');
  }
  const key = path.join(android, 'app/debug.keystore');
  if (!fs.existsSync(key))
    run(
      path.join(
        env.JAVA_HOME,
        'bin',
        process.platform === 'win32' ? 'keytool.exe' : 'keytool',
      ),
      [
        '-genkeypair',
        '-storetype',
        'JKS',
        '-keystore',
        key,
        '-storepass',
        'android',
        '-alias',
        'androiddebugkey',
        '-keypass',
        'android',
        '-keyalg',
        'RSA',
        '-keysize',
        '2048',
        '-validity',
        '10000',
        '-dname',
        'CN=Android Debug,O=Android,C=US',
      ],
      { env },
    );

  // Invalidate old absolute autolinking/CMake paths after a hoisted reinstall.
  for (const directory of ['build', 'app/build', 'app/.cxx'])
    fs.rmSync(path.join(android, directory), { recursive: true, force: true });
  run(
    java,
    [
      '-classpath',
      path.join(android, 'gradle/wrapper/gradle-wrapper.jar'),
      'org.gradle.wrapper.GradleWrapperMain',
      `-Dorg.gradle.java.home=${env.JAVA_HOME}`,
      ':app:assembleRelease',
      '--console=plain',
    ],
    { cwd: android, env },
  );
  const apk = path.join(
    android,
    'app/build/outputs/apk/release/app-release.apk',
  );
  if (!fs.existsSync(apk)) throw new Error('APK release non trovato.');
  console.log(`APK standalone development: ${apk}`);
}

if (require.main === module)
  main().catch((error) => {
    console.error(
      error instanceof Error && error.message.startsWith('JIMO standalone:')
        ? error.message
        : 'JIMO standalone: configurazione o build non valida; verifica la guida.',
    );
    process.exitCode = 1;
  });

module.exports = {
  publicBuildEnvironment,
  checkHostedApi,
  checkWorkspaceLinks,
};
