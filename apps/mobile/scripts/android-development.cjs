const path = require('node:path');
const { spawn } = require('node:child_process');
const { getConfig } = require('expo/config');

const projectRoot = path.resolve(__dirname, '..');
async function checkApi(baseUrl) {
  const base = baseUrl.replace(/\/+$/, '');
  const results = await Promise.all(
    ['health', 'ready'].map(async (route) => {
      try {
        const response = await fetch(`${base}/${route}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (!response.ok) return `${route}: HTTP ${response.status}`;
        const body = await response.json();
        const expected =
          route === 'health'
            ? body.status === 'ok' && body.service === 'jimo-api'
            : body.status === 'ready' && body.database === 'ok';
        return expected ? null : `${route}: risposta non valida`;
      } catch {
        return `${route}: API non raggiungibile o timeout (controlla LAN, porta e firewall)`;
      }
    }),
  );
  const failures = results.filter(Boolean);
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('JIMO development: /health 200; /ready 200, database ready.');
}
async function main() {
  const mode = process.argv[2];
  if (!['check', 'run', 'start'].includes(mode))
    throw new Error('Usa android:check, android:dev oppure android:metro.');
  process.env.JIMO_APP_VARIANT = 'development';
  process.env.EXPO_PUBLIC_AI_IMPORT_ENABLED = 'false';
  delete process.env.EXPO_PUBLIC_AUTH_TEST;
  const { exp } = getConfig(projectRoot);
  if (exp.android?.package !== 'com.jimo.development')
    throw new Error(
      'La configurazione Android development non è stata applicata.',
    );
  await checkApi(process.env.EXPO_PUBLIC_API_URL);
  if (mode === 'check') return;
  const expoRoot = path.dirname(require.resolve('expo/package.json'));
  const args =
    mode === 'run'
      ? ['run:android', '--device']
      : [
          'start',
          '--dev-client',
          process.env.JIMO_DEV_API_TRANSPORT === 'adb'
            ? '--localhost'
            : '--lan',
          '--clear',
        ];
  const childEnv = { ...process.env };
  for (const key of [
    'DATABASE_URL',
    'CLERK_SECRET_KEY',
    'CLERK_JWT_KEY',
    'OPENAI_API_KEY',
    'DEV_USER_ID',
  ])
    delete childEnv[key];
  const child = spawn(
    process.execPath,
    [path.join(expoRoot, 'bin/cli'), ...args, ...process.argv.slice(3)],
    {
      cwd: projectRoot,
      env: childEnv,
      stdio: 'inherit',
    },
  );
  child.on('error', () => {
    console.error('JIMO development: impossibile avviare Expo.');
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    process.exitCode = code ?? 1;
  });
}
if (require.main === module)
  main().catch((error) => {
    // Only messages created here or by the config guard; never dump env/HTTP bodies.
    console.error(
      error instanceof Error
        ? error.message
        : 'JIMO development: setup fallito.',
    );
    process.exitCode = 1;
  });
