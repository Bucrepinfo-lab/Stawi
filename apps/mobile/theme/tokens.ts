// Stawi design tokens — shared visual language with the web app.
// "Warm savanna fintech": deep forest ink, amber-gold signal, clay accent.

export const colors = {
  bone: '#f6f1e7',
  bone2: '#efe8d9',
  paper: '#fffdf8',
  ink: '#16261f',
  ink2: '#2c4339',
  forest: '#1f4d3a',
  forestDeep: '#16382a',
  gold: '#e0a32e',
  goldDeep: '#b97e15',
  clay: '#c5613c',
  sky: '#3c7d8c',
  dim: '#6b7c73',
  faint: '#9aa79f',
  line: '#dcd3c2',
  good: '#2f7d52',
  warn: '#cc8a1e',
  danger: '#c4452f',
} as const;

export const radius = { sm: 12, md: 18, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const font = {
  // Load via expo-font in a real build; system fallbacks here.
  display: 'Fraunces',
  body: 'HankenGrotesk',
  mono: 'IBMPlexMono',
} as const;
