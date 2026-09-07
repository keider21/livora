import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ChatMessage } from '../realtime/events';
import { colors, radius, scrim, spacing } from '../theme';

const { width: ANCHO } = Dimensions.get('window');
/** Ancho útil del panel: la pantalla menos el margen de la barra inferior. */
const PANEL = ANCHO - spacing.md * 2;

/**
 * Chat de la sala, en dos paneles que se pasan deslizando.
 *
 * Con el envío automático el registro de regalos ahoga la conversación: en unos
 * segundos empuja fuera todo lo que ha escrito la gente. Por eso van separados,
 * «Chat» a la izquierda y «Regalos» a la derecha, y cada uno se queda pegado a
 * su último mensaje.
 */
export function ChatOverlay({ messages }: { messages: ChatMessage[] }) {
  const [panel, setPanel] = useState<0 | 1>(0);
  const scrollRef = useRef<ScrollView>(null);

  // El chat se queda con lo que dice la gente y los avisos del sistema; los
  // regalos, con su propio registro.
  const conversacion = useMemo(() => messages.filter((item) => item.type !== 'gift'), [messages]);
  const regalos = useMemo(() => messages.filter((item) => item.type === 'gift'), [messages]);

  function irA(destino: 0 | 1) {
    setPanel(destino);
    scrollRef.current?.scrollTo({ x: destino * PANEL, animated: true });
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.tabs}>
        <Tab label="Chat" activo={panel === 0} onPress={() => irA(0)} />
        <Tab label={`Regalos${regalos.length ? ` · ${regalos.length}` : ''}`} activo={panel === 1} onPress={() => irA(1)} />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setPanel(event.nativeEvent.contentOffset.x > PANEL / 2 ? 1 : 0)
        }
        style={styles.pager}
      >
        <MessageList messages={conversacion} vacio="Nadie ha escrito todavía." />
        <MessageList messages={regalos} vacio="Aún no han enviado regalos." />
      </ScrollView>
    </View>
  );
}

function Tab({ label, activo, onPress }: { label: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, activo && styles.tabOn]} accessibilityLabel={label}>
      <Text style={[styles.tabText, activo && styles.tabTextOn]}>{label}</Text>
    </Pressable>
  );
}

function MessageList({ messages, vacio }: { messages: ChatMessage[]; vacio: string }) {
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  return (
    <View style={styles.panel}>
      {messages.length === 0 ? (
        <Text style={styles.vacio}>{vacio}</Text>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={() => undefined}
          renderItem={({ item }) => <ChatBubble message={item} />}
        />
      )}
    </View>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.type === 'join') {
    return (
      <View style={[styles.bubble, styles.systemBubble]}>
        <Text style={styles.systemText}>{message.body}</Text>
      </View>
    );
  }

  if (message.type === 'gift') {
    return (
      <View style={[styles.bubble, styles.giftBubble]}>
        <Text style={styles.author}>{message.user?.displayName ?? 'Alguien'} </Text>
        <Text style={styles.giftText}>{message.body}</Text>
      </View>
    );
  }

  return (
    <View style={styles.bubble}>
      <View style={styles.levelPill}>
        <Text style={styles.levelText}>{message.user?.level ?? 1}</Text>
      </View>
      <Text style={styles.author}>{message.user?.displayName ?? 'Anónimo'}: </Text>
      <Text style={styles.body}>{message.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  tabs: { flexDirection: 'row', gap: spacing.xs, alignSelf: 'flex-start' },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: scrim.soft,
  },
  tabOn: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  tabTextOn: { color: colors.onPrimary },
  pager: { flexGrow: 0 },
  panel: { width: PANEL, justifyContent: 'flex-end' },
  vacio: { color: colors.textFaint, fontSize: 12, fontWeight: '600', paddingVertical: spacing.sm },
  list: { flexGrow: 0, maxHeight: 220 },
  content: { gap: spacing.xs, paddingVertical: spacing.xs },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '88%',
    backgroundColor: scrim.soft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    flexWrap: 'wrap',
  },
  systemBubble: { backgroundColor: 'rgba(0,230,118,0.22)' },
  giftBubble: { backgroundColor: 'rgba(168,255,62,0.26)' },
  levelPill: {
    backgroundColor: colors.secondary,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginRight: 6,
  },
  levelText: { color: colors.onPrimary, fontSize: 10, fontWeight: '800' },
  author: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  body: { color: colors.text, fontSize: 13, fontWeight: '500' },
  systemText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  giftText: { color: colors.text, fontSize: 13, fontWeight: '700' },
});
