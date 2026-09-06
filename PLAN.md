# Plan de Livora Stream

> **Este documento es la fuente de verdad sobre el estado del proyecto.**
> Cualquier persona o IA que vaya a tocar código debe leerlo primero, trabajar
> sobre el paso que marca como actual y actualizarlo al terminar. Las reglas
> para hacerlo están al final, en [Cómo mantener este plan](#cómo-mantener-este-plan).

---

## Estado actual

| | |
| --- | --- |
| **Fase actual** | 10 — Pruebas en el teléfono. **La APK ya se publica sola.** |
| **Paso actual** | **10.4** 🔄: la APK instalada no conectaba. Se encontraron y corrigieron dos fallos reales (10.8 y 10.9); falta que el usuario reinstale y entre. Luego 3.8 (vídeo real) |
| **Última actualización** | 2026-09-06 |
| **Rama** | `main` en `keider21/livora`, repositorio propio y público (el último commit lo dice `git log -1`) |
| **Pull request** | Ninguno: se trabaja directo sobre `main` en el repositorio nuevo. El anterior ([keider21/cecchi#1](https://github.com/keider21/cecchi/pull/1)) queda histórico |
| **Salud** | 52 pruebas en verde (27 servidor + 25 móvil) · TypeScript limpio en `server/` y `mobile/` · empaqueta para Android · `expo prebuild` acepta los plugins de LiveKit |

**Lo último:** el usuario instaló la APK y no conectaba. No era el backend
apagado, eran dos fallos de la app, ya corregidos (10.8 y 10.9): el guardia de
navegación expulsaba la pantalla «Servidor» antes de poder escribir la IP, y la
compilación de release bloqueaba todo el HTTP plano. Falta reinstalar la APK
nueva y arrancar el backend con `iniciar-servidor.bat` (10.6).

**Lo que la IA no puede hacer:** desde 2026-09-06 la sesión corre en el propio
equipo del usuario, así que ya puede compilar, instalar dependencias y arrancar
el servidor local. Lo que sigue fuera de su alcance son las cuentas de terceros
(Render, Google Play) y lo que ocurre físicamente en el teléfono: eso queda ⛔ y
hay que dejárselo listo para un solo clic, no intentarlo.

---

## Qué es Livora Stream

App móvil de **live streaming social**: transmisiones en directo con chat,
regalos virtuales con economía de monedas y diamantes, seguidores, niveles y
rankings. Producto de referencia: Kako Live. Marca propia: nombre *Livora
Stream*, paleta verde neón sobre negro, logo con la letra L.

Dos piezas de código, cada una con su `package.json`:

- `server/` — API REST + WebSocket. Node, Express, Prisma, Socket.IO, SQLite en desarrollo.
- `mobile/` — App. Expo SDK 57, React Native, expo-router, TypeScript.

Documentación de apoyo: [`README.md`](README.md) (puesta en marcha),
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (cómo está organizado),
[`docs/API.md`](docs/API.md) (endpoints y eventos) y
[`docs/STREAMING.md`](docs/STREAMING.md) (cómo conectar vídeo real).

---

## Leyenda de estados

| Marca | Significado |
| --- | --- |
| ✅ | Hecho **y verificado** con un comando o una prueba. Nunca se marca por intuición. |
| 🔄 | En curso. Solo puede haber un paso 🔄 a la vez. |
| ⏳ | Pendiente. |
| ⛔ | Bloqueado: necesita algo externo (una decisión, una credencial, un permiso). El motivo va en la línea **Bloqueo**. |
| ⚠️ | Hecho con reservas: funciona, pero la línea **Falta** dice qué quedó a medias. |

Cada paso puede llevar estas líneas:

- **Falta:** lo que no está hecho de ese paso aunque esté marcado ✅ o ⚠️.
- **Bloqueo:** por qué no se puede avanzar.
- **Verificación:** el comando o la prueba que demuestra que está hecho.

---

## Fase 0 — Cimientos técnicos ✅

Objetivo: tener las dos piezas compilando, probadas y documentadas antes de
construir producto encima.

| Paso | Estado | Notas |
| --- | --- | --- |
| 0.1 Estructura `server/` + `mobile/` con scripts raíz (`setup`, `dev:*`, `test`, `typecheck`) | ✅ | `package.json` en la raíz de `livora-stream/` |
| 0.2 Backend base: Express, Helmet, CORS, Zod, errores uniformes, JWT | ✅ | `server/src/app.ts`, `middleware/`, `lib/` |
| 0.3 Base de datos: esquema Prisma sobre SQLite | ✅ | `server/prisma/schema.prisma`. Sin enums (SQLite): constantes en `lib/constants.ts` |
| 0.4 Tiempo real: Socket.IO con token en el handshake y bus de emisión | ✅ | `server/src/realtime/` |
| 0.5 Capa de streaming abstracta con proveedor simulado | ✅ | `server/src/streaming/`, `mobile/src/streaming/` |
| 0.6 App base: Expo 57, expo-router, tema, cliente API tipado, store de sesión, socket compartido | ✅ | `mobile/app/`, `mobile/src/` |
| 0.7 Pruebas de integración del servidor (HTTP + dos clientes WebSocket reales) | ✅ | `server/test/`. **Verificación:** `npm test` → 16/16 |
| 0.8 Documentación: README, arquitectura, API, streaming | ✅ | |

**Falta en la fase:** no hay linter en ningún paquete (ver 9.3). No hay CI (ver 8.4).

---

## Fase 1 — Identidad de marca ✅

| Paso | Estado | Notas |
| --- | --- | --- |
| 1.1 Nombre definitivo en carpeta, paquetes, identificador de app, canal, textos y docs | ✅ | *Livora Stream*. Slug/scheme `livora`, bundle `com.livora.app` |
| 1.2 Paleta verde neón sobre negro en `mobile/src/theme/index.ts` | ✅ | Incluye `colors.onPrimary` para texto sobre el verde (contraste > 12:1) y `scrim` para velos sobre vídeo |
| 1.3 Todos los colores escritos a mano fuera del tema recoloreados | ✅ | **Verificación:** `grep -rn "'#FFFFFF'" mobile/app mobile/src` solo devuelve el distintivo EN VIVO |
| 1.4 Logo con la letra L, generado por geometría, 7 formatos PNG + SVG | ✅ | `mobile/scripts/generate-icons.py`. Admite `LETTER = "A"` por si la marca vuelve |
| 1.5 Marca dentro de la app (acceso y cabecera del listado) | ✅ | `mobile/src/components/logo.tsx` usa `assets/logo-mark.png` |

---

## Fase 2 — Núcleo funcional v1 (con vídeo simulado) ✅

Objetivo: recorrer toda la experiencia de la app sin vídeo real. Todo lo de
esta fase está hecho y probado; las líneas **Falta** son lo que la v1 dejó
fuera a propósito.

| Paso | Estado | Notas |
| --- | --- | --- |
| 2.1 Cuentas: registro, login (correo o usuario), `me`, sesión persistente | ✅ | **Falta:** recuperar contraseña, verificación de correo, login con Google/Apple |
| 2.2 Perfiles públicos, seguir/dejar de seguir, seguidores, búsqueda, editar perfil | ✅ | Editar perfil cerrado en 9.1. **Falta:** subida de foto, hoy solo URL (8.3) |
| 2.3 Salas: crear, listar por categoría con cursor, entrar, cerrar (solo anfitrión), una sala viva por cuenta | ✅ | Historial cerrado en 9.7. **Falta:** portada subida desde el móvil, hoy solo URL (8.3) |
| 2.4 Chat en directo: mensajes, entrada de usuarios, aforo real por conexiones, likes | ✅ | **Falta:** corazones flotantes al dar like, emojis rápidos, menciones |
| 2.5 Regalos: catálogo de 8, envío con cantidad, movimiento atómico monedas → diamantes, doble asiento contable, cola de animaciones | ✅ | **Falta:** combo (x-hit) al repetir regalo, animación a pantalla completa real (hoy es un distintivo animado) |
| 2.6 Monedero: saldo, paquetes de recarga, cambio diamantes → monedas, historial | ⚠️ | **Falta:** la recarga **no cobra**. `POST /api/wallet/topup` acredita monedas sin validar recibo. Ver 6.1. Debe seguir así hasta que exista compra real |
| 2.7 Ranking de anfitriones y fans por día/semana/histórico | ✅ | Caché cerrada en 9.5 |
| 2.8 Niveles por experiencia con curva de progresión | ✅ | **Falta:** insignias o privilegios por nivel |
| 2.9 Pantallas: acceso, registro, En vivo, Explorar, Ranking, Perfil, Transmitir, Sala, Perfil público | ✅ | Guardia de navegación por estado de sesión en `app/_layout.tsx` |

**Verificación de la fase:** `npm test` (16 pruebas) y `npm run typecheck`
desde `livora-stream/`.

---

## Fase 3 — Vídeo real con LiveKit 🔄

Objetivo: que el anfitrión emita cámara y micrófono y los espectadores lo vean.
Hoy la sala pinta una superficie simulada; el contrato para sustituirla está en
[`docs/STREAMING.md`](docs/STREAMING.md).

| Paso | Estado | Notas |
| --- | --- | --- |
| 3.1 Elegir proveedor | ✅ | **LiveKit**, por decisión del usuario: la opción sin coste. Código abierto; para probar basta `livekit-server --dev` en Docker en el propio equipo. Requiere APK propia (no Expo Go), que ya produce la Fase 10 |
| 3.2 Adaptador `server/src/streaming/livekit-provider.ts` con `livekit-server-sdk`: `AccessToken` con `roomJoin`, `canPublish` solo para el anfitrión, y `url` en las credenciales | ✅ | Variables: `STREAM_PROVIDER=livekit`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Con `--dev` las claves son `devkey` / `secret` |
| 3.3 Prueba del adaptador: el token decodifica con la clave, lleva la sala y los permisos correctos por rol, respeta TTL | ✅ | `server/test/streaming.test.ts` (5) con `TokenVerifier`; sin red |
| 3.4 Renderer `mobile/src/streaming/livekit-surface.tsx` con `@livekit/react-native` (`LiveKitRoom`, `VideoTrack`), registrado en `getStreamRenderer('livekit')` | ⚠️ | Compila, tipa y `expo prebuild` lo acepta con los plugins. **Falta:** verlo funcionar con vídeo real (3.8); el `muted` del espectador aún no silencia la reproducción |
| 3.5 Permisos de cámara y micrófono; estado denegado | ⚠️ | `permissions.ts` los pide al montar la superficie como anfitrión; el manifiesto los declara (verificado en el prebuild). **Falta:** probarlo en un teléfono; no hay estado «sin cámara» |
| 3.6 Controles del anfitrión: cambiar cámara, silenciar micro, apagar cámara | ⚠️ | Columna de botones en la superficie LiveKit (`HostControls`); la sala deja pasar los toques con `pointerEvents="box-none"`. **Falta:** probarlo en un teléfono (3.8) |
| 3.7 La APK de la Fase 10 incluye los módulos nativos de LiveKit y sigue compilando en GitHub Actions | ✅ | Sustituye al EAS Build previsto: sin cuenta de Expo |
| 3.8 Prueba real: host en un dispositivo, viewer en otro, backend y `livekit-server --dev` en el equipo del usuario | ⏳ | **Criterio de hecho:** vídeo y audio llegan con menos de 2 s de retardo y el aforo cuenta bien. **Bloqueo previsible:** necesita al usuario con dos teléfonos o teléfono + emulador |

---

## Fase 4 — Vídeo chat 1 a 1 ⏳

Objetivo: la segunda función central de Kako Live: emparejar dos personas en
una llamada privada con tarifa por minuto.

| Paso | Estado | Notas |
| --- | --- | --- |
| 4.1 Modelo `Call` (llamante, receptor, inicio, fin, tarifa, monedas cobradas) | ⏳ | |
| 4.2 Cola de emparejamiento aleatorio con filtros (género, país) | ⏳ | En memoria primero; Redis cuando haya más de una instancia (8.2) |
| 4.3 Señalización por socket: `call:invite`, `call:accept`, `call:reject`, `call:end` | ⏳ | Añadir a `realtime/events.ts` en **los dos** lados |
| 4.4 Cobro por minuto: descuento periódico al llamante, abono al receptor, corte automático sin saldo | ⏳ | Reutilizar la lógica atómica de `gifts.service.ts` |
| 4.5 Pantalla de llamada: vídeo de ambos, temporizador, saldo en vivo, colgar | ⏳ | Depende de 3.4 |
| 4.6 Llamada directa desde un perfil (no aleatoria) | ⏳ | |

---

## Fase 5 — Mensajería y notificaciones ⏳

| Paso | Estado | Notas |
| --- | --- | --- |
| 5.1 Mensajes privados: modelos `Conversation` y `DirectMessage`, endpoints y eventos | ⏳ | |
| 5.2 Pantalla de bandeja y de conversación; pestaña Mensajes en la barra | ⏳ | |
| 5.3 Notificaciones push con `expo-notifications`: registro de token por dispositivo | ⏳ | |
| 5.4 Aviso a seguidores cuando un anfitrión inicia transmisión | ⏳ | Gancho en `rooms.service.createRoom` |
| 5.5 Aviso de mensaje privado y de regalo recibido fuera de la app | ⏳ | |

---

## Fase 6 — Monetización real ⏳

| Paso | Estado | Notas |
| --- | --- | --- |
| 6.1 Compras dentro de la app con validación de recibos de App Store y Google Play | ⏳ | Opciones: RevenueCat (menos código) o `expo-iap` + validación propia. **Sustituye** la recarga simulada de 2.6 |
| 6.2 Modelo de retiro para anfitriones: umbral mínimo, comisión, estado de la solicitud | ⏳ | |
| 6.3 Verificación de identidad (KYC) antes del primer retiro | ⏳ | Proveedor externo |
| 6.4 Panel de ingresos del anfitrión: diamantes por día, regalos por fan, retiros | ⏳ | |
| 6.5 Términos de la economía virtual y política de reembolsos | ⏳ | Documento legal, no código |

---

## Fase 7 — Moderación y seguridad ⏳

| Paso | Estado | Notas |
| --- | --- | --- |
| 7.1 Reportar usuario, sala o mensaje; modelo `Report` y cola de revisión | ⏳ | |
| 7.2 Baneos y expulsiones: campo `isBanned` ya existe; falta expulsar de sala, silenciar temporalmente y bloquear entre usuarios | ⏳ | |
| 7.3 Moderadores de sala nombrados por el anfitrión | ⏳ | |
| 7.4 Filtro de palabras en chat y títulos | ⏳ | |
| 7.5 Verificación de edad al registrarse (fecha de nacimiento ya está en el modelo, no se pide) | ⏳ | |
| 7.6 Límite de peticiones por IP y por usuario en la API (hoy solo hay freno en el chat) | ⏳ | `express-rate-limit` |
| 7.7 Auditoría de seguridad de la API: repaso de cada endpoint privado y de los eventos de socket | ⏳ | |

---

## Fase 8 — Producción ⏳

| Paso | Estado | Notas |
| --- | --- | --- |
| 8.1 PostgreSQL: cambiar `provider` del datasource, convertir tipos de texto en enums, migraciones con `prisma migrate` | ⏳ | El código no cambia; solo el esquema |
| 8.2 Redis como adaptador de Socket.IO para varias instancias | ⏳ | `@socket.io/redis-adapter`. Revisar `countRoomViewers`, que hoy cuenta sockets locales |
| 8.3 Almacenamiento de objetos (S3 o R2) y subida de avatar y portada desde el móvil | ⏳ | Desbloquea las **Falta** de 2.2 y 2.3 |
| 8.4 CI en GitHub Actions: `typecheck` + `test` en cada push | ⏳ | Primer paso barato y de alto valor |
| 8.5 Despliegue del servidor (Railway, Fly.io o Render) con `.env` de producción y `JWT_SECRET` real | ⏳ | |
| 8.6 EAS Build de producción y publicación en Google Play y App Store | ⏳ | Requiere cuentas de desarrollador |
| 8.7 Observabilidad: Sentry en móvil y servidor, logs estructurados | ⏳ | |

---

## Fase 9 — Deuda técnica y huecos de la v1 ⏳

Cosas conocidas que no bloquean, ordenadas por valor. **No dependen de la
decisión de 3.1**, así que son el trabajo disponible mientras esté bloqueada.

| Paso | Estado | Notas |
| --- | --- | --- |
| 9.1 Pantalla de editar perfil en el móvil (nombre, bio, país) usando `PATCH /api/users/me` | ✅ | `mobile/app/edit-profile.tsx`, modal desde la pestaña Perfil. Solo envía los campos que cambiaron. **Verificación:** `npm test` → pruebas «perfil propio» (3). **Falta:** foto por URL hasta 8.3 |
| 9.2 Pruebas en el móvil con Jest (`jest-expo`) | ✅ | 18 pruebas en `mobile/src/**/__tests__/`: `formatCount`, contraste de la paleta (protege `onPrimary`), cliente HTTP (cabeceras, errores, red) y store de sesión (restore, login, logout, monedero por socket). **Verificación:** `npm run test:mobile`. Las pantallas no tienen pruebas: se validan empaquetando |
| 9.3 ESLint + Prettier en `mobile/` (en `server/` tampoco hay linter) | ⏳ | |
| 9.4 Paquete compartido de tipos y eventos entre `server/` y `mobile/` | ⏳ | Hoy `realtime/events.ts` está duplicado a mano. Vale la pena solo si crece (Fase 4 lo hará crecer) |
| 9.5 Caché del ranking | ✅ | `lib/ttl-cache.ts` (1 min) y vaciado al enviar un regalo, así nunca se sirve un ranking anterior al último regalo. Local al proceso: revisar en 8.2. **Verificación:** prueba «caché del ranking» |
| 9.6 Corazones flotantes al dar like y combo de regalos | ⏳ | Cierra las **Falta** de 2.4 y 2.5 |
| 9.7 Historial de transmisiones en el perfil público | ✅ | `GET /api/users/:username/streams` (solo salas terminadas, con duración y pico) y sección «Transmisiones anteriores» en `app/user/[username].tsx`. **Verificación:** pruebas «historial de transmisiones» (2) |
| 9.8 Recuperación de contraseña por correo | ⏳ | Cierra parte de la **Falta** de 2.1 |

---

## Fase 10 — Pruebas en el teléfono (APK) 🔄

Objetivo: que el usuario instale cada versión en su teléfono sin cables ni
cuenta de Expo, y vea dentro de la app qué cambió.

| Paso | Estado | Notas |
| --- | --- | --- |
| 10.1 Servidor configurable en la app: pantalla «Servidor» con probar conexión, guardado persistente y reconexión del socket | ⚠️ | `mobile/app/server-settings.tsx`, `src/settings/server-url.ts`. Sin esto una APK descargada apunta a `localhost` y no sirve. **Verificación:** pruebas «servidor guardado» y «checkServer» (7). **Falta:** la pantalla existía pero era inalcanzable sin sesión, justo cuando hace falta; lo cierra 10.8 |
| 10.2 Datos de compilación y pantalla «Novedades», que se abre sola una vez tras cada build nueva y enlaza a la última APK | ✅ | `scripts/write-build-info.mjs` → `src/generated/build-info.json`; `app.config.js` fija `versionCode` = número de build para que Android acepte la actualización |
| 10.3 Workflow de GitHub Actions: pruebas de los dos paquetes → `expo prebuild` → Gradle → Release con `livora-stream.apk` | ✅ | `.github/workflows/livora-android.yml`. **Verificación:** run 2 en verde y Release `livora-build-2` con el archivo subido (149 MB), confirmado por API. **Falta:** la APK lleva los binarios de WebRTC de todas las arquitecturas; separarlas por ABI la bajaría a ~50 MB |
| 10.4 El usuario instala la APK, configura el servidor con la IP de su equipo y entra con `luna` / `livora123` | 🔄 | Primer intento (2026-09-06) fallido: no por el backend, sino por 10.8 y 10.9, ya corregidos. El repo `keider21/livora` es público, así que el enlace del Release se descarga sin sesión en GitHub. **Pendiente:** reinstalar la APK nueva y entrar |
| 10.5 Guía «Probar en el teléfono» en el README | ✅ | Descargar, permitir la instalación, configurar servidor, qué hacer si no conecta |
| 10.6 `npm start` que prepara todo e imprime la dirección para la app | ✅ | `scripts/start-server.mjs` y `iniciar-servidor.bat` para doble clic en Windows. **Verificación:** arranca el servidor y `/health`, login y salas responden |
| 10.7 Despliegue público del backend en Render (plan gratuito) | ⛔ | `render.yaml` listo y validado. **Bloqueo:** el usuario debe crear la cuenta y aplicar el Blueprint; la IA no puede crear cuentas de terceros. Al tener la URL, fijarla como `EXPO_PUBLIC_API_URL` en el workflow y recompilar: la app dejaría de necesitar configuración |
| 10.8 La pantalla «Servidor» se puede abrir sin haber iniciado sesión | ✅ | El guardia de navegación de `mobile/app/_layout.tsx` mandaba a login todo lo que estuviera fuera de `(auth)`, así que el modal se cerraba solo al abrirlo desde el botón de ajustes. Ahora `server-settings` está exento. **Verificación:** 25 pruebas móviles y `tsc` en verde; el usuario llega a escribir la IP |
| 10.9 La APK de release admite HTTP plano hacia la red local | ✅ | `mobile/plugins/with-cleartext-traffic.js`, registrado en `app.json`. Expo solo pone `usesCleartextTraffic` en el manifiesto de debug, y desde Android 9 el resto del tráfico sin cifrar se descarta: la APK instalada no podía hablar con `http://IP:4000` ni con la IP correcta. **Verificación:** `expo prebuild` genera el manifiesto con `usesCleartextTraffic="true"` |

**Falta en la fase:** la APK va firmada con la clave de depuración que genera
`expo prebuild`; sirve para probar e instalar actualizaciones encima, no para
publicar en Google Play (8.6). Las Releases no se limpian solas: con el tiempo
convendrá borrar las antiguas. Y pesa 149 MB por llevar WebRTC para todas las
arquitecturas: separarlas por ABI (`splits.abi`) la dejaría en ~50 MB.

**Tiempos medidos:** la primera compilación tardó **41 minutos** en Gradle. No es
un fallo: la nueva arquitectura de React Native genera y compila C++ desde cero
en un runner de dos núcleos. Por eso el límite del job subió a 120 minutos.

**No tocar la memoria de Gradle.** Subirla a 6 GB «porque el runner tiene 16»
fue un error: el runner estándar de GitHub tiene **7 GB**, así que el sistema se
quedó sin memoria y mató el proceso al final de la compilación («the daemon has
disappeared», código 143). Con los 2 GB por defecto funciona. Si alguna vez se
toca, medir primero y subir poco a poco.

---

## Decisiones tomadas

Registro de las decisiones que condicionan el código, con fecha, para que
nadie las deshaga sin saber por qué se tomaron.

| Fecha | Decisión | Motivo |
| --- | --- | --- |
| 2026-09-01 | El proyecto vive en `livora-stream/` dentro del repo `cecchi`, no en un repo propio | Crear repositorios devolvió `403` desde la sesión, y el borrado masivo para vaciar la rama fue bloqueado por permisos. Mover la carpeta a un repo propio es un `git subtree split` cuando el usuario lo cree |
| 2026-09-01 | App móvil con Expo, no web | Es una app móvil por naturaleza; encaja con la experiencia previa del usuario |
| 2026-09-01 | Vídeo simulado detrás de una interfaz, no Agora desde el día uno | Permite recorrer toda la app sin claves ni coste; cambiar de proveedor es un adaptador, no rehacer pantallas |
| 2026-09-01 | SQLite en desarrollo, tipos como texto en vez de enums | SQLite no soporta enums; migrar a PostgreSQL es cambiar el datasource |
| 2026-09-01 | Contrato de eventos duplicado a mano entre servidor y móvil | Evita montar un monorepo con herramientas de build por dos archivos. Se revisará en 9.4 |
| 2026-09-01 | Sin `react-native-reanimated` | No se usaba; obligaba a un `babel.config.js` propio que rompía el empaquetado. Las animaciones usan `Animated` de React Native |
| 2026-09-02 | Nombre **Livora Stream** (antes Alekey Live, antes KakoLive) | El usuario descartó los anteriores por ser muy usados. De sus dos opciones, "Livora Live" repetía el *live* que ya lleva *Livora* |
| 2026-09-02 | Paleta verde neón sobre negro con tinta oscura `onPrimary` sobre el verde | El usuario pidió verde y negro. El blanco sobre `#00E676` no llega a 2:1 de contraste |
| 2026-09-02 | Logo con la letra **L**, en tinta oscura, generado por geometría | La marca cambió de inicial. Sin fuente para que sea reproducible en cualquier máquina |
| 2026-09-02 | El distintivo EN VIVO se queda en rojo | Convención universal; en verde perdería el aviso |
| 2026-09-02 | La recarga de monedas es simulada y **debe seguir marcada como tal** | No hay pasarela. Acreditar monedas sin cobrar es aceptable en desarrollo y un agujero en producción (6.1) |
| 2026-09-05 | Proveedor de vídeo: **LiveKit** | El usuario pidió la opción sin coste. LiveKit es código abierto y se hospeda gratis (Docker en local para probar; un VPS pequeño más adelante). Agora cobra por minuto |
| 2026-09-05 | APK de pruebas con **GitHub Actions + Releases**, no con EAS Build | Gratis dentro de los minutos del repo y sin cuenta de Expo. EAS tiene cola y cupo en el plan gratuito. Firma con la clave de depuración hasta 8.6 |
| 2026-09-05 | La dirección del servidor se cambia **desde la app**, no al compilar | Una APK descargada no puede saber la IP del equipo del usuario, que además cambia con la red. `EXPO_PUBLIC_API_URL` queda como valor por defecto |

---

## Comprobaciones

Ejecutar desde `livora-stream/`. Ningún paso se marca ✅ sin pasar las que le
correspondan.

| Qué | Comando | Resultado esperado |
| --- | --- | --- |
| Pruebas de los dos paquetes | `npm test` | Servidor: `# pass 27` (o más), `# fail 0`. Móvil: `Tests: 25 passed` (o más) |
| Plugins nativos | `cd mobile && npx expo prebuild --platform android --no-install` | Termina en `Finished prebuild` y el manifiesto declara `CAMERA` y `RECORD_AUDIO` |
| APK publicada | Acciones → «Livora Stream · APK de pruebas» | Run en verde y una Release nueva `livora-build-N` con `livora-stream.apk` |
| Solo servidor / solo móvil | `npm run test:server` / `npm run test:mobile` | Ídem |
| Tipos en los dos paquetes | `npm run typecheck` | Sin salida de errores |
| La app empaqueta | `cd mobile && npx expo export --platform android --output-dir /tmp/livora-export` | Termina en `Exported:` |
| Sin restos de marcas anteriores | `grep -ril "kako\|alekey" . --exclude-dir=node_modules --exclude-dir=.expo` | Sin resultados |
| Blancos solo donde toca | `grep -rn "'#FFFFFF'" mobile/app mobile/src` | Solo las tres líneas del distintivo EN VIVO en `ui.tsx` |
| Iconos regenerables | `cd mobile && python3 scripts/generate-icons.py` | Escribe 7 PNG y `logo.svg` |
| Seed | `npm run seed --prefix server` | `5 usuarios, 3 salas, 8 regalos` |

---

## Cómo mantener este plan

Reglas para la IA (y para cualquiera) al trabajar en el proyecto:

1. **Antes de tocar código**, leer la tabla [Estado actual](#estado-actual) y
   el paso marcado 🔄 o el primero ⏳ de la fase actual. Si hay un ⛔ y el
   usuario no lo ha resuelto, trabajar en la Fase 9 y decirlo.
2. **Al empezar un paso**, marcarlo 🔄. Solo un paso 🔄 a la vez.
3. **Al terminar un paso**, ejecutar las comprobaciones que le correspondan,
   marcarlo ✅, y si quedó algo fuera escribirlo en su línea **Falta**. Un paso
   con cosas pendientes que sí funcionan se marca ⚠️, no ✅.
4. **Al descubrir que un paso "hecho" no lo estaba**, no borrarlo: cambiar su
   estado, anotar qué faltaba en **Falta** y crear el paso que lo cierre.
5. **Cada decisión que condicione el código** (una librería, un proveedor, un
   nombre, algo que se descarta a propósito) va a [Decisiones](#decisiones-tomadas)
   con fecha y motivo.
6. **Actualizar la tabla Estado actual** al final de cada sesión de trabajo:
   fase, paso, fecha, último commit y salud.
7. **Commit y push** de este archivo junto con el código que describe; nunca
   dejarlo desincronizado del repo.
8. **No enmascarar códigos de salida**: `comando | head && echo OK` imprime OK
   aunque `comando` falle, porque el código que se evalúa es el de `head`.
   Verificar con `comando; echo "exit=$?"` o `${PIPESTATUS[0]}`. (Lección del
   2026-09-05: un `tsc` con errores pasó por limpio durante un paso.)
9. **Verificar el índice antes de confirmar**: `git status --porcelain` no debe
   mostrar cambios sin indexar de los archivos del paso. Comprobar el remoto
   tras el push. (Lección del 2026-09-02: un `git add` con rutas inexistentes
   aborta sin indexar nada, y con el `stderr` silenciado pasó desapercibido.)
10. **Rutas absolutas** en comandos que cambien de carpeta. (Lección del
   2026-09-01: un `cd ../server` relativo apuntó al ERP que convive en el repo.)

### Cómo informar al usuario

Al terminar una sesión, decir en una frase: fase y paso en el que queda el
proyecto, qué se cerró, qué quedó en **Falta** y qué decisión, si alguna,
necesita el usuario para continuar.
