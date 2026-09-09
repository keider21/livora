import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, hosts as hostsApi } from '../src/api';
import type { AuditReport, AuditedAccount, Transaction } from '../src/api/types';
import { Button, Loader } from '../src/components/ui';
import { colors, radius, spacing, typography } from '../src/theme';

/**
 * Vigilancia: cuentas cuyo saldo no cuadra y si el juego paga de más.
 *
 * Cada moneda deja un movimiento —bienvenida, recarga, gasto, premio, cambio—,
 * así que el saldo de una cuenta tiene que ser la suma de sus movimientos. Si no
 * lo es, esas monedas aparecieron sin pasar por ninguna puerta: eso es lo que se
 * lista aquí, con el historial al lado para poder mirar de dónde salieron antes
 * de tocar nada.
 */
export default function AuditScreen() {
  const router = useRouter();
  const [informe, setInforme] = useState<AuditReport | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [movimientos, setMovimientos] = useState<Transaction[]>([]);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(() => {
    void hostsApi
      .audit()
      .then(setInforme)
      .catch((error) => {
        Alert.alert('No se pudo cargar', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
        router.back();
      });
  }, [router]);

  useFocusEffect(cargar);

  async function abrir(cuenta: AuditedAccount) {
    if (abierta === cuenta.id) {
      setAbierta(null);
      return;
    }
    setAbierta(cuenta.id);
    setMovimientos([]);
    try {
      const { movimientos: filas } = await hostsApi.auditUser(cuenta.id);
      setMovimientos(filas);
    } catch {
      setMovimientos([]);
    }
  }

  async function banear(cuenta: AuditedAccount) {
    setOcupado(true);
    try {
      await hostsApi.ban(cuenta.id, !cuenta.isBanned);
      cargar();
    } catch (error) {
      Alert.alert('No se pudo', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
    } finally {
      setOcupado(false);
    }
  }

  if (!informe) {
    return (
      <SafeAreaView style={styles.safe}>
        <Loader label="Revisando cuentas…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.cabecera}>
        <Text style={typography.title}>Vigilancia</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Cerrar">
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.seccion}>Salud del juego</Text>
        {informe.juego.map((aviso) => (
          <View key={aviso.code} style={[styles.aviso, estiloDeNivel(aviso.nivel)]}>
            <View style={styles.avisoFila}>
              <Text style={styles.avisoTitulo}>{aviso.titulo}</Text>
              <Text style={[styles.avisoCifra, { color: colorDeNivel(aviso.nivel) }]}>
                {aviso.real.toFixed(3)}
              </Text>
            </View>
            <Text style={styles.avisoDetalle}>
              Previsto {aviso.previsto.toFixed(3)} · {aviso.envios} envíos
            </Text>
            <Text style={styles.avisoDetalle}>{aviso.detalle}</Text>
          </View>
        ))}

        <Text style={styles.seccion}>
          Saldos que no cuadran · {informe.sospechosas.length} de {informe.revisadas} cuentas
        </Text>

        {informe.sospechosas.length === 0 ? (
          <View style={[styles.aviso, styles.avisoOk]}>
            <Text style={styles.avisoTitulo}>Todo cuadra</Text>
            <Text style={styles.avisoDetalle}>
              Cada cuenta tiene exactamente lo que dicen sus movimientos. Ninguna moneda apareció por
              fuera.
            </Text>
          </View>
        ) : null}

        {informe.sospechosas.map((cuenta) => (
          <View key={cuenta.id} style={styles.cuenta}>
            <Pressable onPress={() => void abrir(cuenta)} style={styles.cuentaCabecera}>
              <View style={styles.cuentaTextos}>
                <Text style={styles.cuentaNombre} numberOfLines={1}>
                  {cuenta.displayName} {cuenta.isBanned ? '· baneada' : ''}
                </Text>
                <Text style={styles.cuentaId}>@{cuenta.username}</Text>
              </View>
              <Ionicons
                name={abierta === cuenta.id ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>

            {cuenta.descuadreMonedas !== 0 ? (
              <Descuadre
                etiqueta="Monedas"
                tiene={cuenta.coins}
                deberia={cuenta.monedasEsperadas}
                diferencia={cuenta.descuadreMonedas}
              />
            ) : null}
            {cuenta.descuadreDiamantes !== 0 ? (
              <Descuadre
                etiqueta="Diamantes"
                tiene={cuenta.diamonds}
                deberia={cuenta.diamantesEsperados}
                diferencia={cuenta.descuadreDiamantes}
              />
            ) : null}

            {abierta === cuenta.id ? (
              <>
                <Text style={styles.historialTitulo}>Últimos movimientos</Text>
                {movimientos.length === 0 ? (
                  <Text style={styles.vacio}>Sin movimientos anotados.</Text>
                ) : (
                  movimientos.map((fila) => (
                    <View key={fila.id} style={styles.movimiento}>
                      <Text style={styles.movimientoTipo} numberOfLines={1}>
                        {fila.type}
                        {fila.reference ? ` · ${fila.reference}` : ''}
                      </Text>
                      <Text
                        style={[
                          styles.movimientoCifra,
                          { color: fila.amount >= 0 ? colors.success : colors.textMuted },
                        ]}
                      >
                        {fila.amount >= 0 ? '+' : '−'}
                        {Math.abs(fila.amount).toLocaleString('es')} {fila.currency === 'coins' ? '🪙' : '💎'}
                      </Text>
                    </View>
                  ))
                )}

                <Button
                  label={cuenta.isBanned ? 'Devolver el acceso' : 'Banear esta cuenta'}
                  variant={cuenta.isBanned ? 'ghost' : 'danger'}
                  loading={ocupado}
                  onPress={() =>
                    Alert.alert(
                      cuenta.isBanned ? 'Devolver el acceso' : 'Banear',
                      cuenta.isBanned
                        ? `${cuenta.displayName} podrá volver a entrar.`
                        : `${cuenta.displayName} no podrá volver a entrar hasta que lo deshagas. Su saldo se queda como está.`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Confirmar', style: 'destructive', onPress: () => void banear(cuenta) },
                      ],
                    )
                  }
                />
              </>
            ) : null}
          </View>
        ))}

        <Text style={styles.nota}>
          Un descuadre positivo son monedas o diamantes que no salieron de ninguna puerta: ni
          recarga, ni premio, ni cambio. Suele ser un fallo o una escritura directa en la base de
          datos. Uno negativo es al revés: se anotó un movimiento que no llegó al saldo.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Descuadre({
  etiqueta,
  tiene,
  deberia,
  diferencia,
}: {
  etiqueta: string;
  tiene: number;
  deberia: number;
  diferencia: number;
}) {
  return (
    <View style={styles.descuadre}>
      <Text style={styles.descuadreEtiqueta}>{etiqueta}</Text>
      <Text style={styles.descuadreDetalle}>
        tiene {tiene.toLocaleString('es')} · debería {deberia.toLocaleString('es')}
      </Text>
      <Text style={[styles.descuadreCifra, { color: diferencia > 0 ? colors.danger : colors.accent }]}>
        {diferencia > 0 ? '+' : '−'}
        {Math.abs(diferencia).toLocaleString('es')}
      </Text>
    </View>
  );
}

function colorDeNivel(nivel: 'ok' | 'aviso' | 'alarma') {
  if (nivel === 'alarma') return colors.danger;
  if (nivel === 'aviso') return colors.accent;
  return colors.success;
}

function estiloDeNivel(nivel: 'ok' | 'aviso' | 'alarma') {
  if (nivel === 'alarma') return styles.avisoAlarma;
  if (nivel === 'aviso') return styles.avisoMedio;
  return styles.avisoOk;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  contenido: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  seccion: { ...typography.label, marginTop: spacing.sm },

  aviso: { borderRadius: radius.md, borderWidth: 2, padding: spacing.md, gap: 2 },
  avisoOk: { borderColor: colors.border, backgroundColor: colors.surface },
  avisoMedio: { borderColor: colors.accent, backgroundColor: 'rgba(255,210,74,0.10)' },
  avisoAlarma: { borderColor: colors.danger, backgroundColor: 'rgba(255,77,94,0.12)' },
  avisoFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avisoTitulo: { color: colors.text, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  avisoCifra: { fontSize: 18, fontWeight: '900' },
  avisoDetalle: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },

  cuenta: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cuentaCabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cuentaTextos: { flex: 1 },
  cuentaNombre: { color: colors.text, fontSize: 14, fontWeight: '800' },
  cuentaId: { color: colors.textFaint, fontSize: 11 },

  descuadre: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  descuadreEtiqueta: { color: colors.text, fontSize: 12, fontWeight: '700', width: 68 },
  descuadreDetalle: { color: colors.textMuted, fontSize: 10, flex: 1 },
  descuadreCifra: { fontSize: 13, fontWeight: '900' },

  historialTitulo: { ...typography.label, marginTop: spacing.sm },
  movimiento: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  movimientoTipo: { color: colors.textMuted, fontSize: 11, flexShrink: 1 },
  movimientoCifra: { fontSize: 11, fontWeight: '800' },
  vacio: { color: colors.textFaint, fontSize: 11 },

  nota: { color: colors.textFaint, fontSize: 10, lineHeight: 15, marginTop: spacing.md },
});
