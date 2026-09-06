import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { ChatMessage } from '../realtime/events';
import { colors, radius, scrim, spacing } from '../theme';

/** Lista de chat que se mantiene pegada al último mensaje, como en la app real. */
export function ChatOverlay({ messages }: { messages: ChatMessage[] }) {
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  return (
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
