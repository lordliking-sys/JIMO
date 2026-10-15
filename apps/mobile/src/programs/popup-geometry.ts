export function popupGeometry(
  width: number,
  height: number,
  top: number,
  bottom: number,
  keyboardTop = height,
) {
  const availableHeight = Math.min(height, keyboardTop);
  const bottomInset = keyboardTop < height ? 0 : bottom;
  return {
    width: Math.min(370, width * 0.86, width - 32),
    maxHeight: Math.max(
      0,
      Math.min(height * 0.8, availableHeight - top - bottomInset - 32),
    ),
    availableHeight,
    bottomInset,
  };
}
