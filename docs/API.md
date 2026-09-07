# API

Base: `http://localhost:4000`. Todo el cuerpo va en JSON.

Las rutas privadas necesitan la cabecera `Authorization: Bearer <token>`, donde
el token es el que devuelven `/api/auth/register` o `/api/auth/login`.

Los errores siempre tienen la misma forma:

```json
{ "error": { "code": "insufficient_funds", "message": "No tienes monedas suficientes" } }
```

Cuando falla la validación, `details` trae el detalle por campo.

## Autenticación

| Método | Ruta                 | Privada | Qué hace                                              |
| ------ | -------------------- | ------- | ----------------------------------------------------- |
| POST   | `/api/auth/register` | no      | Crea la cuenta y acredita 500 monedas de bienvenida    |
| POST   | `/api/auth/login`    | no      | Acepta correo **o** usuario en el campo `identifier`   |
| GET    | `/api/auth/me`       | sí      | Perfil propio con monedero, nivel y seguidores         |

```http
POST /api/auth/register
{ "email": "luna@correo.com", "username": "luna", "password": "contrasena123",
  "displayName": "Luna Ríos", "gender": "female" }

201 { "token": "eyJ…", "user": { "id": "…", "coins": 500, "level": 1, … } }
```

## Usuarios

| Método | Ruta                              | Privada | Qué hace                          |
| ------ | --------------------------------- | ------- | --------------------------------- |
| GET    | `/api/users/search?q=luna`        | no      | Busca por usuario o nombre        |
| GET    | `/api/users/:username`            | opcional| Perfil público, seguidores, directo activo |
| GET    | `/api/users/:username/followers`  | no      | Hasta 100 seguidores              |
| GET    | `/api/users/:username/following`  | no      | Hasta 100 seguidos                |
| GET    | `/api/users/:username/streams`    | no      | Últimas 20 transmisiones terminadas, con duración y pico |
| POST   | `/api/users/:username/follow`     | sí      | Seguir                            |
| DELETE | `/api/users/:username/follow`     | sí      | Dejar de seguir                   |
| PATCH  | `/api/users/me`                   | sí      | Editar nombre, bio, avatar o país |

Con token, `GET /api/users/:username` añade `isFollowing` e `isSelf`.

## Transmisiones

| Método | Ruta                          | Privada | Qué hace                                        |
| ------ | ----------------------------- | ------- | ----------------------------------------------- |
| GET    | `/api/rooms`                  | no      | Lista con `category`, `status`, `limit`, `cursor` |
| POST   | `/api/rooms`                  | sí      | Abre una sala y devuelve credenciales de vídeo  |
| GET    | `/api/rooms/:id`              | opcional| Detalle con los últimos 50 mensajes             |
| POST   | `/api/rooms/:id/join`         | sí      | Credenciales de vídeo para entrar               |
| POST   | `/api/rooms/:id/end`          | sí      | Cierra la sala (solo el anfitrión)              |
| GET    | `/api/rooms/:id/messages`     | no      | Historial de chat                               |
| POST   | `/api/rooms/:id/messages`     | sí      | Publica un mensaje (alternativa REST al socket) |
| POST   | `/api/rooms/:id/like`         | sí      | Suma un like                                    |
| GET    | `/api/rooms/:id/seats`        | no      | Invitados de la tira lateral                    |
| POST   | `/api/rooms/:id/seats/request`| sí      | Pedir subir a la transmisión                    |
| POST   | `/api/rooms/:id/seats/:userId/accept` | sí | El anfitrión sube a alguien                |
| DELETE | `/api/rooms/:id/seats/:userId`| sí      | Bajar a alguien, o rechazar su solicitud        |
| PATCH  | `/api/rooms/:id/seats/:userId/mic` | sí | Silenciar o reactivar su micrófono           |

Categorías: `chat`, `music`, `dance`, `game`, `talent`.

Abrir una sala cierra automáticamente cualquier directo anterior de esa cuenta.

```http
POST /api/rooms
{ "title": "Noche acústica 🎤", "category": "music" }

201 {
  "room": { "id": "…", "status": "live", "channel": "livora-…", … },
  "credentials": { "provider": "mock", "role": "host", "token": "mock.…", "expiresAt": 1770000000000 }
}
```

### Invitados de la tira lateral

Un espectador puede subir a la transmisión **sin cámara**: en la tira solo se ve
su avatar y publica únicamente micrófono, con un token de LiveKit limitado a esa
fuente. Caben 8 a la vez y los huecos se reutilizan al quedar libres.

El flujo es: el espectador pide subir, el anfitrión acepta, y quien sube recibe
por socket sus credenciales de voz. Bajar de la tira lo puede hacer el propio
invitado o el anfitrión, y es también la forma de rechazar una solicitud.

