import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, spacing, typography } from '../theme';

export function Avatar({
  uri,
  name,
  size = 40,
  ring,
}: {
  uri?: string | null;
  name: string;
  size?: number;
  ring?: boolean;
}) {
  const style = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: ring ? 2 : 0,
    borderColor: colors.primary,
  };

  if (uri) {
    return <Image source={{ uri }} style={[styles.avatar, style]} />;
  }

  return (
    <View style={[styles.avatar, style, styles.avatarFallback]}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: size * 0.4 }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.text} />
  ) : (
    <Text style={[styles.buttonLabel, variant !== 'primary' && styles.buttonLabelAlt]}>{label}</Text>
  );

  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={[styles.buttonWrap, style, isDisabled && styles.dim]}>
        <LinearGradient colors={[...gradients.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.buttonWrap,
        styles.button,
        variant === 'ghost' ? styles.buttonGhost : styles.buttonDanger,
        style,
        isDisabled && styles.dim,
      ]}
    >
      {content}
    </Pressable>
  );
}

/**
 * Campo de formulario.
 *
 * Con `secureTextEntry` aparece el ojo para ver lo que se escribe. Teclear una
 * contraseña a ciegas en un teléfono es donde más gente se equivoca y se queda
 * fuera sin saber por qué, y el error que sale después —«contraseña
 * incorrecta»— no dice que sea una errata.
 */
export function Field({
  label,
  error,
  ...inputProps
}: TextInputProps & { label: string; error?: string | null }) {
  const esClave = Boolean(inputProps.secureTextEntry);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={typography.label}>{label}</Text>
      <View>
        <TextInput
          placeholderTextColor={colors.textFaint}
          {...inputProps}
          secureTextEntry={esClave && !visible}
          style={[
            styles.input,
            error ? styles.inputError : null,
            esClave ? styles.inputConOjo : null,
            inputProps.style,
          ]}
        />
        {esClave ? (
          <Pressable
            onPress={() => setVisible((actual: boolean) => !actual)}
            style={styles.ojo}
            hitSlop={10}
            accessibilityLabel={visible ? 'Ocultar la contraseña' : 'Ver la contraseña'}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function LiveBadge({ viewers }: { viewers: number }) {
  return (
    <View style={styles.liveBadge}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>EN VIVO</Text>
      {viewers > 0 ? <Text style={styles.liveViewers}>{viewers}</Text> : null}
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={typography.heading}>{title}</Text>
      {subtitle ? <Text style={[typography.label, { textAlign: 'center' }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Loader({ label }: { label?: string }) {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Text style={typography.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: colors.surfaceAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },

  buttonWrap: { borderRadius: radius.pill, overflow: 'hidden' },
  button: {
    minHeight: 50,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  buttonGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  buttonDanger: { backgroundColor: colors.danger },
  buttonLabel: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
  buttonLabelAlt: { color: colors.text },
  dim: { opacity: 0.5 },

  inputConOjo: { paddingRight: 46 },
  ojo: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' },
  field: { gap: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: '600' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.live,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  liveText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  liveViewers: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', opacity: 0.85 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
});
