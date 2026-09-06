import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ApiError, gifts as giftsApi, rooms as roomsApi, users as usersApi } from '../../src/api';
import type { Gift, Room, StreamCredentials } from '../../src/api/types';
import type { ChatMessage, GiftEvent, LikesEvent, RoomEndedEvent, ViewersEvent } from '../../src/realtime/events';
import { SOCKET_EVENTS } from '../../src/realtime/events';
import {
  getSocket,
  joinRoomChannel,
  leaveRoomChannel,
  likeRoom,
  sendRoomMessage,
} from '../../src/realtime/socket';
import { getStreamRenderer } from '../../src/streaming/provider';
import { useAuthStore } from '../../src/store/auth-store';
import { ChatOverlay } from '../../src/components/chat-overlay';
import { GiftAnimation } from '../../src/components/gift-animation';
import { GiftPicker } from '../../src/components/gift-picker';
import { Avatar, Loader } from '../../src/components/ui';
import { colors, formatCount, radius, scrim, spacing } from '../../src/theme';

const MAX_MESSAGES = 120;

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [room, setRoom] = useState<Room | null>(null);
  const [credentials, setCredentials] = useState<StreamCredentials | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewers, setViewers] = useState(0);
  const [likes, setLikes] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [draft, setDraft] = useState('');
  const [giftCatalog, setGiftCatalog] = useState<Gift[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sendingGift, setSendingGift] = useState(false);
  const [currentGift, setCurrentGift] = useState<GiftEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  // Los regalos entran en cola para que dos seguidos no se pisen en pantalla.
  const giftQueue = useRef<GiftEvent[]>([]);

  const isHost = Boolean(room && user && room.host.id === user.id);

  const pushMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => [...current, message].slice(-MAX_MESSAGES));
  }, []);

  const showNextGift = useCallback(() => {
    const next = giftQueue.current.shift() ?? null;
    setCurrentGift(next);
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const detail = await roomsApi.get(id);
        if (cancelled) return;

        setRoom(detail.room);
        setMessages(detail.messages);
        setViewers(detail.room.viewerCount);
        setLikes(detail.room.totalLikes);
        setIsFollowing(detail.isFollowingHost);

        if (detail.room.status === 'live') {
          const joined = await roomsApi.join(id);
          if (cancelled) return;
          setCredentials(joined.credentials);
          joinRoomChannel(id);
        }

        const catalog = await giftsApi.catalog();
        if (!cancelled) setGiftCatalog(catalog.gifts);
      } catch (error) {
        if (!cancelled) {
          setFatalError(error instanceof ApiError ? error.message : 'No se pudo abrir la transmisión');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      leaveRoomChannel(id);
    };
  }, [id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !id) return;

    const onMessage = (message: ChatMessage) => {
      if (message.roomId === id) pushMessage(message);
    };
    const onGift = (event: GiftEvent) => {
      if (event.roomId !== id) return;
      setRoom((current) => (current ? { ...current, totalDiamonds: event.roomTotalDiamonds } : current));
      if (currentGiftRef.current) {
        giftQueue.current.push(event);
      } else {
        setCurrentGift(event);
      }
    };
    const onViewers = (event: ViewersEvent) => {
      if (event.roomId === id) setViewers(event.count);
    };
    const onLikes = (event: LikesEvent) => {
      if (event.roomId === id) setLikes(event.totalLikes);
    };
    const onEnded = (event: RoomEndedEvent) => {
      if (event.roomId !== id) return;
      setRoom((current) => (current ? { ...current, status: 'ended' } : current));
      Alert.alert(
        'La transmisión terminó',
        `Duró ${Math.round(event.durationSeconds / 60)} min · 💎 ${event.totalDiamonds} · 👀 pico ${event.peakViewers}`,
        [{ text: 'Volver', onPress: () => router.back() }],
      );
    };
    const onError = (payload: { message: string }) => {
      Alert.alert('Aviso', payload.message);
    };

    socket.on(SOCKET_EVENTS.ROOM_MESSAGE, onMessage);
    socket.on(SOCKET_EVENTS.ROOM_GIFT, onGift);
    socket.on(SOCKET_EVENTS.ROOM_VIEWERS, onViewers);
    socket.on(SOCKET_EVENTS.ROOM_LIKES, onLikes);
    socket.on(SOCKET_EVENTS.ROOM_ENDED, onEnded);
    socket.on(SOCKET_EVENTS.ERROR, onError);

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_MESSAGE, onMessage);
      socket.off(SOCKET_EVENTS.ROOM_GIFT, onGift);
      socket.off(SOCKET_EVENTS.ROOM_VIEWERS, onViewers);
      socket.off(SOCKET_EVENTS.ROOM_LIKES, onLikes);
      socket.off(SOCKET_EVENTS.ROOM_ENDED, onEnded);
      socket.off(SOCKET_EVENTS.ERROR, onError);
    };
  }, [id, pushMessage, router]);

  // Espejo del regalo en curso para leerlo dentro del manejador del socket sin
  // volver a suscribirse en cada cambio.
  const currentGiftRef = useRef<GiftEvent | null>(null);
  useEffect(() => {
    currentGiftRef.current = currentGift;
  }, [currentGift]);

  function submitMessage() {
    const body = draft.trim();
    if (!body || !id) return;
    sendRoomMessage(id, body);
    setDraft('');
  }

  async function toggleFollow() {
    if (!room) return;
    try {
      const result = isFollowing
        ? await usersApi.unfollow(room.host.username)
        : await usersApi.follow(room.host.username);
      setIsFollowing(result.following);
    } catch (error) {
      Alert.alert('No se pudo actualizar', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
    }
  }

  async function sendGift(giftCode: string, quantity: number) {
    if (!id) return;
    setSendingGift(true);
    try {
      await giftsApi.send({ roomId: id, giftCode, quantity });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPickerOpen(false);
    } catch (error) {
      Alert.alert('No se pudo enviar', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
    } finally {
      setSendingGift(false);
    }
  }

  function tapLike() {
    if (!id) return;
    setLikes((current) => current + 1);
    likeRoom(id);
    void Haptics.selectionAsync();
  }

  async function endBroadcast() {
    if (!id) return;
    Alert.alert('Terminar transmisión', '¿Seguro que quieres cerrar tu directo?', [
      { text: 'Seguir en vivo', style: 'cancel' },
      {
        text: 'Terminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await roomsApi.end(id);
            router.back();
          } catch (error) {
            Alert.alert('No se pudo terminar', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.fill}>
        <Loader label="Entrando a la sala…" />
      </View>
    );
  }

  if (fatalError || !room) {
    return (
      <SafeAreaView style={styles.fill}>
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{fatalError ?? 'Transmisión no disponible'}</Text>
          <Pressable onPress={() => router.back()} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const renderer = getStreamRenderer(credentials?.provider ?? 'mock');

  return (
    <View style={styles.fill}>
      {credentials ? (
        <renderer.Surface
          credentials={credentials}
          hostName={room.host.displayName}
          avatarUrl={room.host.avatarUrl}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.endedBackdrop]}>
          <Text style={styles.endedText}>Esta transmisión ya terminó</Text>
        </View>
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.hostChip}>
            <Avatar uri={room.host.avatarUrl} name={room.host.displayName} size={34} ring />
            <View style={styles.hostInfo}>
              <Text style={styles.hostName} numberOfLines={1}>
                {room.host.displayName}
              </Text>
              <Text style={styles.hostMeta}>💎 {formatCount(room.totalDiamonds)}</Text>
            </View>
            {!isHost ? (
              <Pressable onPress={toggleFollow} style={[styles.followButton, isFollowing && styles.followingButton]}>
                <Text style={[styles.followText, isFollowing && styles.followingText]}>
                  {isFollowing ? 'Siguiendo' : 'Seguir'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.topRight}>
            <View style={styles.viewerChip}>
              <Ionicons name="eye" size={13} color={colors.text} />
              <Text style={styles.viewerText}>{formatCount(viewers)}</Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={styles.closeButton}
              accessibilityLabel="Salir de la sala"
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.giftLayer} pointerEvents="none">
          {currentGift ? <GiftAnimation event={currentGift} onDone={showNextGift} /> : null}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          style={styles.bottom}
        >
          <ChatOverlay messages={messages} />

          <View style={styles.actionBar}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submitMessage}
              placeholder="Di algo bonito…"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              maxLength={200}
              returnKeyType="send"
              editable={room.status === 'live'}
            />

            {isHost ? (
              <Pressable onPress={endBroadcast} style={[styles.circle, styles.endCircle]}>
                <Ionicons name="stop" size={20} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={[styles.circle, styles.giftCircle]}
                disabled={room.status !== 'live'}
              >
                <Ionicons name="gift" size={20} color={colors.onPrimary} />
              </Pressable>
            )}

            <Pressable onPress={tapLike} style={styles.circle} disabled={room.status !== 'live'}>
              <Ionicons name="heart" size={20} color={colors.primary} />
              {likes > 0 ? <Text style={styles.likeCount}>{formatCount(likes)}</Text> : null}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <GiftPicker
        visible={pickerOpen}
        gifts={giftCatalog}
        coins={user?.coins ?? 0}
        sending={sendingGift}
        onClose={() => setPickerOpen(false)}
        onSend={sendGift}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  overlay: { flex: 1, justifyContent: 'space-between' },
  endedBackdrop: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  endedText: { color: colors.textMuted, fontWeight: '700' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  hostChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: scrim.soft,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: spacing.sm,
    flexShrink: 1,
  },
  hostInfo: { maxWidth: 110 },
  hostName: { color: colors.text, fontWeight: '700', fontSize: 13 },
  hostMeta: { color: colors.diamond, fontSize: 11, fontWeight: '600' },
  followButton: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  followingButton: { backgroundColor: colors.surfaceAlt },
  followText: { color: colors.onPrimary, fontSize: 11, fontWeight: '700' },
  followingText: { color: colors.text },

  topRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  viewerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: scrim.soft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  viewerText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: scrim.soft,
  },

  giftLayer: { paddingHorizontal: spacing.md },

  bottom: { padding: spacing.md, gap: spacing.sm },
  actionBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: scrim.strong,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  circle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: scrim.strong,
    borderWidth: 1,
    borderColor: colors.border,
  },
  giftCircle: { backgroundColor: colors.primary, borderColor: colors.primary },
  endCircle: { backgroundColor: colors.danger, borderColor: colors.danger },
  likeCount: { position: 'absolute', bottom: 2, color: colors.text, fontSize: 9, fontWeight: '700' },

  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  errorTitle: { color: colors.text, fontWeight: '700', fontSize: 16, textAlign: 'center' },
  errorButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorButtonText: { color: colors.text, fontWeight: '700' },
});
