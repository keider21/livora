# Livora Stream

Aplicación de **live streaming social**: transmisiones en directo, chat en
tiempo real, regalos virtuales con economía de monedas y diamantes, seguidores,
niveles y rankings.

El proyecto son dos piezas:

| Carpeta   | Qué es                                                              |
| --------- | ------------------------------------------------------------------- |
| `server/` | API REST + servidor WebSocket (Node, Express, Prisma, Socket.IO)     |
| `mobile/` | App móvil (Expo SDK 57, React Native, expo-router, TypeScript)       |

## Qué funciona hoy

- **Cuentas**: registro, inicio de sesión con JWT, sesión persistente en el móvil.
- **Transmisiones**: crear una sala, listarla por categoría, entrar, salir y cerrarla.
- **Chat en vivo**: mensajes por WebSocket con freno anti-spam y contador de aforo real.
- **Regalos**: catálogo de 8 regalos, envío con animación, movimiento atómico de
  monedas a diamantes y registro contable de cada movimiento.
- **Economía**: monedero, paquetes de recarga (compra simulada), cambio de
  diamantes a monedas e historial de transacciones.
- **Social**: seguir y dejar de seguir, perfiles públicos, búsqueda de usuarios.
- **Ranking**: mejores anfitriones y mejores fans por día, semana o histórico.
- **Niveles**: experiencia por gasto en regalos con curva de progresión.

## Vídeo: capa simulada, con LiveKit como proveedor elegido

Esta versión **no envía vídeo real**. Todo el flujo de streaming pasa por una
interfaz (`StreamProvider` en el servidor, `StreamRenderer` en el móvil) con una
implementación simulada que emite tokens firmados y pinta una superficie animada
en el lugar exacto donde iría la cámara.

Eso permite recorrer la app completa sin claves ni costes de minutos de vídeo.
El proveedor elegido es **LiveKit** (código abierto, se hospeda gratis); su
integración es la Fase 3 del [plan](PLAN.md). El contrato está en
[`docs/STREAMING.md`](docs/STREAMING.md).

## Puesta en marcha

Requisitos: Node 20 o superior, y la app **Expo Go** en el móvil (o un emulador).

```bash
# 1. Dependencias, base de datos y datos de ejemplo
npm run setup

# 2. Backend (http://localhost:4000)
npm run dev:server

# 3. En otra terminal, la app
npm run dev:mobile
```

Escanea el código QR con Expo Go. Si usas un móvil físico, pon la IP de tu equipo
en `mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.50:4000
```

En el emulador de Android no hace falta: la app traduce `localhost` a `10.0.2.2`
automáticamente.

## Poner el servidor en marcha

La app necesita hablar con el backend. Hay dos formas:

**A. En tu equipo** (rápido, pero solo con el PC encendido y en la misma Wi-Fi).
En Windows, doble clic en `iniciar-servidor.bat`. En Mac o Linux, `npm start`
desde esta carpeta. Instala lo que falte, prepara la base de datos y termina
imprimiendo la dirección exacta que hay que escribir en la app.

**B. En internet, gratis** (recomendado: la app funciona desde cualquier sitio,
también con datos móviles, sin depender de tu PC). El archivo
[`render.yaml`](render.yaml) describe el servicio; en Render basta con
New → Blueprint → este repositorio → Apply. Sus propias instrucciones están
dentro del archivo.

## Probar en el teléfono (APK)

Cada push que toca `livora-stream/` compila una APK en GitHub Actions y la
publica como Release. No hace falta cable, Expo Go ni cuenta de Expo.

1. En el navegador del teléfono, con sesión iniciada en GitHub (el repo es
   privado), abre la última versión:
   `https://github.com/keider21/cecchi/releases/latest/download/livora-stream.apk`
2. Ábrela y acepta instalar desde esa fuente. Las versiones nuevas se instalan
   encima y conservan la sesión.
3. En tu equipo, dentro de `livora-stream/`, un solo comando:

   ```bash
   npm start
   ```

   Instala lo que falte, crea la base de datos con datos de prueba, arranca el
   servidor y **te imprime la dirección exacta** que hay que escribir en la app.

