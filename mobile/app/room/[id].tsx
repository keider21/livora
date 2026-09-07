import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ApiError, gifts as giftsApi, rooms as roomsApi, users as usersApi } from '../../src/api';
import type { Gift, Room, StreamCredentials } from '../../src/api/types';
import type {
  ChatMessage,
  GiftEvent,
  LikesEvent,
  RoomEndedEvent,
  SeatInfo,
  SeatsEvent,
  ViewersEvent,
} from '../../src/realtime/events';
import { SOCKET_EVENTS } from '../../src/realtime/events';
import {
  getSocket,
  joinRoomChannel,
  leaveRoomChannel,
  likeRoom,
  sendRoomMessage,
} from '../../src/realtime/socket';
import { getStreamRenderer } from '../../src/streaming/provider';
import { LiveKitHostControls } from '../../src/streaming/livekit-surface';
import { useAuthStore } from '../../src/store/auth-store';
import { ChatOverlay } from '../../src/components/chat-overlay';
import { GiftAnimation } from '../../src/components/gift-animation';
import { GiftAura } from '../../src/components/gift-aura';
import { GiftBurst } from '../../src/components/gift-burst';
import { GiftPicker, type GiftTarget } from '../../src/components/gift-picker';
import { QuickGift } from '../../src/components/quick-gift';
import { SeatRequests } from '../../src/components/seat-requests';
import { SeatStrip } from '../../src/components/seat-strip';
import { FloatingHeart, type HeartSpec } from '../../src/components/floating-hearts';
import { useKeyboardHeight } from '../../src/components/use-keyboard-height';
import { Avatar, Loader } from '../../src/components/ui';
import { colors, formatCount, radius, scrim, spacing } from '../../src/theme';

const MAX_MESSAGES = 120;

