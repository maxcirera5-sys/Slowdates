// ALMA palette — dark, premium, Vision Pro / Raya inflected.
export const colors = {
  background: '#060816',
  // Slightly lifted grounds for layered surfaces.
  surface: '#0E1024',
  surfaceAlt: '#141634',

  primary: '#7C4DFF',
  secondary: '#A855F7',
  accent: '#C084FC',
  success: '#34D399',
  danger: '#FB7185',
  warning: '#FBBF24',

  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#6B6B7B',

  // Glassmorphism helpers (used with expo-blur / translucent fills).
  glass: 'rgba(255,255,255,0.06)',
  glassStrong: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.18)',

  // Brand gradient stops.
  gradient: ['#7C4DFF', '#A855F7', '#C084FC'] as const,
  gradientSoft: ['rgba(124,77,255,0.25)', 'rgba(192,132,252,0.05)'] as const,
} as const;

export type AppColors = typeof colors;