4. En la app, toca el engranaje de la pantalla de acceso (o **Perfil →
   Servidor**), escribe la dirección que imprimió el paso anterior, pulsa
   **Probar conexión** y luego **Guardar y usar**. El teléfono y el equipo
   deben estar en la misma red Wi-Fi.

Al abrir una versión nueva, la app muestra **Novedades** con la lista de
cambios de esa compilación; también está en **Perfil → Novedades**, con el
botón para descargar la última APK.

Si «Probar conexión» falla: comprueba que el servidor esté arriba, que el
puerto 4000 no esté bloqueado por el cortafuegos del equipo, y que no estés en
una red de invitados que aísle los dispositivos.

### Cuentas de prueba

El seed crea cinco usuarios con la contraseña `livora123`: `luna`, `dani`,
`sofi`, `marco` y `keider`. Tres de ellos ya están transmitiendo.

Para verlo todo funcionando, entra con dos cuentas a la vez (por ejemplo Expo Go
en el móvil y otra sesión en el emulador): una transmite y la otra envía regalos.

## Pruebas

```bash
npm test
```

Corre las dos baterías. En el servidor, 22 pruebas de integración sobre una
base SQLite aparte: autenticación, ciclo de vida de las salas, permisos,
economía de regalos, seguidores, edición de perfil, historial, caché del
ranking, tokens de streaming, curva de niveles y difusión de eventos por
WebSocket entre dos clientes reales. En el móvil, 18 pruebas unitarias con Jest:
formato de cifras, contraste de la paleta, cliente HTTP y store de sesión.

`npm run test:server` y `npm run test:mobile` las ejecutan por separado.

## Marca

Nombre **Livora Stream**, paleta **verde neón sobre negro** y la letra **L** como
logo.

Los colores viven en un único sitio, `mobile/src/theme/index.ts`:

| Color                       | Uso                                   |
| --------------------------- | ------------------------------------- |
| `#050A07` → `#152219`       | Fondos, de negro verdoso a superficie |
| `#00E676` → `#A8FF3E`       | Degradado de marca: verde neón a lima |
| `#04160D` (`onPrimary`)     | Texto e iconos **encima** del verde   |
| `#FFD24A` / `#5EE7FF`       | Monedas y diamantes                   |
| `#FF3355`                   | Distintivo EN VIVO                    |

Ese `onPrimary` no es un capricho: el verde de marca es tan claro que el texto
blanco encima no llega ni a 2:1 de contraste. Todo lo que va sobre el degradado
—botones, chips activos, la cabecera del perfil— usa esa tinta casi negra, que
pasa de 12:1.

El logo tampoco es una imagen suelta: `mobile/scripts/generate-icons.py` dibuja
la L por geometría, sin depender de ninguna fuente. Para regenerar todos los
formatos:

```bash
pip install pillow
cd mobile && python3 scripts/generate-icons.py
```

Eso escribe en `mobile/assets/`: el icono de la tienda, el splash, el favicon,
las tres capas del icono adaptativo de Android, la marca que usa la app por
dentro (`logo-mark.png`) y una versión vectorial (`logo.svg`) para web o
material impreso. Todos salen de las mismas fórmulas, así que retocar el logo es
cambiar un número y volver a ejecutar el script. La constante `LETTER` del
script permite cambiar de letra sin tocar nada más.

## Documentación

- [`PLAN.md`](PLAN.md) — **léelo primero**: fases, paso actual, qué falta en cada uno y cómo actualizarlo.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — cómo está organizado y por qué.
- [`docs/API.md`](docs/API.md) — todos los endpoints y eventos de socket.
- [`docs/STREAMING.md`](docs/STREAMING.md) — cómo conectar Agora o LiveKit.

## Antes de producción

Esto es una versión 1 funcional, no un producto lanzable. Falta, como mínimo:

- Vídeo real (adaptador de Agora o LiveKit) y permisos de cámara y micrófono.
- Validación de compras contra los recibos de App Store y Google Play: hoy
  `POST /api/wallet/topup` acredita monedas sin cobrar nada.
- Moderación: reportes, baneos, filtro de contenido y grabación para revisión.
- PostgreSQL en lugar de SQLite y Redis como adaptador de Socket.IO para escalar
  a más de una instancia.
- Mensajería privada, notificaciones push y verificación de edad.
