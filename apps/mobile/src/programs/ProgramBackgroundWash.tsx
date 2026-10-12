import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Native gradients must receive actual Stop children, never Fragments. */
export function ProgramBackgroundWash({
  id,
  height,
  dark,
  palette,
  surface = palette.paper,
}: {
  id: string;
  height: number;
  dark: boolean;
  palette: { paper: string; charcoal: string };
  surface?: string;
}) {
  const stops = dark
    ? [
        { offset: 0, color: palette.charcoal, opacity: 0.82 },
        { offset: 0.45, color: palette.charcoal, opacity: 0.68 },
        { offset: 0.8, color: surface, opacity: 0.88 },
        { offset: 1, color: surface, opacity: 1 },
      ]
    : [
        { offset: 0, color: surface, opacity: 0.24 },
        { offset: 0.6, color: surface, opacity: 0.78 },
        { offset: 1, color: surface, opacity: 1 },
      ];
  return (
    <Svg
      pointerEvents="none"
      accessible={false}
      width="100%"
      height={height}
      style={{ position: 'absolute', top: 0 }}
    >
      <Defs>
        <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
          {stops.map((stop) => (
            <Stop
              key={stop.offset}
              offset={stop.offset}
              stopColor={stop.color}
              stopOpacity={stop.opacity}
            />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
