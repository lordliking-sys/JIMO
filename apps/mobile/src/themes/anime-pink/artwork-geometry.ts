type Size = { width: number; height: number };
export type ArtworkScene = 'home' | 'program' | 'progress' | 'profile';
const originals = {
  home: { width: 1469, height: 1071, x: 0.78, y: 0.1 },
  program: { width: 1468, height: 1071, x: 0.8, y: 0.1 },
  progress: { width: 1469, height: 1071, x: 0.8, y: 0.2 },
  profile: { width: 1468, height: 1071, x: 0.45, y: 0 },
};
/** Cover preserves the original ratio; alignment keeps the right-hand subjects visible. */
export function heroArtworkFrame(scene: ArtworkScene, viewport: Size) {
  const original = originals[scene];
  const scale = Math.max(
    viewport.width / original.width,
    viewport.height / original.height,
    // The terrace's actual ledge meets the top of the rounded body.
    scene === 'profile' ? (viewport.height - 24) / 755 : 0,
  );
  const width = original.width * scale,
    height = original.height * scale;
  return {
    width,
    height,
    left: -(width - viewport.width) * original.x,
    top:
      scene === 'profile'
        ? viewport.height - 24 - 755 * scale
        : -(height - viewport.height) * original.y,
  };
}
/** Landmarks refer to the supplied 1024×1536 transparent PNG, never a generated cutout. */
export function profileArtworkLayout(
  width: number,
  heroHeight: number,
  topInset = 24,
) {
  const bodyTop = heroHeight - 24;
  const scale = Math.min(
    (width * 0.86) / 1024,
    480 / 1024,
    Math.max(0.1, (bodyTop - topInset - 56) / 850),
  );
  const top = bodyTop - 850 * scale;
  const character = {
    width: 1024 * scale,
    height: 1536 * scale,
    left: (width - 1024 * scale) / 2,
    top,
  };
  return {
    character,
    bodyTop,
    avatar: { centerX: width / 2, centerY: top + 1250 * scale, size: 84 },
    infoTop: top + 1536 * scale + 16,
  };
}
