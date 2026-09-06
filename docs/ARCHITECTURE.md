# Arquitectura

## Vista general

```
mobile/ (Expo, React Native)
   │  REST  ──────────────►  server/  (Express)
   │  WebSocket ──────────►  server/  (Socket.IO)
   │                            │
   │                            ├── Prisma ──► SQLite (dev) / PostgreSQL (prod)
   └── StreamRenderer           └── StreamProvider ──► mock | Agora | LiveKit
```

Dos canales conviven a propósito:

- **REST** para lo transaccional: cuentas, salas, regalos, monedero. Todo lo que
  debe tener una respuesta clara de éxito o error.
- **WebSocket** para lo efímero y de alta frecuencia: chat, aforo, likes y el
  aviso de que llegó un regalo.

El envío de un regalo usa los dos: el cobro va por REST (necesita confirmación) y
el resultado se difunde a la sala por socket.

## Backend

```
server/src/
  config/env.ts        Variables de entorno validadas al arrancar
  lib/                 Utilidades transversales (JWT, errores, niveles, Prisma)
  middleware/          Autenticación, validación con Zod, manejo de errores
  modules/             Un módulo por dominio: routes → service → Prisma
    auth/ users/ rooms/ gifts/ wallet/ ranking/
  realtime/            Contrato de eventos, servidor de sockets y bus de emisión
  streaming/           Interfaz StreamProvider y proveedor simulado
  scripts/seed.ts      Datos de ejemplo
```

Decisiones que conviene conocer:

**Rutas finas, servicios gordos.** Las rutas solo validan y responden; toda la
lógica vive en los servicios, que no conocen Express. Por eso el mismo
`postMessage` lo usan un endpoint REST y el manejador del socket.

**El bus de sockets rompe la dependencia circular.** `realtime/bus.ts` guarda la
instancia de Socket.IO y expone `emitToRoom` y `emitToUser`. Los servicios emiten
eventos sin importar cómo se creó el servidor, y el módulo de sockets puede
llamar a los servicios sin ciclos.

**El aforo se calcula, no se acumula.** `syncViewerCount` cuenta las conexiones
reales en el canal de Socket.IO y escribe ese número. Un contador incremental se
desincroniza en cuanto una app se cierra de golpe; contar las conexiones vivas no.

**El dinero se mueve en una transacción.** `sendGift` descuenta monedas, acredita
diamantes, crea el registro del regalo y ambos asientos contables dentro de un
único `prisma.$transaction`. O pasa todo, o no pasa nada.

**SQLite sin enums.** Los campos de tipo (`status`, `category`, `type`) son texto
con constantes en `lib/constants.ts`. Al migrar a PostgreSQL pueden convertirse
en enums nativos sin tocar la lógica.

## App móvil

```
mobile/
  app/                 Rutas (expo-router: el archivo es la ruta)
    _layout.tsx        Providers y guardia de sesión
    (auth)/            Login y registro
    (tabs)/            En vivo, Explorar, Ranking, Perfil
    room/[id].tsx      Sala en directo
    go-live.tsx        Abrir transmisión (modal)
    user/[username]    Perfil público
  src/
    api/               Cliente HTTP tipado, un objeto por dominio
    realtime/          Espejo de los eventos del servidor y socket compartido
    store/             Estado global con Zustand (solo sesión y monedero)
    streaming/         StreamRenderer y superficie simulada
    components/        Piezas reutilizables de interfaz
    theme/             Colores, espaciados y tipografía
```

**Estado global mínimo.** Solo la sesión vive en Zustand, porque la necesitan la
guardia de navegación, la cabecera y el selector de regalos a la vez. Cada
pantalla carga sus propios datos con `useFocusEffect`, así que volver de una sala
refresca el listado sin caché que invalidar.

**Un socket para toda la app.** Se abre al iniciar sesión y se reutiliza. Las
pantallas se suscriben a los eventos que necesitan y se dan de baja al salir; el
monedero de la cabecera se actualiza solo porque el store escucha
`wallet:updated`.

**Los regalos se encolan.** Dos regalos seguidos no se pisan: el segundo espera a
que termine la animación del primero.

## Contrato de eventos

`server/src/realtime/events.ts` y `mobile/src/realtime/events.ts` son espejos.
No hay paquete compartido para no montar un monorepo con herramientas de build
por dos archivos; el precio es recordar cambiar los dos a la vez, y ambos lo
avisan en su cabecera.

## Qué cambiaría al escalar

- **PostgreSQL** en lugar de SQLite: cambiar el `provider` del datasource.
- **Redis** como adaptador de Socket.IO, para repartir las salas entre varias
  instancias del servidor.
- **Almacenamiento de objetos** para portadas y avatares, hoy son URLs externas.
- **Cola de trabajos** para el ranking, que ahora se agrega en cada petición.
