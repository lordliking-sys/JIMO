import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
export async function loginComponentFixture() {
  const mobile = resolve('.'),
    out = '/tmp/jimo-login-component',
    requireTsx = createRequire(require.resolve('tsx/package.json')),
    { build } = requireTsx('esbuild');
  await mkdir(out, { recursive: true });
  await build({
    entryPoints: [join(mobile, 'e2e/login-harness.tsx')],
    bundle: true,
    outdir: out,
    platform: 'browser',
    jsx: 'automatic',
    resolveExtensions: [
      '.web.tsx',
      '.web.ts',
      '.web.js',
      '.tsx',
      '.ts',
      '.js',
      '.json',
    ],
    define: {
      'process.env.NODE_ENV': '"test"',
      'process.env': '{}',
      __DEV__: 'false',
      global: 'globalThis',
    },
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
        name: 'isolated-login',
        setup(build: {
          onResolve(
            options: { filter: RegExp },
            callback: () => { path: string },
          ): void;
        }) {
          build.onResolve(
            {
              filter:
                /(?:SessionProvider)$|^expo-router$|^expo-font$|^expo-status-bar$|^react-native-safe-area-context$/,
            },
            () => ({ path: join(mobile, 'e2e/login-mocks.tsx') }),
          );
        },
      },
    ],
  });
  return out;
}
