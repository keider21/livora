import { colors, formatCount } from '../index';

describe('formatCount', () => {
  it('deja intactos los números pequeños', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(42)).toBe('42');
    expect(formatCount(999)).toBe('999');
  });

  it('usa un decimal por debajo de diez mil y ninguno por encima', () => {
    expect(formatCount(1000)).toBe('1.0k');
    expect(formatCount(1500)).toBe('1.5k');
    expect(formatCount(10000)).toBe('10k');
    expect(formatCount(25400)).toBe('25k');
  });

  it('pasa a millones con un decimal', () => {
    expect(formatCount(1_000_000)).toBe('1.0M');
    expect(formatCount(2_500_000)).toBe('2.5M');
  });
});

describe('paleta', () => {
  /**
   * Contraste WCAG entre dos colores hex. Protege la decisión de diseño de la
   * Fase 1: sobre el verde de marca el texto va en `onPrimary`, no en blanco.
   */
  function luminance(hex: string): number {
    const channel = (value: number) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  function contrast(a: string, b: string): number {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light! + 0.05) / (dark! + 0.05);
  }

  it('el texto sobre el verde de marca supera 7:1 (AAA)', () => {
    expect(contrast(colors.onPrimary, colors.primary)).toBeGreaterThan(7);
    expect(contrast(colors.onPrimary, colors.secondary)).toBeGreaterThan(7);
  });

  it('el texto normal sobre el fondo supera 7:1 (AAA)', () => {
    expect(contrast(colors.text, colors.bg)).toBeGreaterThan(7);
    expect(contrast(colors.text, colors.surface)).toBeGreaterThan(7);
  });

  it('el blanco sobre el verde no sirve, y por eso existe onPrimary', () => {
    expect(contrast('#FFFFFF', colors.primary)).toBeLessThan(3);
  });
});
