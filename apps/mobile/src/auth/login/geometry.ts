const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Landmarks belong to the original PNGs; anchors are relative to the real input edges. */
export function loginGeometry(
  width: number,
  height: number,
  top: number,
  bottom: number,
  fontScale = 1,
  hasError = false,
) {
  const frameWidth = Math.min(480, width),
    side = frameWidth < 360 ? 24 : 32,
    contentWidth = frameWidth - side * 2,
    scale = Math.max(1, fontScale),
    logoWidth = Math.min(contentWidth * 0.8, 300),
    logoHeight = (logoWidth * 759) / 2072,
    available = height - top - bottom,
    topPadding = clamp(available * 0.024, 16, 22),
    fieldHeight = Math.max(54, 28 * scale + 22),
    labelHeight = 18 * scale,
    fairyWidth = clamp(frameWidth * 0.31, 96, 145),
    minEmailGap = Math.ceil((830 * fairyWidth) / 1024 - labelHeight - 4 + 8),
    headerHeight = logoHeight,
    errorSpace = hasError ? 62 * scale : 0,
    fixed =
      topPadding +
      headerHeight +
      (labelHeight + 4 + fieldHeight) * 2 +
      20 +
      56 +
      48 +
      12 +
      errorSpace,
    // Preserve the torso landmark on short screens by adapting width, not clipping at the chest.
    lifterWidth = Math.min(
      frameWidth * 0.78,
      Math.max(
        frameWidth * 0.64,
        ((available - fixed - minEmailGap) * 941) / (850 - 62),
      ),
    ),
    lifterScale = lifterWidth / 941,
    handY = 62 * lifterScale,
    lifterDesiredHeight = (900 - 62) * lifterScale,
    lifterMinHeight = (850 - 62) * lifterScale,
    emailGap = clamp(
      available - fixed - lifterDesiredHeight,
      minEmailGap,
      Math.max(90, minEmailGap),
    ),
    lifterHeight = clamp(
      available - fixed - emailGap,
      lifterMinHeight,
      lifterDesiredHeight,
    ),
    fairyScale = fairyWidth / 1024,
    fairyLeft = frameWidth - fairyWidth - 6 - clamp(frameWidth * 0.045, 13, 19);
  return {
    frameWidth,
    side,
    contentWidth,
    logoWidth,
    logoHeight,
    topPadding,
    fieldHeight,
    emailGap,
    lifterHeight,
    contentHeight: Math.max(available, fixed + emailGap + lifterHeight),
    fairy: {
      width: fairyWidth,
      height: 1536 * fairyScale,
      left: fairyLeft - side,
      top: -880 * fairyScale,
      seatX: fairyLeft - side + (1024 - 595) * fairyScale,
      writeInset: Math.max(60, fairyWidth * 0.62 + frameWidth * 0.045),
    },
    lifter: {
      width: lifterWidth,
      height: 1672 * lifterScale,
      left: (contentWidth - lifterWidth) / 2,
      top: -handY,
      contacts: [195, 805].map(
        (x) => (contentWidth - lifterWidth) / 2 + x * lifterScale,
      ),
    },
  };
}
