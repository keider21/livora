import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, wallet as walletApi } from '../api';
import type { CoinPackage } from '../api/types';
import { useAuthStore } from '../store/auth-store';
import { Button } from './ui';
import { colors, radius, spacing, typography } from '../theme';

/** Formas de pago que se ofrecerán; hoy ninguna cobra de verdad. */
const METODOS = [
  { id: 'card', nombre: 'Tarjeta', icono: 'card-outline' },
  { id: 'pix', nombre: 'Pix', icono: 'flash-outline' },
  { id: 'paypal', nombre: 'PayPal', icono: 'logo-paypal' },
  { id: 'store', nombre: 'Google Play', icono: 'logo-google-playstore' },
] as const;

/**
 * Recarga de monedas, al tocar el saldo dentro de la caja de regalos.
 *
 * Se abre donde uno se queda sin monedas, que es en mitad de un envío: mandar al
 * perfil a por ellas es perder el impulso y, con él, la recarga.
 *
 * El cobro **todavía es simulado**: no hay pasarela detrás. Por eso el aviso de
 * abajo lo dice con todas las letras en vez de dejar creer que se cobró algo.
 */
export function RechargeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const setWallet = useAuthStore((state) => state.setWallet);

  const [paquetes, setPaquetes] = useState<CoinPackage[]>([]);
  const [elegido, setElegido] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<string>(METODOS[0].id);
  const [comprando, setComprando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    void walletApi
      .get()
      .then((data) => {
        setPaquetes([...data.packages]);
        setElegido((actual) => actual ?? data.packages[0]?.id ?? null);
      })
      .catch(() => undefined);
  }, [visible]);

  const paquete = paquetes.find((item) => item.id === elegido) ?? null;

  async function recargar() {
    if (!paquete) return;
    setComprando(true);
    try {
      const data = await walletApi.topUp(paquete.id);
      setWallet(data.wallet);
      Alert.alert('Recarga completada', `Se acreditaron ${data.credited.toLocaleString('es')} monedas.`);
      onClose();
    } catch (error) {
      Alert.alert('No se pudo recargar', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
    } finally {
      setComprando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.fondo} onPress={onClose} />
      <View style={[styles.hoja, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.cabecera}>
          <Text style={typography.title}>Recargar monedas</Text>
          <View style={styles.saldo}>
            <Text style={styles.saldoTexto}>🪙 {(user?.coins ?? 0).toLocaleString('es')}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.contenido}>
          <Text style={styles.seccion}>Cuánto quieres recargar</Text>
          <View style={styles.paquetes}>
            {paquetes.map((item) => {
              const activo = item.id === elegido;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setElegido(item.id)}
                  style={[styles.paquete, activo && styles.paqueteActivo]}
                >
                  <Text style={styles.paqueteMonedas}>🪙 {item.coins.toLocaleString('es')}</Text>
                  {item.bonus > 0 ? (
                    <Text style={styles.paqueteBono}>+{item.bonus.toLocaleString('es')} de regalo</Text>
                  ) : (
                    <Text style={styles.paqueteBonoVacio}>sin extra</Text>
                  )}
                  <Text style={styles.paquetePrecio}>${item.priceUsd}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.seccion}>Forma de pago</Text>
          <View style={styles.metodos}>
            {METODOS.map((item) => {
              const activo = item.id === metodo;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setMetodo(item.id)}
                  style={[styles.metodo, activo && styles.metodoActivo]}
                >
                  <Ionicons name={item.icono} size={18} color={activo ? colors.coin : colors.textMuted} />
                  <Text style={[styles.metodoTexto, activo && { color: colors.text }]}>{item.nombre}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.aviso}>
            Las recargas todavía son de prueba: las monedas se acreditan al momento y no se cobra
            nada por ninguna de estas formas de pago.
          </Text>
        </ScrollView>

        <View style={styles.pie}>
          <Button
            label={
              paquete
                ? `Recargar 🪙 ${(paquete.coins + paquete.bonus).toLocaleString('es')} · $${paquete.priceUsd}`
                : 'Elige un paquete'
            }
            loading={comprando}
            disabled={!paquete}
            onPress={() => void recargar()}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.overlay },
  hoja: {
    maxHeight: '82%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  saldo: { flex: 1, alignItems: 'flex-end' },
  saldoTexto: { color: colors.coin, fontWeight: '800', fontSize: 14 },

  contenido: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  seccion: { ...typography.label, marginTop: spacing.xs },

  paquetes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paquete: {
    width: '48%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.md,
    gap: 2,
  },
  paqueteActivo: { borderColor: colors.coin },
  paqueteMonedas: { color: colors.coin, fontSize: 15, fontWeight: '900' },
  paqueteBono: { color: colors.success, fontSize: 11, fontWeight: '700' },
  paqueteBonoVacio: { color: colors.textFaint, fontSize: 11, fontWeight: '600' },
  paquetePrecio: { color: colors.text, fontSize: 13, fontWeight: '800' },

  metodos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metodo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  metodoActivo: { borderColor: colors.coin },
  metodoTexto: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },

  aviso: { color: colors.textFaint, fontSize: 11, lineHeight: 16, marginTop: spacing.xs },

  pie: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
