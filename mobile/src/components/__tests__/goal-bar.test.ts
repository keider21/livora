import { avanceDeMeta } from '../goal-bar';
import type { RoomGoal, SalaryLevel } from '../../api/types';

const NIVELES: SalaryLevel[] = [
  { nivel: 1, meta: 150_000, salario: 10_000 },
  { nivel: 2, meta: 300_000, salario: 13_000 },
  { nivel: 3, meta: 600_000, salario: 30_000 },
];

function meta(parcial: Partial<RoomGoal>): RoomGoal {
  return {
    luckyCoins: 0,
    nivel: 0,
    base: 0,
    siguiente: NIVELES[0],
    liveSeconds: 0,
    segundosMinimos: 7_200,
    cumpleHoras: false,
    ...parcial,
  };
}

describe('avance de la meta en directo', () => {
  it('el primer nivel se mide desde cero', () => {
    expect(avanceDeMeta(meta({ luckyCoins: 75_000 }))).toBeCloseTo(0.5);
  });

  it('al subir de nivel la barra vuelve a empezar', () => {
    // Con 150.000 justas el nivel 1 está cerrado: la barra tiene que verse
    // vacía en el tramo hacia el 2, no llena a la mitad del día.
    const recienSubido = meta({ luckyCoins: 150_000, nivel: 1, base: 150_000, siguiente: NIVELES[1] });
    expect(avanceDeMeta(recienSubido)).toBe(0);

    const mediado = meta({ luckyCoins: 225_000, nivel: 1, base: 150_000, siguiente: NIVELES[1] });
    expect(avanceDeMeta(mediado)).toBeCloseTo(0.5);
  });

  it('sigue midiendo bien pasada la tabla, de millón en millón', () => {
    // Después del último nivel el salario sube por millón, y esos escalones no
    // están en la tabla: el suelo lo manda el servidor.
    const extra = meta({
      luckyCoins: 102_400_000,
      nivel: 13,
      base: 102_000_000,
      siguiente: { nivel: 16, meta: 103_000_000, salario: 2_030_000 },
    });
    expect(avanceDeMeta(extra)).toBeCloseTo(0.4);
  });

  it('sin nivel siguiente la barra se queda llena', () => {
    expect(avanceDeMeta(meta({ luckyCoins: 9_000_000, nivel: 3, siguiente: null }))).toBe(1);
  });

  it('nunca se sale de la barra', () => {
    const desconocido = meta({ luckyCoins: 1_000_000, nivel: 1, base: 150_000, siguiente: NIVELES[1] });
    expect(avanceDeMeta(desconocido)).toBe(1);
  });
});
