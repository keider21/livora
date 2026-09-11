import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { ApiError, agencies as agenciesApi } from '../src/api';
import type { AgencyPanel, MyAgency } from '../src/api/types';
import { Avatar, Button, Loader } from '../src/components/ui';
import { colors, formatCount, radius, spacing, typography } from '../src/theme';

/**
 * Agencias: quien capta y forma anfitriones cobra por lo que generan.
 *
 * La pantalla tiene dos caras porque hay dos papeles. Quien tiene agencia ve su
 * panel: el código para repartir, quién está dentro y cuánto ha aportado cada
 * uno. Quien no la tiene ve cómo entrar en una, o cómo montar la suya.
 *
 * Lo que **no** cambia según el papel es de dónde sale la comisión, y por eso se
 * dice en las dos caras: la paga la casa, no el anfitrión. Un anfitrión con
 * agencia cobra lo mismo que uno sin ella, y si eso no queda claro nadie se
 * apunta por miedo a que le quiten parte.
 */
export default function AgencyScreen() {
  const router = useRouter();
  const [panel, setPanel] = useState<AgencyPanel | null>(null);
  const [mia, setMia] = useState<MyAgency | null>(null);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(() => {
    void agenciesApi.panel().then(setPanel).catch(() => setPanel({ agencia: null }));
    void agenciesApi.mine().then(setMia).catch(() => setMia({ agencia: null, aportado: 0 }));
  }, []);

  useFocusEffect(cargar);

  async function crear() {
    setOcupado('crear');
    try {
      await agenciesApi.create(nombre.trim());
      setNombre('');
      cargar();
    } catch (error) {
      Alert.alert('No se pudo crear', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
    } finally {
      setOcupado(null);
    }
  }

  async function unirse() {
    setOcupado('unirse');
    try {
      const { agencia } = await agenciesApi.join(codigo.trim());
      setCodigo('');
      cargar();
      Alert.alert('Ya estás dentro', `Entraste en ${agencia.name}. Tus ganancias no cambian.`);
    } catch (error) {
      Alert.alert('No se pudo entrar', error instanceof ApiError ? error.message : 'Revisa el código');
    } finally {
      setOcupado(null);
    }
  }

  async function salir() {
    setOcupado('salir');
    try {
      await agenciesApi.leave();
      cargar();
    } catch (error) {
      Alert.alert('No se pudo salir', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
    } finally {
      setOcupado(null);
    }
  }

  if (!panel || !mia) {
    return (
      <SafeAreaView style={styles.safe}>
        <Loader label="Cargando…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.cabecera}>
        <Text style={typography.title}>Agencias</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Cerrar">
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.contenido}>
        {panel.agencia ? (
          <>
            <View style={styles.tarjeta}>
              <Text style={styles.nombre}>{panel.agencia.name}</Text>
              <Text style={styles.detalle}>Te llevas el {(panel.agencia.rate * 100).toFixed(0)}% de lo que ganan los tuyos</Text>

              <Pressable
                style={styles.codigo}
                onPress={() => {
                  void Clipboard.setStringAsync(panel.agencia!.code);
                  Alert.alert('Copiado', 'Pásaselo a quien quieras traer a tu agencia.');
                }}
              >
                <Text style={styles.codigoTexto}>{panel.agencia.code}</Text>
                <Ionicons name="copy-outline" size={16} color={colors.textMuted} />
              </Pressable>

              <View style={styles.cobrado}>
                <Text style={styles.cobradoCifra}>💎 {formatCount(panel.agencia.cobrado)}</Text>
                <Text style={styles.detalle}>cobrado en total</Text>
              </View>
            </View>

            <Text style={styles.seccion}>Tus anfitriones · {panel.hosts?.length ?? 0}</Text>
            {(panel.hosts ?? []).length === 0 ? (
              <Text style={styles.vacio}>
                Todavía no hay nadie. Reparte el código y quien lo use quedará bajo tu agencia.
              </Text>
            ) : (
              (panel.hosts ?? []).map((host) => {
                const meta = host.hoy.siguiente;
                const avance = meta ? Math.min(1, host.hoy.luckyCoins / Math.max(1, meta.meta)) : 1;
                const horas = host.hoy.liveSeconds / 3600;
                const minimas = host.hoy.segundosMinimos / 3600;

                return (
                  <View key={host.id} style={styles.host}>
                    <View style={styles.hostCabecera}>
                      <Avatar uri={host.avatarUrl} name={host.displayName} size={34} />
                      <View style={styles.hostTextos}>
                        <Text style={styles.hostNombre} numberOfLines={1}>
                          {host.displayName}
                        </Text>
                        <Text style={styles.hostDetalle}>
                          generó 💎 {formatCount(host.generado)} · te dio {formatCount(host.comision)}
                        </Text>
                      </View>
                      {/* Las horas primero y con color: sin ellas no cobra por
                          mucho que le regalen, y eso es lo que hay que ver. */}
                      <Text style={[styles.hostHoras, host.hoy.cumpleHoras && styles.hostHorasOk]}>
                        {horas.toFixed(1)} / {minimas} h
                      </Text>
                    </View>

                    <View style={styles.barra}>
                      <View style={[styles.barraLlena, { width: `${avance * 100}%` }]} />
                    </View>
                    <Text style={styles.hostMeta}>
                      {meta
                        ? `🪙 ${formatCount(host.hoy.luckyCoins)} de ${formatCount(meta.meta)} · nivel ${meta.nivel}`
                        : `🪙 ${formatCount(host.hoy.luckyCoins)} · nivel máximo`}
                      {host.hoy.salarioEstimado > 0
                        ? ` · cobra 💎 ${formatCount(host.hoy.salarioEstimado)}`
                        : host.hoy.nivel > 0
                          ? ' · le faltan horas'
                          : ' · sin meta aún'}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        ) : mia.agencia ? (
          <View style={styles.tarjeta}>
            <Text style={styles.nombre}>{mia.agencia.name}</Text>
            <Text style={styles.detalle}>Es la agencia que te captó</Text>
            <View style={styles.cobrado}>
              <Text style={styles.cobradoCifra}>💎 {formatCount(mia.aportado)}</Text>
              <Text style={styles.detalle}>lo que has ganado desde que entraste</Text>
            </View>
            <Text style={styles.nota}>
              Su comisión la paga la plataforma, no tú: ganas exactamente lo mismo que si no
              estuvieras en ninguna agencia.
            </Text>
            <Button label="Salir de la agencia" variant="ghost" loading={ocupado === 'salir'} onPress={() => void salir()} />
          </View>
        ) : (
          <>
            <View style={styles.tarjeta}>
              <Text style={styles.nombre}>Entrar en una agencia</Text>
              <Text style={styles.detalle}>
                Una agencia te ayuda a crecer y cobra por ello. Su comisión la paga la
                plataforma, así que tú ganas lo mismo que ahora.
              </Text>
              <TextInput
                value={codigo}
                onChangeText={(texto) => setCodigo(texto.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                placeholder="CÓDIGO"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="characters"
                style={styles.entrada}
              />
              <Button
                label="Entrar"
                disabled={codigo.length < 4}
                loading={ocupado === 'unirse'}
                onPress={() => void unirse()}
              />
            </View>

            <View style={styles.tarjeta}>
              <Text style={styles.nombre}>Montar la tuya</Text>
              <Text style={styles.detalle}>
                Te llevas el 10% de lo que ganen los anfitriones que traigas, sin quitarles nada a
                ellos.
              </Text>
              <TextInput
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre de la agencia"
                placeholderTextColor={colors.textFaint}
                style={styles.entrada}
              />
              <Button
                label="Crear agencia"
                disabled={nombre.trim().length < 3}
                loading={ocupado === 'crear'}
                onPress={() => void crear()}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  contenido: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  tarjeta: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  nombre: { color: colors.text, fontSize: 17, fontWeight: '800' },
  detalle: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  nota: { color: colors.textFaint, fontSize: 11, lineHeight: 16 },

  codigo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
  },
  codigoTexto: { color: colors.primary, fontSize: 24, fontWeight: '900', letterSpacing: 4 },

  cobrado: { alignItems: 'center', gap: 1 },
  cobradoCifra: { color: colors.diamond, fontSize: 26, fontWeight: '900' },

  seccion: { ...typography.label, marginTop: spacing.sm },
  vacio: { color: colors.textFaint, fontSize: 12, lineHeight: 17 },

  host: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 5,
  },
  hostCabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hostHoras: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  hostHorasOk: { color: colors.success },
  hostMeta: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  barra: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  barraLlena: { height: '100%', backgroundColor: colors.coin },
  hostTextos: { flex: 1, gap: 1 },
  hostNombre: { color: colors.text, fontSize: 14, fontWeight: '700' },
  hostDetalle: { color: colors.textMuted, fontSize: 11 },

  entrada: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
});
