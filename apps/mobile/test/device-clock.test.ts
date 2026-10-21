import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
let prepared: Promise<typeof import('./device-clock-harness')> | undefined;
function adapter() {
  prepared ??= (async () => {
    const requireTsx = createRequire(require.resolve('tsx/package.json')),
      { build } = requireTsx('esbuild');
    const result = await build({
      entryPoints: [resolve('test/device-clock-harness.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      write: false,
      alias: Object.fromEntries(
        ['react', 'react-native'].map((name) => [
          name,
          resolve('test/device-clock-fixture.ts'),
        ]),
      ),
    });
    return import(
      `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`
    );
  })();
  return prepared;
}
test('workout clock suspends background polling and catches up once on foreground without duplicate listeners', async (t) => {
  const { clockDevice: device, ClockProbe } = await adapter();
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: 1_000_000 });
  device.state = 'active';
  device.updates = 0;
  let foregrounds = 0;
  ClockProbe({ onForeground: () => foregrounds++ });
  try {
    assert.equal(device.listeners.size, 1);
    for (const seconds of [30, 120, 300, 600]) {
      device.emit('inactive');
      device.emit('background');
      const updates = device.updates;
      t.mock.timers.tick(seconds * 1000);
      assert.equal(device.updates, updates, 'no hidden per-second render loop');
      const before = foregrounds;
      device.emit('active');
      assert.equal(
        device.now,
        Date.now(),
        'recover from wall clock immediately',
      );
      assert.equal(foregrounds, before + 1);
      device.emit('active');
      assert.equal(
        foregrounds,
        before + 1,
        'duplicate active event is harmless',
      );
      const resumed = device.updates;
      t.mock.timers.tick(1000);
      assert.equal(device.updates, resumed + 1, 'one interval after resume');
    }
  } finally {
    device.cleanup?.();
  }
  assert.equal(device.listeners.size, 0);
  const updates = device.updates;
  t.mock.timers.tick(10_000);
  assert.equal(device.updates, updates);
});
test('mounting a workout clock while backgrounded waits for foreground', async (t) => {
  const { clockDevice: device, ClockProbe } = await adapter();
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: 2_000_000 });
  device.state = 'background';
  device.updates = 0;
  ClockProbe({ onForeground: () => {} });
  try {
    t.mock.timers.tick(120_000);
    assert.equal(device.updates, 0);
    device.emit('active');
    assert.equal(device.now, Date.now());
    const updates = device.updates;
    t.mock.timers.tick(1000);
    assert.equal(device.updates, updates + 1);
  } finally {
    device.cleanup?.();
  }
});
