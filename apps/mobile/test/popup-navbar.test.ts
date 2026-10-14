import assert from 'node:assert/strict';
import test from 'node:test';
import { floatingNavGeometry } from '../src/components/floating-nav-geometry';
import { popupGeometry } from '../src/programs/popup-geometry';
const devices = [
  [320, 740, 24, 48],
  [390, 780, 24, 48],
  [393, 851, 47, 34],
  [430, 860, 47, 34],
];
test('floating capsule and four targets fit safe areas while reserving the whole obscured region', () => {
  for (const [width, , , bottom] of devices) {
    for (const fontScale of [1, 1.3, 2]) {
      const g = floatingNavGeometry(width!, bottom!, 12, 8, fontScale);
      assert.ok(g.margin >= 16 && g.margin <= 24);
      assert.ok(g.height >= 76 && g.height <= 84);
      assert.ok(g.slot >= 48);
      assert.equal(g.capsuleWidth + g.margin * 2 + 12 + 8, width);
      assert.equal(g.occupiedHeight, g.height + bottom! + 12);
    }
  }
});
test('central popup stays bounded on phones/tablets and above a keyboard without becoming fullscreen', () => {
  for (const [width, height, top, bottom] of [
    ...devices,
    [1024, 768, 24, 34],
  ]) {
    for (const keyboardTop of [height!, height! - 300]) {
      const g = popupGeometry(width!, height!, top!, bottom!, keyboardTop);
      assert.ok(g.width <= 460);
      assert.ok((width! - g.width) / 2 >= 16);
      assert.ok(g.maxHeight < height!);
      assert.equal(g.maxHeight + top! + g.bottomInset + 32, g.availableHeight);
      assert.ok(g.maxHeight >= 240);
    }
  }
});