/** Un regalo en pantalla: el último evento y lo acumulado de esa combinación. */
interface Announcement {
  /** regalo | remitente | destinatario */
  key: string;
  event: GiftEvent;
  quantity: number;
  coins: number;
  wins: number;
  /** Sube en cada repetición; reinicia las animaciones. */
  round: number;
}

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
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  // Invitados de la tira lateral. `pending` solo llega si eres el anfitrión.
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [pendingSeats, setPendingSeats] = useState<SeatInfo[]>([]);
  const [requestsOpen, setRequestsOpen] = useState(false);
  /** Hoja de cámara y micrófono del anfitrión, que abre la tuerca de la barra. */
  const [controlsOpen, setControlsOpen] = useState(false);
  /** A quiénes va el próximo regalo. Vacío significa «al anfitrión». */
  const [giftTargets, setGiftTargets] = useState<string[]>([]);
  /** Con el candado echado la caja no se cierra al enviar. */
  const [giftLocked, setGiftLocked] = useState(false);
  /** Nivel de club de fans con este anfitrión. */
  const [fanLevel, setFanLevel] = useState(0);
  /** Último regalo enviado, para poder repetirlo desde la pantalla. */
  const [lastGift, setLastGift] = useState<{ gift: Gift; quantity: number } | null>(null);

  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  /** Corazones flotando ahora mismo, y opción de esconder el chat. */
  const [hearts, setHearts] = useState<HeartSpec[]>([]);
  const [chatHidden, setChatHidden] = useState(false);
  const heartId = useRef(0);

  /**
   * Anuncios de regalo en curso, uno por destinatario.
   *
   * Al regalar a varias personas el servidor manda un evento por cada una, con
   * su propio sorteo: pueden salir doce premios en una y cuatro en otra. Por eso
   * cada destinatario lleva su propio contador en pantalla, en vez de juntarse
   * todos en uno.
   *
   * Los repetidos del mismo regalo, remitente y destinatario sí se acumulan
   * (×1, ×2, ×3…) y reinician su tiempo. Antes se encolaban y con el envío
   * automático quedaban animaciones saliendo mucho después de parar.
   */
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const isHost = Boolean(room && user && room.host.id === user.id);

  const pushMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => [...current, message].slice(-MAX_MESSAGES));
  }, []);

  const hideAnnouncement = useCallback((key: string) => {
    setAnnouncements((current) => current.filter((item) => item.key !== key));
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

        const catalog = await giftsApi.catalog(id);
        if (!cancelled) {
          setGiftCatalog(catalog.gifts);
          setFanLevel(catalog.fanLevel);
        }

        const strip = await roomsApi.seats(id);
        if (!cancelled) {
          setSeats(strip.seats);
          setPendingSeats(strip.pending);
        }
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

      // Un anuncio por regalo, remitente y destinatario. La comparación va
      // dentro del actualizador porque al regalar a varios los eventos llegan
      // en la misma vuelta y un valor leído de fuera estaría desfasado.
      const key = `${event.gift.code}|${event.sender.id}|${event.recipient.id}`;
      setAnnouncements((current) => {
        const existente = current.find((item) => item.key === key);
        const actualizado: Announcement = existente
          ? {
              ...existente,
              event,
              quantity: existente.quantity + event.quantity,
              coins: existente.coins + event.coinsRewarded,
              wins: existente.wins + event.luckyWins,
              round: existente.round + 1,
            }
          : { key, event, quantity: event.quantity, coins: event.coinsRewarded, wins: event.luckyWins, round: 0 };

        const resto = current.filter((item) => item.key !== key);
        // Como mucho tres a la vez: más no caben y tapan el vídeo.
        return [...resto, actualizado].slice(-3);
      });
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
    const onSeats = (event: SeatsEvent & { credentials?: StreamCredentials }) => {
      if (event.roomId !== id) return;
      setSeats(event.seats);
      // A la sala entera le llega la lista de pendientes vacía; solo el
      // anfitrión recibe la de verdad, en su propio canal.
      setPendingSeats(event.pending);
      // Si acabo de subir, el servidor manda credenciales para publicar voz.
      if (event.credentials) setCredentials(event.credentials);
    };
    const onError = (payload: { message: string }) => {
      Alert.alert('Aviso', payload.message);
    };

    socket.on(SOCKET_EVENTS.ROOM_MESSAGE, onMessage);
    socket.on(SOCKET_EVENTS.ROOM_GIFT, onGift);
    socket.on(SOCKET_EVENTS.ROOM_VIEWERS, onViewers);
    socket.on(SOCKET_EVENTS.ROOM_LIKES, onLikes);
    socket.on(SOCKET_EVENTS.ROOM_ENDED, onEnded);
    socket.on(SOCKET_EVENTS.ROOM_SEATS, onSeats);
    socket.on(SOCKET_EVENTS.ERROR, onError);

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_MESSAGE, onMessage);
      socket.off(SOCKET_EVENTS.ROOM_GIFT, onGift);
      socket.off(SOCKET_EVENTS.ROOM_VIEWERS, onViewers);
      socket.off(SOCKET_EVENTS.ROOM_LIKES, onLikes);
      socket.off(SOCKET_EVENTS.ROOM_ENDED, onEnded);
      socket.off(SOCKET_EVENTS.ROOM_SEATS, onSeats);
      socket.off(SOCKET_EVENTS.ERROR, onError);
    };
  }, [id, pushMessage, router]);

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

  /** Devuelve si salió bien, para que el envío automático se pare al fallar. */
  async function sendGift(giftCode: string, quantity: number): Promise<boolean> {
    if (!id) return false;
    setSendingGift(true);
    try {
      // Sin destinatarios elegidos el servidor se lo da al anfitrión.
      await giftsApi.send({
        roomId: id,
        giftCode,
        quantity,
        ...(giftTargets.length ? { recipientIds: giftTargets } : {}),
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const enviado = giftCatalog.find((gift) => gift.code === giftCode);
      if (enviado) setLastGift({ gift: enviado, quantity });

      // Con el candado echado la caja se queda abierta para seguir enviando;
      // sin él se cierra y aparece el botón de repetir sobre la pantalla.
      if (!giftLocked) setPickerOpen(false);
      return true;
    } catch (error) {
      Alert.alert('No se pudo enviar', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
      return false;
    } finally {
      setSendingGift(false);
    }
  }

  // El botón de repetir guarda estas funciones en refs, así que tienen que
  // mantener su identidad entre renders o reiniciarían la cuenta atrás.
  const repetirUltimo = useCallback(async () => {
    if (!lastGift) return false;
    return sendGift(lastGift.gift.code, lastGift.quantity);
    // `sendGift` se redefine en cada render pero siempre lee estado fresco, así
    // que basta con depender del regalo que se repite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastGift]);

  const olvidarUltimo = useCallback(() => setLastGift(null), []);

  /**
   * Los participantes que pueden recibir un regalo: uno mismo el primero, luego
   * el anfitrión y después los invitados de la tira.
   */
  const giftTargetList: GiftTarget[] = room
    ? [
        ...(user && user.id !== room.host.id
          ? [{ id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, label: 'Tú' }]
          : []),
        {
          id: room.host.id,
          displayName: room.host.displayName,
          avatarUrl: room.host.avatarUrl,
          label: user?.id === room.host.id ? 'Tú (anfitrión)' : 'Anfitrión',
        },
        ...seats
          .filter((seat) => seat.userId !== user?.id)
          .map((seat) => ({
            id: seat.userId,
            displayName: seat.user.displayName,
            avatarUrl: seat.user.avatarUrl,
            label: seat.user.displayName,
          })),
      ]
    : [];

  /** Pedir subir, o bajarse si ya se está arriba. */
  async function toggleSeat() {
    if (!id || !user) return;
    const arriba = seats.some((seat) => seat.userId === user.id);
    try {
      if (arriba) {
        await roomsApi.removeSeat(id, user.id);
      } else {
        await roomsApi.requestSeat(id);
        Alert.alert('Pedido enviado', 'El anfitrión decide si te sube a la transmisión.');
      }
    } catch (error) {
      Alert.alert('No se pudo', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
    }
  }

  async function seatAction(action: 'accept' | 'remove', userId: string) {
    if (!id) return;
    try {
      if (action === 'accept') {
        await roomsApi.acceptSeat(id, userId);
      } else {
        await roomsApi.removeSeat(id, userId);
        // Si bajaba al destinatario del regalo, vuelve a apuntar al anfitrión.
        setGiftTargets((current) => current.filter((target) => target !== userId));
      }
    } catch (error) {
      Alert.alert('No se pudo', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
    }
  }

  /**
   * Un toque en cualquier parte del vídeo suma un like y suelta un corazón
   * donde se tocó, como en las apps del sector. El contador de arriba sube al
   * momento sin esperar al servidor: el socket lo corregirá si hace falta.
   */
  function tapLike(x?: number, y?: number) {
    if (!id) return;
    setLikes((current) => current + 1);
    likeRoom(id);
    void Haptics.selectionAsync();

    if (x !== undefined && y !== undefined) {
      heartId.current += 1;
      const nuevo = { id: heartId.current, x, y };
      // Se limita a 30 a la vez: con toques muy rápidos, dibujarlos todos
      // hunde los fotogramas y no se nota la diferencia.
      setHearts((current) => [...current, nuevo].slice(-30));
    }
  }

  const removeHeart = useCallback((heartKey: number) => {
    setHearts((current) => current.filter((heart) => heart.id !== heartKey));
  }, []);

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
  const ultimoAnuncio = announcements[announcements.length - 1] ?? null;

  return (
    <View style={styles.fill}>
      {credentials ? (
        <renderer.Surface
          credentials={credentials}
          hostName={room.host.displayName}
          avatarUrl={room.host.avatarUrl}
        >
          {/* La hoja necesita el contexto de LiveKit, así que vive dentro de la
              superficie; se pinta en un Modal, por encima de todo lo demás. */}
          {isHost && credentials.provider === 'livekit' ? (
            <LiveKitHostControls visible={controlsOpen} onClose={() => setControlsOpen(false)} />
          ) : null}
        </renderer.Surface>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.endedBackdrop]}>
          <Text style={styles.endedText}>Esta transmisión ya terminó</Text>
        </View>
      )}

      {/* Capa que recoge los toques sobre el vídeo para los corazones. Va
          debajo de los controles, así que no les roba las pulsaciones. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(event) => tapLike(event.nativeEvent.locationX, event.nativeEvent.locationY)}
        disabled={room.status !== 'live'}
      />

      {hearts.map((heart) => (
        <FloatingHeart key={heart.id} heart={heart} onDone={removeHeart} />
      ))}

      {/* La explosión se pinta una sola vez, con el último anuncio: llenar la
          pantalla con varias a la vez no dejaría ver nada. Los exclusivos no
          explotan, muestran su aura. */}
      {ultimoAnuncio ? (
        ultimoAnuncio.event.gift.animation === 'aura' ? (
          <GiftAura key={ultimoAnuncio.event.id} event={ultimoAnuncio.event} onDone={() => undefined} />
        ) : (
          <GiftBurst
            // La clave incluye la ronda para que cada repetición relance la
            // explosión desde cero en vez de esperar a que acabe la anterior.
            key={`${ultimoAnuncio.key}-${ultimoAnuncio.round}`}
            event={ultimoAnuncio.event}
            coinsRewarded={ultimoAnuncio.coins}
            wins={ultimoAnuncio.wins}
            onDone={() => undefined}
          />
        )
      ) : null}

      {/* El borde inferior se gestiona a mano en la barra de abajo, junto con
          el teclado; si lo aplicara también SafeAreaView se sumarían los dos. */}
      <SafeAreaView style={styles.overlay} edges={['top', 'left', 'right']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.hostChip}>
            {/* Tocar al anfitrión abre su perfil: nivel, biografía y directos. */}
            <Pressable
              onPress={() => router.push(`/user/${room.host.username}`)}
              style={styles.hostTap}
              accessibilityLabel={`Ver el perfil de ${room.host.displayName}`}
            >
              <Avatar uri={room.host.avatarUrl} name={room.host.displayName} size={34} ring />
              <View style={styles.hostInfo}>
                <Text style={styles.hostName} numberOfLines={1}>
                  {room.host.displayName}
                </Text>
                <Text style={styles.hostMeta}>
                  💎 {formatCount(room.totalDiamonds)} · ❤️ {formatCount(likes)}
                </Text>
              </View>
            </Pressable>
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

        <View style={styles.middle} pointerEvents="box-none">
          <View style={styles.giftLayer} pointerEvents="none">
            {announcements.map((item) => (
              <GiftAnimation
                key={item.key}
                event={item.event}
                comboQuantity={item.quantity}
                comboKey={item.round}
                coinsRewarded={item.coins}
                wins={item.wins}
                onDone={() => hideAnnouncement(item.key)}
              />
            ))}
          </View>

          <SeatStrip
            seats={seats}
            selectedId={giftTargets[0] ?? room.host.id}
            hostId={room.host.id}
            isHost={isHost}
            onSelect={(userId) => setGiftTargets([userId])}
            onRemove={(userId) => void seatAction('remove', userId)}
          />
        </View>

        {/* El desplazamiento por el teclado se hace a mano: en Android la
            ventana no se redimensiona y el teclado tapaba lo que se escribía.
            El margen inferior deja libres los tres botones del sistema. */}
        <View
          style={[
            styles.bottom,
            {
              marginBottom: keyboard > 0 ? keyboard : 0,
              // Con el teclado abierto manda el teclado; si no, se deja libre
              // la barra de navegación del sistema más un respiro.
              paddingBottom: keyboard > 0 ? spacing.sm : insets.bottom + spacing.sm,
            },
          ]}
        >
          {chatHidden ? null : <ChatOverlay messages={messages} />}

          {/* Repetir el último regalo sin volver a abrir la caja. */}
          {lastGift && !pickerOpen && room.status === 'live' ? (
            <View style={styles.quickRow}>
              {/* El saldo se ve sin abrir la caja, que es lo que hacía dudar de
                  si el automático estaba descontando monedas. */}
              <View style={styles.balancePill}>
                <Text style={styles.balanceText}>🪙 {(user?.coins ?? 0).toLocaleString('es')}</Text>
              </View>
              <QuickGift
                gift={lastGift.gift}
                quantity={lastGift.quantity}
                onSend={repetirUltimo}
                onExpire={olvidarUltimo}
              />
            </View>
          ) : null}

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
              <Pressable
                onPress={() => setRequestsOpen(true)}
                style={styles.circle}
                accessibilityLabel="Gestionar invitados"
              >
                <Ionicons name="people" size={20} color={colors.primary} />
                {pendingSeats.length > 0 ? (
                  <Text style={styles.badge}>{pendingSeats.length}</Text>
                ) : null}
              </Pressable>
            ) : (
              <Pressable
                onPress={() => void toggleSeat()}
                style={styles.circle}
                disabled={room.status !== 'live'}
                accessibilityLabel={
                  user && seats.some((seat) => seat.userId === user.id) ? 'Bajar de la transmisión' : 'Pedir subir'
                }
              >
                <Ionicons
                  name={user && seats.some((seat) => seat.userId === user.id) ? 'exit' : 'mic'}
                  size={20}
                  color={colors.primary}
                />
              </Pressable>
            )}

            {/* El anfitrión también regala: a sus invitados de la tira. */}
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={[styles.circle, styles.giftCircle]}
              disabled={room.status !== 'live'}
              accessibilityLabel="Enviar un regalo"
            >
              <Ionicons name="gift" size={20} color={colors.onPrimary} />
            </Pressable>

            {isHost ? (
              <Pressable
                onPress={() => setControlsOpen(true)}
                style={styles.circle}
                accessibilityLabel="Cámara y micrófono"
              >
                <Ionicons name="settings-sharp" size={20} color={colors.primary} />
              </Pressable>
            ) : null}

            {isHost ? (
              <Pressable onPress={endBroadcast} style={[styles.circle, styles.endCircle]}>
                <Ionicons name="stop" size={20} color="#FFFFFF" />
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => setChatHidden((current) => !current)}
              style={styles.circle}
              accessibilityLabel={chatHidden ? 'Mostrar el chat' : 'Ocultar el chat'}
            >
              <Ionicons name={chatHidden ? 'chatbubble-outline' : 'eye-off-outline'} size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <GiftPicker
        visible={pickerOpen}
        gifts={giftCatalog}
        coins={user?.coins ?? 0}
        sending={sendingGift}
        targets={giftTargetList}
        selectedIds={giftTargets.length ? giftTargets : [room.host.id]}
        fanLevel={fanLevel}
        locked={giftLocked}
        onToggleLock={() => setGiftLocked((current) => !current)}
        onToggleTarget={(targetId) =>
          setGiftTargets((current) => {
            const base = current.length ? current : [room.host.id];
            const ya = base.includes(targetId);
            const siguiente = ya ? base.filter((item) => item !== targetId) : [...base, targetId];
            // Nunca se queda sin nadie: quitar al último vuelve al anfitrión.
            return siguiente.length ? siguiente : [room.host.id];
          })
        }
        onClose={() => setPickerOpen(false)}
        onSend={sendGift}
      />

      <SeatRequests
        visible={requestsOpen}
        pending={pendingSeats}
        seats={seats}
        onClose={() => setRequestsOpen(false)}
        onAccept={(userId) => void seatAction('accept', userId)}
        onReject={(userId) => void seatAction('remove', userId)}
        onRemove={(userId) => void seatAction('remove', userId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  balancePill: {
    backgroundColor: 'rgba(5,10,7,0.75)',
    borderWidth: 1,
    borderColor: colors.coin,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  balanceText: { color: colors.coin, fontSize: 12, fontWeight: '800' },
  middle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    textAlign: 'center',
    backgroundColor: colors.live,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
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
  hostTap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  hostInfo: { maxWidth: 130 },
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

  // Los anuncios se apilan: al regalar a varios hay uno por destinatario.
  giftLayer: { paddingHorizontal: spacing.md, gap: spacing.xs },

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
