import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import {
  chooseAvatar,
  type AvatarMetadata,
} from '../src/progress-profile/avatar-store';

let prepared: Promise<typeof import('./avatar-native-harness')> | undefined;
function nativeAdapter() {
  prepared ??= (async () => {
    const requireTsx = createRequire(require.resolve('tsx/package.json')),
      { build } = requireTsx('esbuild'),
      root = resolve('test');
    const result = await build({
      entryPoints: [resolve(root, 'avatar-native-harness.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      write: false,
      alias: Object.fromEntries(
        [
          'expo-file-system',
          'expo-image-picker',
          'expo-crypto',
          'react-native',
        ].map((name) => [name, resolve(root, 'avatar-device-fixture.ts')]),
      ),
    });
    return import(
      `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`
    );
  })();
  return prepared;
}
async function fixture() {
  const native = await nativeAdapter();
  native.resetDevice();
  const values = new Map<string, string>(),
    writes: string[] = [];
  const metadata: AvatarMetadata = async (owner, key, value) => {
    if (value !== undefined) {
      values.set(`${owner}:${key}`, value);
      writes.push(value);
    }
    return values.get(`${owner}:${key}`) ?? null;
  };
  return {
    ...native,
    metadata,
    writes,
    store: native.createAvatarStore(metadata),
  };
}
for (const source of ['gallery', 'camera'] as const)
  test(`real native adapter: ${source} waits for Expo 57 asynchronous copy before binding a filename-less image`, async () => {
    const f = await fixture(),
      photo = await chooseAvatar(source, f.avatarPicker);
    assert.ok(photo);
    const pending = f.store.replace('account-A', photo);
    await Promise.resolve();
    assert.equal(f.writes.length, 0);
    const uri = await pending;
    assert.match(
      uri,
      /^file:\/\/\/documents\/jimo\/profile-avatars\/account-A\/photo-.*\.jpg$/,
    );
    assert.ok(
      f.device.calls.indexOf('copy:complete') <
        f.device.calls.indexOf('decode'),
    );
    assert.equal(await f.store.read('account-A'), uri);
    f.device.files.delete(photo.uri);
    assert.equal(await f.createAvatarStore(f.metadata).read('account-A'), uri);
    assert.equal(await f.store.read('account-B'), null);
    await f.store.remove('account-A');
    assert.equal(f.device.files.has(uri), false);
  });
test('real native adapter: readable Android content provider without stat/extension is copied and decoded', async () => {
  const f = await fixture();
  f.device.uri = 'content://fixture-provider/photo/42';
  f.device.files.set(f.device.uri, {
    readable: true,
    decodable: true,
    size: 100,
  });
  const photo = await chooseAvatar('gallery', f.avatarPicker);
  const uri = await f.store.replace('account-A', photo!);
  assert.equal(await f.store.read('account-A'), uri);
  assert.ok(
    f.device.files.has(f.device.uri),
    'original provider resource is untouched',
  );
});
test('real native adapter: unreadable or undecodable source keeps current avatar and removes partial copies', async () => {
  const f = await fixture(),
    original = await f.store.replace('account-A', { uri: f.device.uri });
  for (const [uri, readable, decodable, size] of [
    ['content://fixture-provider/denied', false, false, 0],
    ['file:///picker/corrupt-with-misleading.jpg', true, false, 100],
    ['file:///picker/empty', true, false, 0],
  ] as const) {
    f.device.files.set(uri, { readable, decodable, size });
    await assert.rejects(f.store.replace('account-A', { uri }));
    assert.equal(await f.store.read('account-A'), original);
    assert.deepEqual(
      [...f.device.files.keys()].filter((key) =>
        key.startsWith('file:///documents'),
      ),
      [original],
    );
  }
});
test('real native adapter: camera/gallery cancellation and denied permission never copy or bind a file', async () => {
  const f = await fixture();
  for (const source of ['camera', 'gallery'] as const) {
    f.device.canceled = true;
    assert.equal(await chooseAvatar(source, f.avatarPicker), null);
    f.device.canceled = false;
    f.device.granted = false;
    await assert.rejects(chooseAvatar(source, f.avatarPicker));
    f.device.granted = true;
  }
  assert.equal(f.writes.length, 0);
  assert.ok(!f.device.calls.includes('copy:start'));
});
