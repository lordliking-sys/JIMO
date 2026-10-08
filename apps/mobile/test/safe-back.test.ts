import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  registerSafeHardwareBack,
  safeBack,
  type BackFallback,
} from '../src/navigation/safe-back';

test('SafeBack uses current history, including a stack reset after a deep link', () => {
  let hasPrevious = true;
  const actions: string[] = [],
    navigation = {
      canGoBack: () => hasPrevious,
      back: () => {
        assert.ok(hasPrevious, 'never dispatch GO_BACK on an empty stack');
        actions.push('back');
      },
      replace: (route: BackFallback) => {
        actions.push(route);
      },
    };
  assert.equal(safeBack(navigation), 'back');
  hasPrevious = false;
  for (const route of ['/workout', '/program', '/'] as const) {
    assert.equal(safeBack(navigation, route), 'fallback');
  }
  assert.deepEqual(actions, ['back', '/workout', '/program', '/']);
});

test('preview dismissal takes priority over route history and never navigates', () => {
  let dismissed = 0;
  const unexpected = () => {
    throw new Error('A preview must not navigate or inspect route history');
  };
  assert.equal(
    safeBack(
      { canGoBack: unexpected, back: unexpected, replace: unexpected },
      '/workout',
      () => dismissed++,
    ),
    'dismiss',
  );
  assert.equal(dismissed, 1);
});

test('Android hardware back consumes the event, falls back safely and unregisters on blur', () => {
  let listener: (() => boolean) | null = null;
  const actions: string[] = [];
  const source = {
    addEventListener: (name: 'hardwareBackPress', callback: () => boolean) => {
      assert.equal(name, 'hardwareBackPress');
      listener = callback;
      return {
        remove: () => {
          listener = null;
        },
      };
    },
  };
  const release = registerSafeHardwareBack(source, () =>
    safeBack({
      canGoBack: () => false,
      back: () => assert.fail('Unhandled GO_BACK'),
      replace: (route) => {
        actions.push(route);
      },
    }),
  );
  assert.equal((listener as unknown as () => boolean)(), true);
  assert.deepEqual(actions, ['/workout']);
  release();
  assert.equal(listener, null);
});
