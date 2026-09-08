import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ApiError, hosts as hostsApi, wallet as walletApi } from '../../src/api';
import { SalaryGoal } from '../../src/components/salary-goal';
import type { CoinPackage, SalaryProgress, Transaction } from '../../src/api/types';
import { useAuthStore } from '../../src/store/auth-store';
import { Avatar, Button, Card } from '../../src/components/ui';
import { versionLabel } from '../../src/build-info';
import { colors, gradients, radius, spacing, typography } from '../../src/theme';

const TRANSACTION_LABELS: Record<string, string> = {
  topup: 'Recarga',
  gift_sent: 'Regalo enviado',
  gift_received: 'Regalo recibido',
  exchange: 'Cambio',
};

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const refresh = useAuthStore((state) => state.refresh);
  const setWallet = useAuthStore((state) => state.setWallet);

  const [packages, setPackages] = useState<CoinPackage[]>([]);
  /** Meta de salario del día; `null` mientras no responde el servidor. */
  const [salario, setSalario] = useState<SalaryProgress | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => undefined);
      void walletApi
        .get()
        .then((data) => setPackages([...data.packages]))
        .catch(() => undefined);
      void walletApi
        .transactions()
        .then((data) => setTransactions(data.transactions.slice(0, 8)))
        .catch(() => undefined);
      void hostsApi
        .salary()
        .then((data) => setSalario(data.progreso))
        .catch(() => undefined);
    }, [refresh]),
  );

  async function buy(packageId: string) {
    setBusy(packageId);
    try {
      const data = await walletApi.topUp(packageId);
      setWallet(data.wallet);
      Alert.alert('Recarga completada', `Se acreditaron ${data.credited.toLocaleString('es')} monedas.`);
      setTransactions((await walletApi.transactions()).transactions.slice(0, 8));
    } catch (error) {
      Alert.alert('No se pudo recargar', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
    } finally {
      setBusy(null);
    }
  }

  /**
   * Reinicio de datos, solo visible con la cuenta de pruebas. Probar la meta
   * obliga a volver a cero muchas veces al día, y hacerlo desde la consola del
   * ordenador rompe el ritmo de la prueba.
   */
  async function reiniciar() {
    setBusy('reset');
    try {
      const { resumen } = await hostsApi.reset();
      await refresh();
      setTransactions([]);
      Alert.alert(
        'Datos reiniciados',
        `${resumen.regalos} regalos y ${resumen.movimientos} movimientos borrados. ` +
          `${resumen.cuentas} cuentas a 5.000 monedas y 0 diamantes.`,
      );
    } catch (error) {
      Alert.alert('No se pudo reiniciar', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
    } finally {
      setBusy(null);
    }
  }

  async function exchangeAll() {
    if (!user || user.diamonds <= 0) return;
    setBusy('exchange');
    try {
      const data = await walletApi.exchange(user.diamonds);
      setWallet(data.wallet);
      Alert.alert('Cambio realizado', `Recibiste ${data.coins.toLocaleString('es')} monedas.`);
    } catch (error) {
      Alert.alert('No se pudo cambiar', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
    } finally {
      setBusy(null);
    }
  }

  if (!user) return null;

  const progressPercent = Math.round(user.progress * 100);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={[...gradients.brand]} style={styles.hero}>
          <Avatar uri={user.avatarUrl} name={user.displayName} size={72} />
          <Text style={styles.name}>{user.displayName}</Text>
          <Text style={styles.username}>@{user.username}</Text>

          <View style={styles.levelRow}>
            <Text style={styles.levelText}>Nivel {user.level}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.levelText}>{progressPercent}%</Text>
          </View>

          <View style={styles.statsRow}>
            <Stat label="Seguidores" value={user.followers ?? 0} />
            <Stat label="Siguiendo" value={user.following ?? 0} />
            <Stat label="XP" value={user.xp} />
          </View>
        </LinearGradient>

        {/* La meta del día va justo bajo el perfil: es lo primero que quiere
            ver quien transmite al abrir la app. */}
        {salario ? <SalaryGoal progreso={salario} /> : null}

        <View style={styles.balances}>
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Monedas</Text>
            <Text style={styles.coins}>🪙 {user.coins.toLocaleString('es')}</Text>
          </Card>
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Diamantes</Text>
            <Text style={styles.diamonds}>💎 {user.diamonds.toLocaleString('es')}</Text>
          </Card>
        </View>

        <Button
          label={user.diamonds > 0 ? `Cambiar ${user.diamonds} 💎 por monedas` : 'Sin diamantes que cambiar'}
          variant="ghost"
          disabled={user.diamonds <= 0}
          loading={busy === 'exchange'}
          onPress={exchangeAll}
        />

        <Text style={typography.heading}>Recargar monedas</Text>
        <Text style={styles.note}>
          Compra simulada: en producción cada paquete debe validarse contra el recibo de la tienda.
        </Text>
        <View style={styles.packages}>
          {packages.map((pack) => (
            <Pressable
              key={pack.id}
              onPress={() => buy(pack.id)}
              disabled={busy !== null}
              style={[styles.package, busy === pack.id && styles.packageBusy]}
            >
              <Text style={styles.packageCoins}>🪙 {pack.coins.toLocaleString('es')}</Text>
              {pack.bonus > 0 ? <Text style={styles.packageBonus}>+{pack.bonus} bonus</Text> : null}
              <Text style={styles.packagePrice}>US$ {pack.priceUsd.toFixed(2)}</Text>
            </Pressable>
          ))}
        </View>

        {transactions.length > 0 ? (
          <>
            <Text style={typography.heading}>Movimientos recientes</Text>
            <Card style={{ gap: spacing.sm }}>
              {transactions.map((item) => (
                <View key={item.id} style={styles.transaction}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.transactionType}>{TRANSACTION_LABELS[item.type] ?? item.type}</Text>
                    <Text style={styles.transactionDate}>
                      {new Date(item.createdAt).toLocaleString('es')}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: item.amount >= 0 ? colors.success : colors.danger },
                    ]}
                  >
                    {item.amount >= 0 ? '+' : ''}
                    {item.amount} {item.currency === 'coins' ? '🪙' : '💎'}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <Button label="Editar perfil" variant="ghost" onPress={() => router.push('/edit-profile')} />
        <Button label={`Novedades · ${versionLabel()}`} variant="ghost" onPress={() => router.push('/whats-new')} />
        <Button label="Servidor" variant="ghost" onPress={() => router.push('/server-settings')} />
        <Button
          label="Ver mi perfil público"
          variant="ghost"
          onPress={() => router.push(`/user/${user.username}`)}
        />
        {/* Solo la cuenta de pruebas: el servidor lo vuelve a comprobar, esto
            es únicamente para no enseñar un botón que va a dar 403. */}
        {user.username === 'luna' ? (
          <Button
            label="Reiniciar metas y monedas"
            variant="ghost"
            loading={busy === 'reset'}
            onPress={() =>
              Alert.alert(
                'Reiniciar datos',
                'Borra los regalos, las metas, los diamantes y los movimientos de todas las cuentas, y deja 5.000 monedas en cada una. Las sesiones no se cierran.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Reiniciar', style: 'destructive', onPress: () => void reiniciar() },
                ],
              )
            }
          />
        ) : null}

        <Button label="Cerrar sesión" variant="danger" onPress={() => void logout()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value.toLocaleString('es')}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: { borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.xs },
  name: { color: colors.onPrimary, fontSize: 20, fontWeight: '800' },
  username: { color: 'rgba(4,22,13,0.72)', fontSize: 13, fontWeight: '600' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, width: '100%' },
  levelText: { color: colors.onPrimary, fontSize: 12, fontWeight: '700' },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(4,22,13,0.28)' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.onPrimary },
  statsRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md },
  stat: { alignItems: 'center' },
  statValue: { color: colors.onPrimary, fontWeight: '800', fontSize: 16 },
  statLabel: { color: 'rgba(4,22,13,0.72)', fontSize: 11, fontWeight: '600' },
  balances: { flexDirection: 'row', gap: spacing.md },
  balanceCard: { flex: 1, gap: spacing.xs },
  balanceLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  coins: { color: colors.coin, fontSize: 18, fontWeight: '800' },
  diamonds: { color: colors.diamond, fontSize: 18, fontWeight: '800' },
  note: { color: colors.textFaint, fontSize: 12, marginTop: -spacing.sm },
  packages: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  package: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 2,
    alignItems: 'center',
  },
  packageBusy: { opacity: 0.5 },
  packageCoins: { color: colors.coin, fontWeight: '800', fontSize: 16 },
  packageBonus: { color: colors.success, fontWeight: '700', fontSize: 11 },
  packagePrice: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  transaction: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  transactionType: { color: colors.text, fontWeight: '600', fontSize: 13 },
  transactionDate: { color: colors.textFaint, fontSize: 11 },
  transactionAmount: { fontWeight: '800', fontSize: 13 },
});
