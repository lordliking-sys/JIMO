/** Home and program presentation only; existing application/workout tokens stay intact. */
export const mainInk = {
  charcoal: '#10130f',
  parchment: '#f2e8d6',
  ivory: '#f6edd9',
  green: '#243b2e',
  sage: '#b7c69b',
  muted: '#bcb8ab',
  darkMuted: '#5b6657',
  border: '#58604c',
  paperBorder: '#dacbad',
  paperSurface: 'rgba(248, 240, 221, 0.92)',
  darkSurface: 'rgba(10, 17, 12, 0.90)',
} as const;

export const mainArtwork = {
  home: require('../../assets/jimo/main/home-bg.png'),
  program: require('../../assets/jimo/main/scheda-bg.png'),
  push: require('../../assets/jimo/main/program-days/push.png'),
  pull: require('../../assets/jimo/main/program-days/pull.png'),
  legs: require('../../assets/jimo/main/program-days/legs.png'),
  full: require('../../assets/jimo/main/program-days/full-body.png'),
};
