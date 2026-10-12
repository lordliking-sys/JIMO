import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
let prepared: Promise<typeof import('./android-ui-harness')> | undefined;
function adapter() {
  prepared ??= (async () => {
    const requireTsx = createRequire(require.resolve('tsx/package.json')),
      { build } = requireTsx('esbuild');
    const result = await build({
      entryPoints: [resolve('test/android-ui-harness.tsx')],
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
          name: 'native-ui-fixture',
          setup(build: {
            onResolve(
              options: { filter: RegExp },
              callback: () => { path: string },
            ): void;
          }) {
            build.onResolve({ filter: /^\.\/native-gradient-parser$/ }, () => ({
              path: resolve(
                'node_modules/react-native-svg/src/lib/extract/extractGradient.ts',
              ),
            }));
            build.onResolve(
              {
                filter:
                  /^react-native$|^react-native-svg$|^react-i18next$|^@jimo\/ui$|^@react-native-community\/datetimepicker$|^\.\/presentation$|^\.\/components$|^lucide-react-native\//,
              },
              () => ({ path: resolve('test/android-ui-fixture.tsx') }),
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
test('native SVG reproduction: a Fragment receives parent and its nested Stop is lost', async () => {
  const f = await adapter(),
    result = f.fragmentRegression()!;
  assert.equal(result.children[0]!.props.parent !== undefined, true);
  assert.notDeepEqual(
    result.gradient.filter((_, i) => i % 2 === 0),
    [0.45],
  );
});
for (const dark of [false, true])
  test(`native SVG parser preserves all ${dark ? 'ink' : 'parchment'} stops without Fragment children`, async () => {
    const f = await adapter(),
      result = f.nativeGradient(dark)!;
    assert.deepEqual(f.stopTypes(dark), Array(dark ? 4 : 3).fill('Stop'));
    assert.deepEqual(
      result.gradient.filter((_, i) => i % 2 === 0),
      dark ? [0, 0.45, 0.8, 1] : [0, 0.6, 1],
    );
    assert.equal(result.gradient.at(-1)! >>> 24, 255);
  });
test('actual Android DateField uses current callbacks; selection preserves local calendar dates through DST and dismiss never writes', async () => {
  const f = await adapter(),
    original = process.env.TZ;
  try {
    for (const zone of [
      'Europe/Rome',
      'America/Los_Angeles',
      'Pacific/Kiritimati',
    ]) {
      process.env.TZ = zone;
      const changes: string[] = [];
      f.openDate('2026-10-25', changes);
      const picker = f.device.picker!;
      assert.equal(picker.mode, 'date');
      assert.equal(picker.value.getDate(), 25);
      assert.equal(picker.onChange, undefined);
      assert.equal(f.device.dismissals, 1);
      picker.onDismiss!();
      assert.deepEqual(changes, []);
      const selected = new Date(2026, 9, 26, 0, 0);
      picker.onValueChange!(
        { nativeEvent: { timestamp: selected.getTime(), utcOffset: 0 } },
        selected,
      );
      assert.deepEqual(changes, ['2026-10-26']);
      picker.onDismiss!();
      assert.deepEqual(changes, ['2026-10-26']);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
