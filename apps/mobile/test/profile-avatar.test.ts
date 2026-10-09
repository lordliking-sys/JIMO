import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  avatarKey,
  AvatarError,
  LocalAvatarStore,
  chooseAvatar,
  type AvatarFiles,
  type AvatarMetadata,
} from '../src/progress-profile/avatar-store';

function fixture() {
  const values = new Map<string, string>(),
    files = new Set(['picker://first', 'picker://second']);
  let sequence = 0,
    failWrite = false;
  const metadata: AvatarMetadata = async (owner, key, value) => {
    if (value !== undefined) {
      if (failWrite) throw new Error('storage unavailable');
      values.set(`${owner}:${key}`, value);
    }
    return values.get(`${owner}:${key}`) ?? null;
  };
  const fileSystem: AvatarFiles = {
    directory: (owner) => `file:///documents/jimo/profile-avatars/${owner}/`,
    exists: async (uri) => files.has(uri),
    copy: async (source, destination) => {
      if (!files.has(source)) throw new AvatarError('unavailable');
      files.add(destination);
    },
    delete: async (uri) => {
      files.delete(uri);
    },
  };
  const open = () =>
    new LocalAvatarStore(metadata, fileSystem, () => `photo-${++sequence}`);
  return {
    values,
    files,
    metadata,
    fileSystem,
    open,
    failWrite: () => {
      failWrite = true;
    },
  };
}
test('no photo is a neutral fallback; chosen photo gets a persistent copy, never the picker URI', async () => {
  const f = fixture(),
    store = f.open();
  assert.equal(await store.read('account-A'), null);
  const uri = await store.replace('account-A', {
    uri: 'picker://first',
    mimeType: 'image/png',
  });
  assert.match(uri, /\/account-A\/photo-1\.png$/);
  assert.equal(await store.read('account-A'), uri);
  assert.ok(
    f.files.has('picker://first'),
    'original picker/gallery file is untouched',
  );
  f.files.delete('picker://first');
  assert.equal(
    await store.read('account-A'),
    uri,
    'no dependency on expired picker URI',
  );
});
test('changing photo deletes the old owned copy; removal clears metadata and deletes only our copy', async () => {
  const f = fixture(),
    store = f.open(),
    first = await store.replace('account-A', { uri: 'picker://first' }),
    second = await store.replace('account-A', { uri: 'picker://second' });
  assert.equal(f.files.has(first), false);
  assert.equal(await store.read('account-A'), second);
  await store.remove('account-A');
  assert.equal(await store.read('account-A'), null);
  assert.equal(f.files.has(second), false);
  assert.ok(f.files.has('picker://first') && f.files.has('picker://second'));
});
test('accounts are isolated, including a forged metadata pointer to another account', async () => {
  const f = fixture(),
    store = f.open(),
    a = await store.replace('account-A', { uri: 'picker://first' });
  assert.equal(await store.read('account-B'), null);
  await f.metadata('account-B', avatarKey, a);
  assert.equal(await store.read('account-B'), null);
  await store.remove('account-B');
  assert.ok(f.files.has(a));
  assert.equal(await store.read('account-A'), a);
});
test('restart and logout/login the same account retain the local association', async () => {
  const f = fixture(),
    uri = await f.open().replace('account-A', { uri: 'picker://first' });
  assert.equal(await f.open().read('account-A'), uri);
  // Logout unbinds the runtime owner; it never clears this local, per-user key.
  assert.equal(await f.open().read('account-B'), null);
  assert.equal(await f.open().read('account-A'), uri);
});
test('missing persistent files and remote/corrupt metadata fall back without rendering or deleting foreign files', async () => {
  const f = fixture(),
    store = f.open(),
    uri = await store.replace('account-A', { uri: 'picker://first' });
  f.files.delete(uri);
  assert.equal(await store.read('account-A'), null);
  for (const pointer of [
    'https://example.invalid/avatar.jpg',
    'file:///documents/private.jpg',
  ]) {
    f.files.add(pointer);
    await f.metadata('account-A', avatarKey, pointer);
    assert.equal(await store.read('account-A'), null);
    assert.ok(f.files.has(pointer));
  }
  await assert.rejects(store.read('../account-B'), AvatarError);
});
test('missing picker file and failed metadata write preserve the previous photo and remove any new orphan', async () => {
  const f = fixture(),
    store = f.open(),
    previous = await store.replace('account-A', { uri: 'picker://first' });
  await assert.rejects(
    store.replace('account-A', { uri: 'picker://missing' }),
    AvatarError,
  );
  assert.equal(await store.read('account-A'), previous);
  f.failWrite();
  await assert.rejects(store.replace('account-A', { uri: 'picker://second' }));
  assert.equal(await store.read('account-A'), previous);
  assert.deepEqual(
    [...f.files].filter((uri) => uri.startsWith('file:')),
    [previous],
  );
});
test('account switch during copy rolls back the in-flight file and does not bind it to either account', async () => {
  const f = fixture();
  let current = true;
  const store = new LocalAvatarStore(
    f.metadata,
    {
      ...f.fileSystem,
      copy: async (source, destination) => {
        await f.fileSystem.copy(source, destination);
        current = false;
      },
    },
    () => 'in-flight',
  );
  await assert.rejects(
    store.replace('account-A', { uri: 'picker://first' }, () => current),
    (error: unknown) =>
      error instanceof AvatarError && error.kind === 'identityChanged',
  );
  assert.equal(await store.read('account-A'), null);
  assert.equal(await store.read('account-B'), null);
  assert.equal(
    [...f.files].some((uri) => uri.startsWith('file:')),
    false,
  );
});
test('a delayed image-error callback cannot delete a newly selected photo', async () => {
  const f = fixture(),
    store = f.open(),
    first = await store.replace('account-A', { uri: 'picker://first' }),
    second = await store.replace('account-A', { uri: 'picker://second' });
  await store.remove('account-A', first);
  assert.equal(await store.read('account-A'), second);
});
for (const source of ['camera', 'gallery'] as const) {
  test(`${source}: cancellation does not change a photo and permissions are requested only on selection`, async () => {
    const calls: string[] = [];
    const picker = {
      permission: async () => {
        calls.push('permission');
        return true;
      },
      pick: async () => {
        calls.push('picker');
        return null;
      },
    };
    assert.deepEqual(calls, []);
    assert.equal(await chooseAvatar(source, picker), null);
    assert.deepEqual(calls, ['permission', 'picker']);
  });
  test(`${source}: denied or dismissed permission never opens picker`, async () => {
    await assert.rejects(
      chooseAvatar(source, {
        permission: async () => false,
        pick: async () => {
          assert.fail('picker must not open');
        },
      }),
      (error: unknown) =>
        error instanceof AvatarError && error.kind === `${source}Permission`,
    );
  });
}
test('account switch while permission dialog is open prevents the camera/gallery launch', async () => {
  let current = true;
  await assert.rejects(
    chooseAvatar(
      'gallery',
      {
        permission: async () => {
          current = false;
          return true;
        },
        pick: async () => {
          assert.fail('different account must not launch picker');
        },
      },
      () => current,
    ),
    AvatarError,
  );
});
