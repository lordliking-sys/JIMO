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
    headingFont = clamp(frameWidth * 0.105, 34, 46),
    headingLine = Math.ceil(headingFont * 1.2),
    available = height - top - bottom,
    topPadding = clamp(available * 0.034, 20, 28),
    fieldHeight = Math.max(56, 28 * scale + 24),
    labelHeight = 22 * scale,
    headerHeight = headingLine * scale * 2 + 4 + 22 * scale + 14,
    lifterWidth = frameWidth * 0.88,
    lifterScale = lifterWidth / 941,
    handY = 62 * lifterScale,
    lifterDesiredHeight = (760 - 62) * lifterScale,
    lifterMinHeight = (520 - 62) * lifterScale,
    errorSpace = hasError ? 62 * scale : 0,
    fixed =
      topPadding +
      headerHeight +
      (labelHeight + 6 + fieldHeight) * 2 +
      20 +
      56 +
      56 +
      12 +
      errorSpace,
    emailGap = clamp(available - fixed - lifterDesiredHeight, 30, 80),
    lifterHeight = clamp(
      available - fixed - emailGap,
      lifterMinHeight,
      lifterDesiredHeight,
    ),
    fairyWidth = clamp(frameWidth * 0.31, 96, 145),
    fairyScale = fairyWidth / 1024,
    fairyLeft = frameWidth - fairyWidth - 6;
  return {
    frameWidth,
    side,
    contentWidth,
    headingFont,
    headingLine,
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
      writeInset: Math.max(60, fairyWidth * 0.62),
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
