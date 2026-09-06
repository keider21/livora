# Capa de streaming

La app nunca llama al SDK de vídeo directamente. Hay dos interfaces, una a cada
lado, y una implementación simulada de cada una.

## Servidor: `StreamProvider`

`server/src/streaming/provider.ts`

```ts
interface StreamProvider {
  readonly name: string;
  createChannel(roomId: string): Promise<string>;
  issueToken(params: {
    channel: string;
    identity: string;
    role: 'host' | 'viewer';
    ttlSeconds?: number;
  }): Promise<StreamCredentials>;
  closeChannel(channel: string): Promise<void>;
}
```

- `createChannel` se llama al abrir una sala; el canal se guarda en `Room.channel`.
- `issueToken` se llama en `POST /api/rooms/:id/join` y al crear la sala.
- `closeChannel` se llama al terminar la transmisión.

El proveedor activo se elige con `STREAM_PROVIDER` en el `.env` y se construye en
`server/src/streaming/index.ts`.

## Móvil: `StreamRenderer`

`mobile/src/streaming/provider.tsx`

```ts
interface StreamRenderer {
  name: string;
  Surface: (props: StreamSurfaceProps) => ReactNode;
}
```

`Surface` recibe las credenciales que devolvió el servidor y ocupa el fondo de la
sala. La pantalla `room/[id].tsx` elige el renderer según
`credentials.provider`, así que no hay que tocarla al cambiar de proveedor.

## LiveKit (proveedor elegido)

Decisión del 2026-09-05: LiveKit, por ser código abierto y gratuito de hospedar.

### Servidor

`server/src/streaming/livekit-provider.ts` implementa `StreamProvider` con
`livekit-server-sdk`: firma un `AccessToken` por participante con `roomJoin`,
`canPublish` solo para el anfitrión y `canSubscribe` para todos. El chat sigue
yendo por nuestro socket, así que `canPublishData` es `false`. La sala se llama
`livora-<id>`; LiveKit la crea al entrar el primero y `closeChannel` la borra.

Se activa en `server/.env`:

```
STREAM_PROVIDER=livekit
LIVEKIT_URL=ws://192.168.1.50:7880     # la IP de tu equipo, no localhost
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

Si falta alguna variable, el servidor avisa y arranca con el proveedor simulado.

### Servidor de medios en local (gratis)

```bash
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server --dev --bind 0.0.0.0
```

`--dev` usa las claves `devkey` / `secret` y no necesita configuración. El
teléfono debe poder llegar al puerto 7880 del equipo (misma red Wi-Fi,
cortafuegos abierto). Para producción: un VPS con `livekit-server` y un
dominio con TLS (`wss://`), o LiveKit Cloud, que tiene plan gratuito.

### Móvil

`mobile/src/streaming/livekit-surface.tsx` implementa `StreamRenderer` con
`@livekit/react-native`: `LiveKitRoom` conecta con la `url` y el `token` que
devolvió el servidor, publica cámara y micrófono si el rol es anfitrión, y
`VideoTrack` pinta la cámara (la propia, en espejo, o la del anfitrión). Los
permisos de Android se piden en tiempo de ejecución (`permissions.ts`); los de
iOS los declara el plugin de WebRTC en `app.json`.

`index.ts` llama a `registerGlobals()` antes de cargar expo-router, como exige
el SDK. Todo esto requiere la APK propia (Fase 10 del plan): Expo Go no
incluye WebRTC.

### Cómo sabe la app qué renderer usar

`POST /api/rooms/:id/join` devuelve `credentials.provider`. La sala llama a
`getStreamRenderer(provider)`: `mock` pinta la superficie simulada y `livekit`
la real. Ninguna pantalla cambia al alternar el `.env` del servidor.

## Agora (alternativa descartada)

Se descartó por coste por minuto. Si algún día hiciera falta, el adaptador es
casi idéntico al de LiveKit con `agora-token` en el servidor y
`react-native-agora` en el móvil; `StreamCredentials.url` sobra porque Agora
no necesita servidor de medios propio.

## Por qué esta capa

Sin ella, el proveedor de vídeo se filtra a las rutas, a las pantallas y a los
tipos compartidos. Con ella, cambiar de proveedor toca dos archivos y ninguna
pantalla, y la app entera se puede probar sin vídeo real.
