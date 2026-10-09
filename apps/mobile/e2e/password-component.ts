import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
/** Bundle the unchanged screen against isolated hook fixtures, outside the Expo artifact. */
export async function passwordComponentFixture() {
  const mobile = resolve('.'),
    out = '/tmp/jimo-password-component';
  const requireTsx = createRequire(require.resolve('tsx/package.json'));
  const { build } = requireTsx('esbuild');
  await mkdir(out, { recursive: true });
  await build({
    entryPoints: [join(mobile, 'e2e/password-harness.tsx')],
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
    define: {
      'process.env.NODE_ENV': '"test"',
      'process.env': '{}',
      __DEV__: 'false',
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
        name: 'isolated-password-fixtures',
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
            () => ({ path: join(mobile, 'e2e/password-mocks.tsx') }),
          );
        },
      },
    ],
  });
  return out;
}
