/** Paleta y escalas compartidas por toda la app. */

export const colors = {
  // Negro con un punto de verde: el fondo nunca es gris neutro.
  bg: '#050A07',
  surface: '#0C1511',
  surfaceAlt: '#152219',
  border: '#20342A',

  primary: '#00E676',
  primaryDark: '#00A85A',
  secondary: '#A8FF3E',
  accent: '#FFD24A',

  /**
   * Tinta para el texto y los iconos que van ENCIMA del verde o el lima.
   * Sobre un neón tan claro el blanco no llega ni a 2:1 de contraste; este
   * verde casi negro pasa de 12:1.
   */
  onPrimary: '#04160D',

  live: '#FF3355',
  success: '#38EF7D',
  danger: '#FF4D5E',

  text: '#EAFBF1',
  textMuted: '#8FA89B',
  textFaint: '#5C7268',

  coin: '#FFD24A',
  diamond: '#5EE7FF',

  overlay: 'rgba(5, 10, 7, 0.72)',
} as const;

export const gradients = {
  brand: [colors.primary, colors.secondary] as const,
  live: ['#FF3355', '#FF7A45'] as const,
  night: ['#0C1511', '#050A07'] as const,
  gold: ['#FFD24A', '#FF9A3C'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 26, fontWeight: '800' as const, color: colors.text },
  heading: { fontSize: 19, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '500' as const, color: colors.text },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.textMuted },
  caption: { fontSize: 11, fontWeight: '600' as const, color: colors.textFaint },
};

export const tierColors: Record<string, string> = {
  basic: '#8FA89B',
  rare: '#5EE7FF',
  epic: '#00E676',
  legendary: '#FFD24A',
};

/** Velo sobre el vídeo, para que el texto se lea sin tapar la imagen. */
export const scrim = {
  soft: 'rgba(5,10,7,0.55)',
  strong: 'rgba(5,10,7,0.72)',
} as const;

/** 1.2k, 3.4M… para contadores de espectadores y diamantes. */
export function formatCount(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}
