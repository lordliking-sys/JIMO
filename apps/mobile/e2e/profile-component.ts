import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
/** Bundle the unchanged screen against isolated hook fixtures, outside the Expo artifact. */
export async function profileComponentFixture() {
  const mobile = resolve('.'),
    out = '/tmp/jimo-profile-component';
  const requireTsx = createRequire(require.resolve('tsx/package.json'));
  const { build } = requireTsx('esbuild');
  await mkdir(out, { recursive: true });
  await build({
    entryPoints: [join(mobile, 'e2e/profile-harness.tsx')],
    bundle: true,
    outdir: out,
    platform: 'browser',
    resolveExtensions: [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.json',
    ],
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"test"', __DEV__: 'false' },
    loader: { '.png': 'file', '.ttf': 'file' },
    assetNames: 'assets/[name]-[hash]',
    alias: {
      'react-native': 'react-native-web',
      'react-native-svg': join(
        mobile,
        'node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js',
      ),
      '@jimo/ui': join(mobile, '../../packages/ui/src/index.ts'),
      '@jimo/schemas': join(mobile, '../../packages/schemas/src/index.ts'),
    },
    plugins: [
      {
        name: 'isolated-profile-fixtures',
        setup(build: {
          onResolve(
            options: { filter: RegExp },
            callback: () => { path: string },
          ): void;
        }) {
          build.onResolve(
            {
              filter:
                /(?:AccountProvider|SessionProvider|PreferencesProvider|db\/Provider|progress\/queries)$|^expo-router(?:\/js-tabs)?$|^expo-font$|^expo-status-bar$|^react-native-safe-area-context$/,
            },
            () => ({ path: join(mobile, 'e2e/profile-mocks.tsx') }),
          );
          build.onResolve({ filter: /^expo-constants$/ }, () => ({
            path: join(out, 'constants.js'),
          }));
          build.onResolve({ filter: /\/avatar-native$/ }, () => ({
            path: join(mobile, 'e2e/avatar-mocks.ts'),
          }));
        },
      },
    ],
  });
  return out;
}
export async function prepareProfileFixture() {
  const dir = '/tmp/jimo-profile-component';
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'constants.js'),
    'export default {expoConfig:{version:"0.1.0"}};',
  );
  await profileComponentFixture();
}
