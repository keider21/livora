import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Gift } from '../api/types';
import { colors, radius, spacing, tierColors, typography } from '../theme';
import { Button } from './ui';

const QUANTITIES = [1, 5, 10, 50];

export function GiftPicker({
  visible,
  gifts,
  coins,
  sending,
  recipientName,
  onClose,
  onSend,
}: {
  visible: boolean;
  gifts: Gift[];
  coins: number;
  sending: boolean;
  /** A quién va: el anfitrión o el invitado elegido en la tira lateral. */
  recipientName: string;
  onClose: () => void;
  onSend: (giftCode: string, quantity: number) => void;
}) {
  const [selected, setSelected] = useState<Gift | null>(null);
  const [quantity, setQuantity] = useState(1);

  const total = selected ? selected.priceCoins * quantity : 0;
  const affordable = total <= coins;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headerTexts}>
            <Text style={typography.heading}>Enviar un regalo</Text>
            <Text style={styles.recipient} numberOfLines={1}>
              para {recipientName}
            </Text>
          </View>
          <Text style={styles.balance}>🪙 {coins.toLocaleString('es')}</Text>
        </View>

        <FlatList
          data={gifts}
          keyExtractor={(item) => item.code}
          numColumns={4}
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}
          renderItem={({ item }) => {
            const isSelected = selected?.code === item.code;
            return (
              <Pressable
                onPress={() => setSelected(item)}
                style={[
                  styles.gift,
                  { borderColor: isSelected ? colors.primary : colors.border },
                  isSelected && styles.giftSelected,
                ]}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={styles.giftName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.price, { color: tierColors[item.tier] ?? colors.coin }]}>
                  🪙 {item.priceCoins}
                </Text>
                {/* Con premio va el trébol; los exclusivos, que nunca premian
                    pero llenan la pantalla, van con la estrella. */}
                {item.tier === 'exclusive' ? (
                  <Text style={styles.lucky}>✨</Text>
                ) : item.luckyChance > 0 ? (
                  <Text style={styles.lucky}>🍀</Text>
                ) : null}
              </Pressable>
            );
          }}
        />

        <View style={styles.quantities}>
          {QUANTITIES.map((value) => (
            <Pressable
              key={value}
              onPress={() => setQuantity(value)}
              style={[styles.quantity, quantity === value && styles.quantityActive]}
            >
              <Text style={[styles.quantityText, quantity === value && { color: colors.onPrimary }]}>×{value}</Text>
            </Pressable>
          ))}
        </View>

        {selected?.tier === 'exclusive' ? (
          <Text style={styles.exclusiveHint}>
            {selected.name} es exclusivo: no devuelve monedas, pero llena la pantalla de toda la sala.
          </Text>
        ) : selected && selected.luckyChance > 0 ? (
          <Text style={styles.luckyHint}>
            {selected.name} puede devolverte monedas: {Math.round(selected.luckyChance * 100)}% de premio, hasta
            ×{Math.max(...selected.luckyMultipliers.split(',').map(Number).filter(Number.isFinite))}
          </Text>
        ) : null}

        <Button
          label={
            selected
              ? affordable
                ? `Enviar ${selected.emoji} por 🪙 ${total.toLocaleString('es')}`
                : 'Monedas insuficientes'
              : 'Elige un regalo'
          }
          loading={sending}
          disabled={!selected || !affordable}
          onPress={() => selected && onSend(selected.code, quantity)}
        />
      </View>
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
    maxHeight: '68%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  headerTexts: { flexShrink: 1 },
  recipient: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  balance: { color: colors.coin, fontWeight: '700' },
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
  emoji: { fontSize: 26 },
  giftName: { color: colors.text, fontSize: 10, fontWeight: '600' },
  price: { fontSize: 10, fontWeight: '700' },
  lucky: { position: 'absolute', top: 2, right: 4, fontSize: 11 },
  luckyHint: { color: colors.coin, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  exclusiveHint: { color: tierColors.exclusive, fontSize: 11, fontWeight: '600', textAlign: 'center' },
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
});
