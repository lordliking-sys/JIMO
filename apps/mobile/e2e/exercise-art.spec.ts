import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

test('real thumbnail composition uses separate light/dark backgrounds, isolated variants and neutral missing-art fallback', async ({
  page,
}, info) => {
  const mobile = resolve('.'),
    out = '/tmp/jimo-exercise-art-component';
  const { build } = createRequire(require.resolve('tsx/package.json'))(
    'esbuild',
  );
  await mkdir(out, { recursive: true });
  await build({
    entryPoints: [join(mobile, 'e2e/exercise-art-harness.tsx')],
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
    loader: { '.png': 'file' },
    assetNames: 'assets/[name]-[hash]',
    alias: {
      'react-native': 'react-native-web',
      'react-native-svg': join(
        mobile,
        'node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js',
      ),
    },
  });
  await page.route('**/artwork-fixture/**', async (route) => {
    const path = new URL(route.request().url()).pathname.split(
      '/artwork-fixture/',
    )[1];
    if (path === 'index.html')
      return route.fulfill({
        contentType: 'text/html',
        body: '<div id="root"></div><script src="exercise-art-harness.js"></script>',
      });
    return route.fulfill({
      contentType: path!.endsWith('.png') ? 'image/png' : 'text/javascript',
      body: await readFile(join(out, path!)),
    });
  });
  await page.goto('/artwork-fixture/index.html');
  await expect(page.getByTestId('exercise-card-light')).toHaveCount(2);
  await expect(page.getByTestId('exercise-card-dark')).toHaveCount(1);
  for (const id of [
    'exercise-art-female-pull_up',
    'exercise-art-male-pull_up',
  ]) {
    const artwork = page.getByTestId(id);
    await expect(artwork).toBeVisible();
    await expect
      .poll(() =>
        artwork
          .locator('img')
          .evaluate(
            (im: HTMLImageElement) => im.complete && im.naturalWidth > 0,
          ),
      )
      .toBe(true);
    expect(
      await artwork.evaluate((el) =>
        [el, ...Array.from(el.querySelectorAll('*'))].some(
          (node) => getComputedStyle(node).backgroundSize === 'contain',
        ),
      ),
    ).toBe(true);
  }
  await expect(page.getByTestId('exercise-art-fallback')).toHaveCount(1);
  await expect(page.getByTestId('exercise-art-female-push_up')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('artwork-composition.png') });
});
