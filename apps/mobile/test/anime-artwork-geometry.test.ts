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
  home: { left: 1010, top: 90, right: 1260, bottom: 345 },
  program: { left: 1050, top: 85, right: 1310, bottom: 360 },
  progress: { left: 1030, top: 190, right: 1310, bottom: 470 },
};
test('landscape hero crops preserve the supplied face landmarks on the four phone sizes', () => {
  for (const viewport of viewports)
    for (const scene of ['home', 'program', 'progress'] as const) {
      const height = Math.max(280, Math.min(480, viewport.height * 0.46)),
        frame = heroArtworkFrame(scene, { width: viewport.width, height }),
        face = faces[scene],
        scale = frame.height / 1071;
      assert.ok(frame.left + face.left * scale >= 0);
      assert.ok(frame.left + face.right * scale <= viewport.width);
      assert.ok(frame.top + face.top * scale >= 0);
      assert.ok(frame.top + face.bottom * scale < height - 24);
      assert.ok(Math.abs(frame.width / frame.height - 1469 / 1071) < 1e-9);
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
