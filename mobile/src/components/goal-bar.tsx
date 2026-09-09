import { StyleSheet, Pressable, Text, View } from 'react-native';
import type { RoomGoal } from '../api/types';
import { colors, formatCount, radius, spacing } from '../theme';

/**
 * La meta del anfitrión mientras está en directo, debajo de su ficha.
 *
 * Es diminuta a propósito: comparte sitio con la cámara y con los regalos, así
 * que solo dice el nivel, lo que lleva y lo que falta. La barra se llena con
 * cada regalo y vuelve a empezar al pasar de nivel, porque lo que interesa a
 * quien mira no es el total del día sino lo poco que falta para el siguiente
 * escalón: es lo que empuja a lanzar el regalo que lo cierra.
 *
 * Se ve también desde fuera, no solo el anfitrión. Llegar a la meta es cosa de
 * la sala entera y esconderla al público quitaría justo eso.
 */
/**
 * Parte del tramo actual ya recorrida, entre 0 y 1.
 *
 * El tramo empieza donde acabó el nivel ya conseguido, no en cero: así la barra
 * se vacía al subir de nivel y vuelve a llenarse, que es lo que hace que se vea
 * cerca la siguiente meta en vez de un día entero que apenas se mueve.
 *
 * El suelo lo manda el servidor y no se deduce de la tabla: pasada la tabla, el
 * salario sigue subiendo de millón en millón y esos escalones no están en ella.
 */
export function avanceDeMeta(meta: RoomGoal): number {
  if (!meta.siguiente) return 1;
  const tramo = Math.max(1, meta.siguiente.meta - meta.base);
  return Math.min(1, Math.max(0, (meta.luckyCoins - meta.base) / tramo));
}

export function GoalBar({ meta, onPress }: { meta: RoomGoal; onPress: () => void }) {
  const avance = avanceDeMeta(meta);

  return (
    <Pressable
      onPress={onPress}
      style={styles.pastilla}
      accessibilityRole="button"
      accessibilityLabel="Ver las reglas del salario"
    >
      <View style={styles.nivel}>
        <Text style={styles.nivelTexto}>{meta.nivel > 0 ? `Nv ${meta.nivel}` : 'Meta'}</Text>
      </View>

      <View style={styles.cuerpo}>
        <View style={styles.barra}>
          <View style={[styles.barraLlena, { width: `${avance * 100}%` }]} />
        </View>
        <Text style={styles.cifras} numberOfLines={1}>
          {meta.siguiente
            ? `🪙 ${formatCount(meta.luckyCoins)} / ${formatCount(meta.siguiente.meta)}`
            : `🪙 ${formatCount(meta.luckyCoins)} · máximo`}
        </Text>
      </View>

      <Text style={styles.flecha}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    maxWidth: 200,
    backgroundColor: 'rgba(5, 10, 7, 0.55)',
    borderRadius: radius.pill,
    paddingLeft: 4,
    paddingRight: spacing.sm,
    paddingVertical: 3,
  },
  nivel: {
    backgroundColor: colors.coin,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  nivelTexto: { color: '#2A1300', fontSize: 9, fontWeight: '900' },

  cuerpo: { flex: 1, gap: 2 },
  barra: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  barraLlena: { height: '100%', backgroundColor: colors.coin },
  cifras: { color: colors.text, fontSize: 9, fontWeight: '700' },

  flecha: { color: colors.textMuted, fontSize: 13, fontWeight: '900' },
});
