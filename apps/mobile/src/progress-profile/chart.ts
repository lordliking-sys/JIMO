export type ChartPoint = { label: string; value: number | null };
/** Missing observations split paths; they never become zeros or interpolated points. */
export function chartGeometry(
  points: ChartPoint[],
  width: number,
  height: number,
) {
  const visible = points.slice(-26),
    pad = 6;
  const maximum = Math.max(
    1,
    ...visible.flatMap((p) => (p.value === null ? [] : [p.value])),
  );
  const x = (index: number) =>
    visible.length === 1
      ? width / 2
      : pad + (index * (width - pad * 2)) / (visible.length - 1);
  const y = (value: number) =>
    height - pad - (value / maximum) * (height - pad * 2);
  const segments: { index: number; value: number }[][] = [];
  visible.forEach((point, index) => {
    if (point.value === null) return;
    if (index === 0 || visible[index - 1]?.value === null) segments.push([]);
    segments.at(-1)!.push({ index, value: point.value });
  });
  return { visible, x, y, baseline: height - pad, segments };
}
export function monogram(name: string | null) {
  return Array.from(name?.trim() ?? '')[0]?.toLocaleUpperCase() || 'J';
}
