import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Gift } from '../api/types';
import { Image } from 'expo-image';
import { Avatar, Button } from './ui';
import { giftArt } from './gift-art';
import { RechargeSheet } from './recharge-sheet';
import { ChestDetails } from './chest-details';
import { colors, formatCount, radius, spacing, tierColors, typography } from '../theme';

const QUANTITIES = [1, 5, 10, 50];

/** Quién puede recibir el regalo: el anfitrión, los invitados y uno mismo. */
export interface GiftTarget {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  /** Etiqueta corta bajo el avatar: «Anfitrión», «Tú» o el nombre. */
  label: string;
}

type Tab = 'lucky' | 'exclusive' | 'fanclub';

const TABS: { key: Tab; label: string }[] = [
  { key: 'lucky', label: 'Suerte' },
  { key: 'exclusive', label: 'Exclusivos' },
  { key: 'fanclub', label: 'Club de fans' },
];

/**
 * Mayor multiplicador de la lista. Los multiplicadores del servidor llevan peso
 * (`"2:850,500:2"`), así que hay que quedarse con la parte de antes de los dos
 * puntos; la forma antigua sin peso sigue funcionando.
 */
function topMultiplier(raw: string): number {
  const valores = raw
    .split(',')
    .map((part) => Number(part.split(':')[0]?.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  return valores.length ? Math.max(...valores) : 0;
}

function tabOf(gift: Gift): Tab {
  if (gift.minFanLevel > 0) return 'fanclub';
  if (gift.tier === 'exclusive') return 'exclusive';
  // El cofre es un regalo de la suerte más, solo que siempre explota.
  return 'lucky';
}

export function GiftPicker({
  visible,
  gifts,
  coins,
  sending,
  targets,
  selectedIds,
  fanLevel,
  locked,
  onToggleLock,
  onToggleTarget,
  onClose,
  onSend,
}: {
  visible: boolean;
  gifts: Gift[];
  coins: number;
  sending: boolean;
  /** Todos los que están en la sala, incluido uno mismo. */
  targets: GiftTarget[];
  /** Los elegidos ahora mismo. Se puede regalar a varios a la vez. */
  selectedIds: string[];
  /** Nivel de club de fans con este anfitrión, para saber qué está bloqueado. */
  fanLevel: number;
  /** Con el candado echado la caja no se cierra al enviar. */
  locked: boolean;
  onToggleLock: () => void;
  onToggleTarget: (id: string) => void;
  onClose: () => void;
  onSend: (giftCode: string, quantity: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Gift | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<Tab>('lucky');
  /** Cantidad escrita a mano; vacío significa que mandan los botones fijos. */
  const [customQuantity, setCustomQuantity] = useState('');
  const [recargaVisible, setRecargaVisible] = useState(false);

  const [detalles, setDetalles] = useState(false);

  // Los cofres abren la pestaña de Suerte, delante de los regalos: son lo más
  // caro de la pestaña y lo que más mueve la meta del anfitrión.
  const visibles = useMemo(
    () =>
      gifts
        .filter((gift) => tabOf(gift) === tab)
        .sort((a, b) => Number(b.tier === 'chest') - Number(a.tier === 'chest')),
    [gifts, tab],
  );

  const cofres = useMemo(() => gifts.filter((gift) => gift.tier === 'chest'), [gifts]);

  // Los exclusivos y los del club se mandan de uno en uno: el servidor ignora
  // la cantidad, así que aquí tampoco se ofrece.
  const unitario = selected ? selected.tier === 'exclusive' : false;
  // Lo escrito a mano manda sobre los botones fijos. El servidor admite hasta
  // 999 por envío, que es también el máximo del campo.
  const escrita = Number(customQuantity);
  const cantidadReal = unitario ? 1 : Number.isFinite(escrita) && escrita > 0 ? Math.min(escrita, 999) : quantity;
  const bloqueado = selected ? selected.minFanLevel > fanLevel : false;
  const total = selected ? selected.priceCoins * cantidadReal * Math.max(1, selectedIds.length) : 0;
  const affordable = total <= coins;
  const esCofre = selected?.tier === 'chest';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.headerTexts}>
            <Text style={typography.heading}>Enviar un regalo</Text>
            <Text style={styles.recipient} numberOfLines={1}>
              {selectedIds.length > 1 ? `para ${selectedIds.length} personas` : 'elige a quién'}
            </Text>
          </View>
          <Pressable
            onPress={onToggleLock}
            hitSlop={10}
            style={[styles.lock, locked && styles.lockOn]}
            accessibilityLabel={locked ? 'Soltar el candado y cerrar al enviar' : 'Echar el candado para enviar varias veces'}
          >
            <Ionicons
              name={locked ? 'lock-closed' : 'lock-open-outline'}
              size={16}
              color={locked ? colors.onPrimary : colors.textMuted}
            />
          </Pressable>
          {/* El saldo es el botón de recarga: quedarse corto pasa aquí dentro,
              y salir al perfil a por monedas corta el envío a medias. */}
          <Pressable
            onPress={() => setRecargaVisible(true)}
            style={[styles.balanceBoton, !affordable && styles.balanceCorto]}
            accessibilityLabel="Recargar monedas"
          >
            <Text style={styles.balance}>🪙 {coins.toLocaleString('es')}</Text>
            <Ionicons name="add-circle" size={15} color={colors.coin} />
          </Pressable>
        </View>

        {/* Quién está en la sala. Se puede marcar a varios, y uno mismo sale
            el primero para poder jugarse el saldo con los regalos de suerte. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.targets}>
          {targets.map((target) => {
            const marcado = selectedIds.includes(target.id);
            return (
              <Pressable
                key={target.id}
                onPress={() => onToggleTarget(target.id)}
                style={[styles.target, marcado && styles.targetOn]}
                accessibilityLabel={`Regalar a ${target.displayName}`}
              >
                <Avatar uri={target.avatarUrl} name={target.displayName} size={38} />
                <Text style={[styles.targetLabel, marcado && styles.targetLabelOn]} numberOfLines={1}>
                  {target.label}
                </Text>
                {marcado ? (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={10} color={colors.onPrimary} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.tabs}>
          {TABS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => {
                setTab(item.key);
                setSelected(null);
              }}
              style={[styles.tab, tab === item.key && styles.tabOn]}
            >
              <Text style={[styles.tabText, tab === item.key && styles.tabTextOn]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={visibles}
          keyExtractor={(item) => item.code}
          numColumns={4}
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'fanclub'
                ? 'Los regalos del club se desbloquean gastando con este anfitrión.'
                : 'No hay regalos en esta sección.'}
            </Text>
          }
          renderItem={({ item }) => {
            const isSelected = selected?.code === item.code;
            const cerrado = item.minFanLevel > fanLevel;
            return (
              <Pressable
                onPress={() => setSelected(item)}
                style={[
                  styles.gift,
                  { borderColor: isSelected ? colors.primary : colors.border },
                  isSelected && styles.giftSelected,
                  cerrado && styles.giftLocked,
                ]}
              >
                {giftArt(item.image) ? (
                  <Image source={giftArt(item.image)!} style={styles.giftArt} contentFit="contain" />
                ) : (
                  <Text style={styles.emoji}>{item.emoji}</Text>
                )}
                <Text style={styles.giftName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.price, { color: tierColors[item.tier] ?? colors.coin }]}>
                  🪙 {item.priceCoins.toLocaleString('es')}
                </Text>
                {cerrado ? (
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={10} color={colors.text} />
                    <Text style={styles.lockedText}>{item.minFanLevel}</Text>
                  </View>
                ) : giftArt(item.image) ? null : item.tier === 'exclusive' ? (
                  <Text style={styles.lucky}>✨</Text>
                ) : item.luckyChance > 0 ? (
                  <Text style={styles.lucky}>🍀</Text>
                ) : null}
              </Pressable>
            );
          }}
        />

        {unitario ? null : (
          <View style={styles.quantities}>
            {QUANTITIES.map((value) => (
              <Pressable
                key={value}
                onPress={() => {
                  setQuantity(value);
                  setCustomQuantity('');
                }}
                style={[styles.quantity, !customQuantity && quantity === value && styles.quantityActive]}
              >
                <Text
                  style={[
                    styles.quantityText,
                    !customQuantity && quantity === value && { color: colors.onPrimary },
                  ]}
                >
                  ×{value}
                </Text>
              </Pressable>
            ))}

            {/* Para cantidades que no están en los botones fijos. */}
            <TextInput
              value={customQuantity}
              onChangeText={(text) => setCustomQuantity(text.replace(/[^0-9]/g, '').slice(0, 3))}
              placeholder="✏️"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              maxLength={3}
              style={[styles.quantity, styles.quantityInput, Boolean(customQuantity) && styles.quantityActive]}
              accessibilityLabel="Escribir la cantidad"
            />
          </View>
        )}

        {esCofre ? (
          <Pressable style={styles.cofrePista} onPress={() => setDetalles(true)}>
            <Text style={styles.luckyHint}>
              {selected!.name} siempre explota, y lo que salga se lo lleva quien lo recibe
            </Text>
            <Text style={styles.detalles}>Detalles ›</Text>
          </Pressable>
        ) : bloqueado ? (
          <Text style={styles.lockedHint}>
            {selected!.name} es del club de fans nivel {selected!.minFanLevel}. Vas por el nivel {fanLevel}.
          </Text>
        ) : selected?.tier === 'exclusive' ? (
          <Text style={styles.exclusiveHint}>
            {selected.name} es exclusivo: se envía de uno en uno, no devuelve monedas y deja el 75% en diamantes a
            quien lo recibe.
          </Text>
        ) : selected && selected.luckyChance > 0 ? (
          <Text style={styles.luckyHint}>
            {selected.name} sortea premio en cada unidad:{' '}
            {(selected.luckyChance * 100).toFixed(2).replace('.', ',')}% por unidad, y el
            gordo es ×{topMultiplier(selected.luckyMultipliers)} ({(
              selected.priceCoins * topMultiplier(selected.luckyMultipliers)
            ).toLocaleString('es')}{' '}
            monedas)
          </Text>
        ) : null}

        <Button
          label={
            selected
              ? bloqueado
                ? `Necesitas ser fan nivel ${selected.minFanLevel}`
                : affordable
                  ? `Enviar ${selected.emoji} por 🪙 ${total.toLocaleString('es')}`
                  : 'Recargar monedas'
              : 'Elige un regalo'
          }
          loading={sending}
          disabled={!selected || bloqueado || selectedIds.length === 0}
          onPress={() => {
            if (!selected) return;
            // Sin saldo el botón no se apaga: lleva a recargar, que es lo que
            // hace falta para poder enviarlo.
            if (!affordable) setRecargaVisible(true);
            else onSend(selected.code, cantidadReal);
          }}
        />
      </View>

      <RechargeSheet visible={recargaVisible} onClose={() => setRecargaVisible(false)} />
      <ChestDetails visible={detalles} cofres={cofres} onClose={() => setDetalles(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '82%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  headerTexts: { flexShrink: 1 },
  recipient: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  balance: { color: colors.coin, fontWeight: '700' },
  cofrePista: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  detalles: { color: colors.coin, fontSize: 11, fontWeight: '800' },
  balanceBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  // Sin saldo para lo que se está montando, el botón se marca solo.
  balanceCorto: { borderColor: colors.coin, backgroundColor: 'rgba(255,210,74,0.12)' },
  lock: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  targets: { gap: spacing.sm, paddingVertical: 2 },
  target: {
    alignItems: 'center',
    gap: 2,
    width: 56,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  targetOn: { borderColor: colors.primary, backgroundColor: 'rgba(0,230,118,0.12)' },
  targetLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  targetLabelOn: { color: colors.text },
  check: {
    position: 'absolute',
    right: 4,
    top: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    padding: 1,
  },

  tabs: { flexDirection: 'row', gap: spacing.xs },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  tabOn: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  tabTextOn: { color: colors.onPrimary },

  gift: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surfaceAlt,
  },
  giftSelected: { backgroundColor: 'rgba(0,230,118,0.16)' },
  giftLocked: { opacity: 0.45 },
  emoji: { fontSize: 30 },
  giftArt: { width: 52, height: 52 },
  giftName: { color: colors.text, fontSize: 10, fontWeight: '600' },
  price: { fontSize: 10, fontWeight: '700' },
  lucky: { position: 'absolute', top: 2, right: 4, fontSize: 11 },
  lockedBadge: { position: 'absolute', top: 2, right: 4, flexDirection: 'row', alignItems: 'center', gap: 1 },
  lockedText: { color: colors.text, fontSize: 9, fontWeight: '800' },
  empty: { color: colors.textFaint, fontSize: 12, textAlign: 'center', paddingVertical: spacing.lg },

  quantities: { flexDirection: 'row', gap: spacing.sm },
  quantity: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  quantityText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  quantityInput: { color: colors.text, fontWeight: '700', fontSize: 13, textAlign: 'center', paddingVertical: spacing.xs },

  luckyHint: { color: colors.coin, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  exclusiveHint: { color: tierColors.exclusive, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  lockedHint: { color: colors.danger, fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
