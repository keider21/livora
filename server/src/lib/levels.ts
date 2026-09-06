/**
 * Curva de nivel: cada nivel cuesta un 35% más de experiencia que el anterior.
 * Nivel 1 empieza en 0 XP, nivel 2 a 100 XP, nivel 3 a 235 XP, etc.
 */
const BASE_XP = 100;
const GROWTH = 1.35;

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  let step = BASE_XP;
  for (let i = 1; i < level; i += 1) {
    total += Math.round(step);
    step *= GROWTH;
  }
  return total;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1) && level < 200) {
    level += 1;
  }
  return level;
}

export function levelProgress(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
} {
  const level = levelFromXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const span = nextLevelXp - currentLevelXp;
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progress: span > 0 ? Math.min(1, (xp - currentLevelXp) / span) : 1,
  };
}
