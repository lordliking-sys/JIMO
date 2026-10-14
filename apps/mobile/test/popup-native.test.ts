import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
let prepared: Promise<typeof import('./popup-native-harness')> | undefined;
function adapter() {
  prepared ??= (async () => {
    const requireTsx = createRequire(require.resolve('tsx/package.json')),
      { build } = requireTsx('esbuild');
    const result = await build({
      entryPoints: [resolve('test/popup-native-harness.tsx')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      banner: {
        js: `import { createRequire as nativeTestRequire } from 'node:module'; const require = nativeTestRequire(${JSON.stringify(resolve('package.json'))});`,
      },
      write: false,
      jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"test"' },
      plugins: [
        {
          name: 'popup-native-test',
          setup(build: {
            onResolve(
              options: { filter: RegExp },
              callback: () => { path: string },
            ): void;
          }) {
            build.onResolve(
              {
                filter:
                  /^react-native$|^react-native-safe-area-context$|^react-native-reanimated$|^react-i18next$|^@jimo\/ui$|^\.\/presentation$|^lucide-react-native\//,
              },
              () => ({ path: resolve('test/popup-native-fixture.tsx') }),
            );
          },
        },
      ],
    });
    return import(
      `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`
    );
  })();
  return prepared;
}
test('actual popup native Modal wires Android back and keyboard dismissal, without closing pending/dirty forms', async () => {
  const f = await adapter();
  f.openPopup();
  assert.equal(f.nativePopup.modal!.statusBarTranslucent, true);
  f.nativePopup.modal!.onRequestClose();
  assert.equal(f.nativePopup.close, 1);
  assert.equal(f.nativePopup.keyboardDismissals, 1);
  for (const [dirty, busy] of [
    [true, false],
    [false, true],
  ]) {
    f.openPopup(dirty, busy);
    f.nativePopup.modal!.onRequestClose();
    assert.equal(f.nativePopup.close, 0);
    f.nativePopup.buttons.find((b) => b.testID === 'program-popup-backdrop')!
      .onPress!();
    assert.equal(f.nativePopup.close, 0);
  }
});
