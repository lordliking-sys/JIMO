export function floatingNavGeometry(
  width: number,
  bottom: number,
  left = 0,
  right = 0,
  fontScale = 1,
) {
  const margin = width < 360 ? 16 : 24;
  const height = 80 + Math.min(4, Math.max(0, fontScale - 1) * 8);
  const gap = bottom + 12;
  const capsuleWidth = width - left - right - margin * 2;
  return {
    margin,
    height,
    gap,
    capsuleWidth,
    slot: (capsuleWidth - 14) / 4,
    occupiedHeight: height + gap,
  };
}
