import assert from 'node:assert/strict';
import test from 'node:test';
import {
  heroArtworkFrame,
  profileArtworkLayout,
} from '../src/themes/anime-pink/artwork-geometry';
const viewports = [
  { width: 320, height: 740 },
  { width: 390, height: 780 },
  { width: 393, height: 851 },
  { width: 430, height: 860 },
  { width: 851, height: 393 },
];
const faces = {
  program: { left: 1050, top: 160, right: 1310, bottom: 400 },
  progress: { left: 1030, top: 190, right: 1310, bottom: 470 },
};
test('landscape hero crops preserve the supplied face landmarks on the four phone sizes', () => {
  for (const viewport of viewports)
    for (const scene of ['program', 'progress'] as const) {
      const height = Math.max(280, Math.min(480, viewport.height * 0.46)),
        frame = heroArtworkFrame(scene, { width: viewport.width, height }),
        face = faces[scene],
        scale = frame.height / 1071;
      assert.ok(frame.left + face.left * scale >= 0);
      assert.ok(frame.left + face.right * scale <= viewport.width);
      assert.ok(frame.top + face.top * scale >= 0);
      assert.ok(frame.top + face.bottom * scale < height - 24);
      assert.ok(
        Math.abs(
          frame.width / frame.height -
            (scene === 'program' ? 1468 : 1469) / 1071,
        ) < 1e-9,
      );
    }
});
test('terrace ledge, character seat and avatar dock form one composition without covering the identity', () => {
  for (const viewport of viewports) {
    const height = Math.max(280, Math.min(480, viewport.height * 0.46)),
      frame = heroArtworkFrame('profile', { width: viewport.width, height }),
      stage = profileArtworkLayout(viewport.width, height);
    assert.ok(
      Math.abs(frame.top + (755 * frame.height) / 1071 - stage.bodyTop) < 1e-9,
    );
    assert.ok(
      Math.abs(
        stage.character.top +
          (850 * stage.character.height) / 1536 -
          stage.bodyTop,
      ) < 1e-9,
    );
    assert.equal(stage.avatar.centerX, viewport.width / 2);
    assert.ok(stage.avatar.centerY - stage.avatar.size / 2 > height);
    assert.ok(stage.character.top > 47);
    assert.ok(stage.character.width <= viewport.width * 0.94);
    assert.ok(stage.character.left >= 0);
    assert.ok(stage.character.left + stage.character.width <= viewport.width);
    assert.ok(
      stage.avatar.centerY + stage.avatar.size / 2 <
        stage.character.top + stage.character.height,
    );
    assert.ok(
      stage.infoTop >= stage.character.top + stage.character.height + 16,
    );
  }
});

test('portrait Home preserves the original seated pose without mirroring or stretching', () => {
  for (const viewport of viewports) {
    const height = Math.max(
      Math.max(280, Math.min(480, viewport.height * 0.46)),
      viewport.width * 1.02 + 24,
    );
    const frame = heroArtworkFrame('home', { width: viewport.width, height });
    const scale = frame.width / 1024;
    assert.ok(Math.abs(frame.width / frame.height - 1024 / 1536) < 1e-9);
    // Crown, left hand and right shoe in the supplied portrait, relative to the rounded body.
    for (const point of [
      { x: 540, y: 540 },
      { x: 20, y: 1390 },
      { x: 1000, y: 1510 },
    ]) {
      assert.ok(frame.left + point.x * scale >= 0);
      assert.ok(frame.left + point.x * scale <= viewport.width);
      assert.ok(frame.top + point.y * scale >= 0);
      assert.ok(frame.top + point.y * scale <= height - 24);
    }
  }
});
