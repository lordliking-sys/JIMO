/** Scroll just enough to reveal a field in the visible part of a form. */
export function scrollToReveal({
  fieldTop,
  fieldHeight,
  viewportTop,
  viewportBottom,
  offset,
  gap = 16,
}: {
  fieldTop: number;
  fieldHeight: number;
  viewportTop: number;
  viewportBottom: number;
  offset: number;
  gap?: number;
}): number {
  const visibleHeight = Math.max(0, viewportBottom - viewportTop - gap * 2);
  const bottom = fieldTop + Math.min(fieldHeight, visibleHeight);
  if (fieldTop < viewportTop + gap)
    return Math.max(0, offset + fieldTop - viewportTop - gap);
  if (bottom > viewportBottom - gap)
    return Math.max(0, offset + bottom - viewportBottom + gap);
  return offset;
}