```http
POST /api/rooms/:id/seats/request
201 { "roomId": "…", "seats": [], "pending": [{ "userId": "…", "status": "pending", … }] }

POST /api/rooms/:id/seats/:userId/accept
200 {
  "roomId": "…",
  "seats": [{ "userId": "…", "status": "active", "position": 1, "micMuted": false, "user": { … } }],
  "pending": [],
  "credentials": { "provider": "livekit", "role": "guest", … }
}
```

La lista `pending` solo llega completa al anfitrión: al resto de la sala se le
manda vacía, porque las solicitudes ajenas no le incumben.

## Regalos

| Método | Ruta                    | Privada | Qué hace                        |
| ------ | ----------------------- | ------- | ------------------------------- |
| GET    | `/api/gifts`            | no      | Catálogo activo                 |
| POST   | `/api/gifts/send`       | sí      | Envía un regalo a la sala       |
| GET    | `/api/gifts/room/:id`   | no      | Últimos 30 regalos de una sala  |

```http
POST /api/gifts/send
{ "roomId": "…", "giftCode": "rose", "quantity": 3, "recipientId": "…" }

201 {
  "giftSend": { "coinsSpent": 30, "diamondsEarned": 15, "coinsRewarded": 0, "luckyMultiplier": null, "recipient": { … }, … },
  "wallet": { "coins": 470, "diamonds": 0 }
}
```

`recipientId` es opcional: sin él el regalo va al anfitrión, como siempre. Con
él tiene que ser alguien que esté en la sala (el anfitrión o un invitado de la
tira), así que **el anfitrión también puede regalar** a sus invitados. Nadie
puede regalarse a sí mismo.

### Regalos con premio

Algunos regalos devuelven monedas al emisor. Al enviarlos se sortea una vez
(no por unidad) con la probabilidad `luckyChance` del catálogo; si toca, se
elige uno de `luckyMultipliers` y se abonan `coinsSpent × multiplicador` monedas
dentro de la misma transacción que el cobro, con su propio movimiento
`gift_reward` en el historial.

La **tasa de retorno esperada** de cada regalo (probabilidad × media de los
multiplicadores) se mantiene por debajo de 1 a propósito: por encima, enviarlo
sería rentable y la economía dejaría de tener sentido. Está documentada regalo a
regalo en `server/src/lib/gift-catalog.ts` y vigilada por una prueba.

El anfitrión recibe **0,5 diamantes por moneda** gastada, y el emisor gana
**1 punto de experiencia por moneda**. Si no hay saldo, responde `402`.

## Monedero

| Método | Ruta                          | Privada | Qué hace                                     |
| ------ | ----------------------------- | ------- | -------------------------------------------- |
| GET    | `/api/wallet`                 | sí      | Saldo y paquetes de recarga                  |
| POST   | `/api/wallet/topup`           | sí      | Acredita un paquete (**compra simulada**)    |
| POST   | `/api/wallet/exchange`        | sí      | Convierte diamantes en monedas (1:1)         |
| GET    | `/api/wallet/transactions`    | sí      | Últimos 50 movimientos                       |

`topup` **no cobra nada**: en producción debe validar el recibo de App Store o
Google Play antes de acreditar.

## Ranking

| Método | Ruta                                | Privada | Qué hace                          |
| ------ | ----------------------------------- | ------- | --------------------------------- |
| GET    | `/api/ranking/hosts?period=week`    | no      | Anfitriones por diamantes         |
| GET    | `/api/ranking/senders?period=week`  | no      | Fans por monedas gastadas         |

`period`: `day`, `week` o `all`.

## WebSocket

Conexión con el token en el handshake; sin token la conexión se rechaza:

```ts
io('http://localhost:4000', { transports: ['websocket'], auth: { token } });
```

**Del cliente al servidor**

| Evento              | Payload                        |
| ------------------- | ------------------------------ |
| `room:join`         | `{ roomId }`                   |
| `room:leave`        | `{ roomId }`                   |
| `room:send_message` | `{ roomId, body }`             |
| `room:like`         | `{ roomId }`                   |

**Del servidor al cliente**

| Evento           | Payload                                              |
| ---------------- | ---------------------------------------------------- |
| `room:message`   | Mensaje de chat con su autor y nivel                 |
| `room:gift`      | Regalo recibido y total de diamantes de la sala      |
| `room:viewers`   | `{ roomId, count }`                                  |
| `room:likes`     | `{ roomId, totalLikes }`                             |
| `room:ended`     | `{ roomId, durationSeconds, totalDiamonds, peakViewers }` |
| `wallet:updated` | `{ coins, diamonds }` (solo al usuario afectado)     |
| `app:error`      | `{ message }`                                        |

Los mensajes se limitan a 200 caracteres y a uno cada 700 ms por conexión. Los
tipos exactos están en `server/src/realtime/events.ts`.
