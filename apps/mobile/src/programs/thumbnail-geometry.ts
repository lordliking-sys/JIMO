/** Alpha bounds measured read-only from the original PNGs; no files are cropped. */
const bounds: Record<string, number[]> = {
  'male/leg_raise': [1086, 1448, 0, 0, 1070, 1448],
  'male/stretching': [1086, 1448, 0, 9, 1086, 1448],
  'male/push_up': [1086, 1448, 0, 69, 1086, 1432],
  'male/dip': [1254, 1254, 0, 0, 1240, 1254],
  'male/plank': [1086, 1448, 8, 13, 1086, 1448],
  'male/squat': [1086, 1448, 0, 15, 1078, 1448],
  'male/pull_up': [1086, 1448, 0, 0, 1056, 1448],
  'male/hollow_hold': [1086, 1448, 0, 26, 1086, 1416],
  'male/glute_bridge': [1086, 1448, 0, 23, 1086, 1448],
  'male/lunge': [1086, 1448, 9, 17, 1072, 1448],
  'female/leg_raise': [1086, 1448, 0, 0, 1086, 1448],
  'female/stretching': [1086, 1448, 0, 19, 1086, 1448],
  'female/dip': [1086, 1448, 0, 0, 1017, 1430],
  'female/plank': [1086, 1448, 0, 20, 1086, 1432],
  'female/squat': [1086, 1448, 0, 0, 1086, 1448],
  'female/pull_up': [1086, 1448, 0, 0, 1078, 1448],
  'female/hollow_hold': [1086, 1448, 0, 21, 1086, 1448],
  'female/lunge': [1086, 1448, 0, 5, 1075, 1448],
};
export function thumbnailGeometry(
  key: string | null,
  variant: string,
  size: number,
) {
  const b = key ? bounds[`${variant}/${key}`] : null;
  const ratio = b ? (b[4]! - b[2]!) / (b[5]! - b[3]!) : 1;
  const wide =
    ratio > 1.2 ||
    ['push_up', 'glute_bridge', 'plank', 'hollow_hold'].includes(key ?? '');
  const width = Math.round(size * (wide ? 1.5 : 1));
  const height = Math.round(size * (wide ? 1 : 1.3));
  const padding = Math.max(5, size * 0.08);
  if (!b)
    return {
      width,
      height,
      image: { width: width - padding * 2, height: height - padding * 2 },
    };
  const [sw, sh, left, top, right, bottom] = b as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const scale = Math.min(
    (width - padding * 2) / (right - left),
    (height - padding * 2) / (bottom - top),
  );
  return {
    width,
    height,
    image: {
      position: 'absolute' as const,
      width: sw * scale,
      height: sh * scale,
      left: (width - (right - left) * scale) / 2 - left * scale,
      top: (height - (bottom - top) * scale) / 2 - top * scale,
    },
  };
}
