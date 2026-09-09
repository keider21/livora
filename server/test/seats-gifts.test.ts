import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { prisma } from '../src/lib/prisma';
import { expectedReturn, parseMultipliers, rollLucky } from '../src/lib/lucky';
import { factorSuerte } from '../src/lib/lucky-mood';
import { GIFT_CATALOG, SIN_ILUSTRACION } from '../src/lib/gift-catalog';
import { NIVELES } from '../src/lib/salary';
import { DIAMONDS_PER_COIN } from '../src/lib/constants';
import { startTestApi, uniqueName, type TestApi } from './helpers';

let api: TestApi;

before(async () => {
  api = await startTestApi();
  // Un regalo barato sin premio y otro que siempre premia: con la probabilidad
  // fijada a 1 el sorteo deja de ser azar y la prueba es determinista.
  await prisma.gift.upsert({
    where: { code: 'test-simple' },
    create: {
      code: 'test-simple',
      name: 'Simple',
      emoji: '🎁',
      priceCoins: 10,
      tier: 'basic',
      animation: 'float',
    },
    update: { priceCoins: 10, isActive: true, luckyChance: 0, luckyMultipliers: '' },
  });
  // La probabilidad va muy por encima de 1 a propósito: al sortear se multiplica
  // por la suerte personal de quien envía, que puede bajar hasta 0,2. Con `luckyChance: 1` este regalo dejaría de premiar siempre y la
  // prueba de economía fallaría de vez en cuando, sin que nada estuviera roto.
  await prisma.gift.upsert({
    where: { code: 'test-lucky' },
    create: {
      code: 'test-lucky',
      name: 'Premiado',
      emoji: '🍀',
      priceCoins: 100,
      tier: 'rare',
      animation: 'burst',
      luckyChance: 5,
      luckyMultipliers: '2',
    },
    update: { priceCoins: 100, isActive: true, luckyChance: 5, luckyMultipliers: '2' },
  });

  // El cofre de bronce tal cual está en el catálogo: los archivos de prueba
  // corren en procesos aparte y este no puede dar por hecho que otro ya sembró.
  const bronce = GIFT_CATALOG.find((gift) => gift.code === 'chest-bronze')!;
  await prisma.gift.upsert({
    where: { code: bronce.code },
    create: bronce,
    update: bronce,
  });
});

after(async () => {
  await api.close();
  await prisma.$disconnect();
});

async function createUser(coins = 5000) {
  const username = uniqueName('seat');
  const { status, data } = await api.request('POST', '/api/auth/register', {
    body: {
      email: `${username}@test.local`,
      username,
      password: 'contrasena123',
      displayName: `Usuario ${username}`,
    },
  });
  assert.equal(status, 201);
  await prisma.user.update({ where: { id: data.user.id }, data: { coins } });
  return { token: data.token as string, id: data.user.id as string, username };
}

async function openRoom(token: string) {
  const { status, data } = await api.request('POST', '/api/rooms', {
    token,
    body: { title: 'Sala de prueba', category: 'chat' },
  });
  assert.equal(status, 201);
  return data.room.id as string;
}

describe('sorteo de los regalos con premio', () => {
  it('no devuelve nada cuando el regalo no tiene premio', () => {
    assert.deepEqual(rollLucky(100, 1, 0, ''), { multiplier: null, coins: 0, wins: 0, times: 0 });
    assert.deepEqual(rollLucky(100, 1, 0.5, ''), { multiplier: null, coins: 0, wins: 0, times: 0 });
  });

  it('devuelve el precio de la unidad por el multiplicador cuando toca', () => {
    // El primer random decide si toca, el segundo elige multiplicador.
    const roll = rollLucky(200, 1, 0.5, '3,7', () => 0);
    assert.equal(roll.multiplier, 3);
    assert.equal(roll.coins, 600);
    assert.equal(roll.wins, 1);
  });

  it('sortea una vez por unidad y suma los premios', () => {
    // Con probabilidad 1 premian las 50 unidades: 50 × 10 × 2.
    const roll = rollLucky(10, 50, 1, '2', () => 0);
    assert.equal(roll.wins, 50);
    assert.equal(roll.coins, 1000);
    // El número grande de pantalla: 50 aciertos de ×2 son «×100».
    assert.equal(roll.times, 100);
  });

  it('las veces se suman entre sí: dos aciertos de ×500 son 1000', () => {
    const secuencia = [0, 0.999, 0, 0.999];
    let i = 0;
    const roll = rollLucky(20, 2, 1, '2:99,500:1', () => secuencia[i++] ?? 0);
    assert.equal(roll.wins, 2);
    assert.equal(roll.times, 1000, 'lo que se enseña es la suma, no el mejor');
    assert.equal(roll.coins, 20000, '20 monedas × 500, dos veces');
  });

  it('el multiplicador que informa es el mayor que salió', () => {
    // Dos tiradas por unidad: la primera decide si toca, la segunda elige
    // multiplicador. Aquí toca en las dos unidades, la primera saca ×3 y la
    // segunda ×7.
    const secuencia = [0, 0, 0, 0.9];
    let i = 0;
    const roll = rollLucky(100, 2, 1, '3,7', () => secuencia[i++] ?? 0);
    assert.equal(roll.wins, 2);
    assert.equal(roll.multiplier, 7, 'informa el mejor premio del paquete');
    assert.equal(roll.coins, 1000, '300 de la primera más 700 de la segunda');
  });

  it('no premia si el azar queda por encima de la probabilidad', () => {
    const roll = rollLucky(200, 1, 0.1, '3,7', () => 0.9);
    assert.equal(roll.multiplier, null);
    assert.equal(roll.coins, 0);
  });

  it('ignora multiplicadores mal escritos', () => {
    assert.deepEqual(parseMultipliers('2, x, -3, 5'), [
      { multiplier: 2, weight: 1 },
      { multiplier: 5, weight: 1 },
    ]);
  });

  it('respeta los pesos: el premio gordo sale mucho menos', () => {
    // Con estos pesos el ×500 ocupa el último 1% del rango, así que solo sale
    // cuando el segundo número del sorteo cae ahí arriba.
    const raro = '2:99,500:1';
    assert.equal(rollLucky(10, 1, 1, raro, () => 0).multiplier, 2, 'lo normal es el ×2');

    const secuencia = [0, 0.995];
    let i = 0;
    assert.equal(rollLucky(10, 1, 1, raro, () => secuencia[i++] ?? 0).multiplier, 500);
  });

  it('la media ponderada baja el retorno esperado', () => {
    // Sin pesos, 2 y 500 darían una media de 251; con el 500 al 1%, es 6,98.
    assert.equal(expectedReturn(1, '2,500').toFixed(0), '251');
    assert.equal(expectedReturn(1, '2:99,500:1').toFixed(2), '6.98');
  });

  /**
   * El retorno pasó de 1 el 2026-09-07 por decisión del usuario: premio en un
   * 33% de los envíos con un mínimo de ×10. Esas dos cifras juntas fuerzan un
   * retorno de 4 como poco, así que las monedas dejan de ser escasas.
   *
   * La prueba ya no exige que sea menor que 1; fija los valores acordados para
   * que un retoque del catálogo no los mueva sin querer.
   */
  it('el retorno de cada regalo es el documentado', () => {
    // El retorno baja con el precio: el barato mantiene la sensación de que casi
    // siempre vuelve algo, y el caro se paga de verdad. Se comparan las cifras
    // exactas, no redondeadas: ahora el catálogo declara el retorno y lo que se
    // calcula es la probabilidad, así que cualquier desvío es un error real.
    const esperado: Record<string, number> = {
      clap: 0.85, wink: 0.85, star: 0.85, candy: 0.85, rose: 0.85, heart: 0.85, beer: 0.85,
      crown: 0.78, fireworks: 0.78,
      ferrari: 0.7, yacht: 0.65, castle: 0.58,
    };

    for (const gift of GIFT_CATALOG) {
      if (gift.tier === 'chest') continue;
      const retorno = expectedReturn(gift.luckyChance, gift.luckyMultipliers);
      const previsto = esperado[gift.code] ?? 0;
      assert.ok(
        Math.abs(retorno - previsto) < 0.005,
        `${gift.code} devuelve ${retorno.toFixed(3)} y estaba documentado ${previsto}`,
      );
    }
  });

  it('todos los regalos de la caja llevan ilustración menos los del club', () => {
    // El nombre de `image` es la clave con la que el teléfono busca el archivo
    // en `gift-art.ts`. Si se añade un regalo y se olvida, la casilla cae al
    // emoji sin avisar de nada, así que se comprueba aquí.
    for (const gift of GIFT_CATALOG) {
      if (gift.minFanLevel > 0 || SIN_ILUSTRACION.has(gift.code)) continue;
      assert.ok(gift.image, `${gift.code} no tiene ilustración`);
    }
  });

  it('el chat dice cuánto salió, sumando el paquete entero', async () => {
    // La animación pasa y el chat se queda: es donde se puede volver a mirar lo
    // que tocó. En un paquete de varias unidades va la suma, no cada acierto.
    const anfitrion = await createUser();
    const sala = await openRoom(anfitrion.token);
    const emisor = await createUser(100_000);

    await api.request('POST', '/api/gifts/send', {
      token: emisor.token,
      body: { roomId: sala, giftCode: 'test-lucky', quantity: 5 },
    });

    const mensaje = await prisma.message.findFirst({
      where: { roomId: sala, type: 'gift' },
      orderBy: { createdAt: 'desc' },
    });
    // `test-lucky` premia siempre y multiplica por 2: 5 unidades de 100 son 1000.
    // En español los millares solo se separan a partir de cinco cifras, así que
    // aquí va sin punto.
    assert.match(mensaje!.body, /5× Premiado/);
    assert.match(mensaje!.body, /🪙 1000/);
  });

  it('acepta hasta 9.999 unidades en un envío', async () => {
    // Mandar más unidades por envío es lo único que acelera de verdad el
    // automático: la espera entre envíos ya no pinta nada frente al viaje de
    // ida y vuelta.
    const anfitrion = await createUser();
    const sala = await openRoom(anfitrion.token);
    const emisor = await createUser(200_000);

    const grande = await api.request('POST', '/api/gifts/send', {
      token: emisor.token,
      body: { roomId: sala, giftCode: 'test-simple', quantity: 9_999 },
    });
    assert.equal(grande.status, 201);
    assert.equal(grande.data.giftSend.quantity, 9_999);

    const pasado = await api.request('POST', '/api/gifts/send', {
      token: emisor.token,
      body: { roomId: sala, giftCode: 'test-simple', quantity: 10_000 },
    });
    assert.equal(pasado.status, 400, 'y ahí se para');
  });

  it('el premio más pequeño es ×10, como se pidió', () => {
    for (const gift of GIFT_CATALOG) {
      // Los cofres empiezan en ×3: no son un premio sorpresa sobre el precio,
      // son el propio regalo, y su escalera se lee entera en «Detalles».
      if (!gift.luckyChance || gift.tier === 'chest') continue;
      const menor = Math.min(...parseMultipliers(gift.luckyMultipliers).map((m) => m.multiplier));
      assert.ok(menor >= 10, `${gift.code} puede premiar con ×${menor}, por debajo del mínimo`);
    }
  });
});

describe('economía de los regalos', () => {
  it('cuanto más caro el regalo, menos devuelve', () => {
    // Con el mismo retorno para todos, el castillo devolvía más de lo invertido:
    // 9.999 monedas de golpe hacen que cada acierto suelte una montaña, y la
    // sesión acababa en pérdida para la plataforma.
    const conPremio = GIFT_CATALOG.filter((gift) => gift.luckyChance > 0 && gift.tier !== 'chest').sort(
      (a, b) => a.priceCoins - b.priceCoins,
    );

    for (let i = 1; i < conPremio.length; i += 1) {
      const barato = expectedReturn(conPremio[i - 1]!.luckyChance, conPremio[i - 1]!.luckyMultipliers);
      const caro = expectedReturn(conPremio[i]!.luckyChance, conPremio[i]!.luckyMultipliers);
      assert.ok(caro <= barato + 1e-9, `${conPremio[i]!.code} devuelve más que ${conPremio[i - 1]!.code}`);
    }

    const castillo = conPremio.at(-1)!;
    const rosa = conPremio.find((gift) => gift.code === 'rose')!;
    assert.ok(
      expectedReturn(castillo.luckyChance, castillo.luckyMultipliers) <
        expectedReturn(rosa.luckyChance, rosa.luckyMultipliers) * 0.8,
      'el más caro tiene que quedar claramente por debajo del más barato',
    );
  });

  it('el retorno de cada regalo está por debajo de 1', () => {
    // La suerte personal se reparte alrededor de 1, así que el retorno del
    // catálogo es el del conjunto: esta es la prueba que avisa si un retoque
    // saca la economía de cuadre.
    for (const gift of GIFT_CATALOG) {
      // El cofre queda fuera: lo que le sale no vuelve a quien lo envía, se lo
      // queda quien lo recibe. Ahí no se fabrican monedas, cambian de manos.
      if (!gift.luckyChance || gift.tier === 'chest') continue;
      const retorno = expectedReturn(gift.luckyChance, gift.luckyMultipliers);
      assert.ok(retorno < 1, `${gift.code} devuelve ${retorno.toFixed(2)} de media`);
    }
  });

  it('los cofres siempre premian, y de tres a cinco veces lo que cuestan', () => {
    const cofres = GIFT_CATALOG.filter((gift) => gift.tier === 'chest');
    assert.equal(cofres.length, 3);

    for (const cofre of cofres) {
      assert.equal(cofre.luckyChance, 1, `${cofre.code} no premia siempre`);

      const escalones = parseMultipliers(cofre.luckyMultipliers);
      const pesos = escalones.reduce((total, e) => total + e.weight, 0);
      const media = escalones.reduce((total, e) => total + e.weight * e.multiplier, 0) / pesos;

      // Es el coste real de la mecánica: el anfitrión recibe esa cifra en valor
      // de regalo, y con ella su 5% en diamantes y su avance hacia la meta.
      //
      // A ×11 los dos primeros niveles del salario se pagan a pérdida, y está
      // decidido así: son baratos de subvencionar y el cofre tiene que sentirse
      // generoso. Lo que sí se vigila es que la subvención no se extienda a los
      // niveles de arriba, que son los que mueven dinero de verdad: del 3 en
      // adelante llenar la meta con cofres tiene que seguir saliendo a cuenta.
      const nivelesQueDebenCubrirse = NIVELES.filter((nivel) => nivel.nivel >= 3);
      const tope = Math.min(
        ...nivelesQueDebenCubrirse.map((n) => 1 / (n.salario / n.meta + DIAMONDS_PER_COIN)),
      );
      assert.ok(media > 3 && media < tope, `${cofre.code} entrega ×${media.toFixed(2)} y el tope es ×${tope.toFixed(2)}`);

      const menor = Math.min(...escalones.map((e) => e.multiplier));
      assert.ok(menor >= 3, `${cofre.code} puede quedarse en ×${menor}`);

      // Diez cofres seguidos sin pasar del segundo peldaño es lo que hace que
      // el cofre deje de tener gracia, y ya pasó una vez.
      const altos = escalones.filter((e) => e.multiplier >= 10).reduce((t, e) => t + e.weight, 0) / pesos;
      assert.ok(altos > 0.5, `${cofre.code} solo sube de ×10 el ${(altos * 100).toFixed(1)}% de las veces`);
    }
  });

  it('el cofre no le devuelve nada a quien lo manda', async () => {
    // Es la diferencia con el regalo de la suerte: aquí no se juega el saldo,
    // se le regala a otro algo más grande de lo que costó.
    const anfitrion = await createUser();
    const sala = await openRoom(anfitrion.token);
    const emisor = await createUser(50_000);

    const { status, data } = await api.request('POST', '/api/gifts/send', {
      token: emisor.token,
      body: { roomId: sala, giftCode: 'chest-bronze', quantity: 1 },
    });

    assert.equal(status, 201);
    assert.equal(data.wallet.coins, 49_000, 'solo se cobra el precio del cofre');
    assert.ok(data.giftSend.coinsRewarded >= 3_000, 'y explota siempre');
    assert.equal(
      data.giftSend.diamondsEarned,
      Math.round(data.giftSend.coinsRewarded * 0.05),
      'los diamantes del anfitrión salen de lo que explotó, no del precio',
    );
  });
});

describe('suerte personal', () => {
  const INICIO = Date.UTC(2026, 0, 1);

  it('de media vale 1, así que no mueve el retorno a largo plazo', () => {
    // Es lo que permite añadir variación sin descuadrar la economía: unos
    // ganan más y otros menos, pero el conjunto no cambia.
    let suma = 0;
    let muestras = 0;

    for (let usuario = 0; usuario < 300; usuario += 1) {
      for (let paso = 0; paso < 120; paso += 1) {
        suma += factorSuerte(`user${usuario}`, new Date(INICIO + paso * 17_000));
        muestras += 1;
      }
    }

    const media = suma / muestras;
    assert.ok(media > 0.97 && media < 1.03, `la media salió ${media.toFixed(3)}`);
  });

  it('se mueve entre 0,7 y 1,67', () => {
    for (let paso = 0; paso < 500; paso += 1) {
      const factor = factorSuerte('luna', new Date(INICIO + paso * 7_000));
      assert.ok(factor >= 0.7 && factor <= 1.67, `salió ${factor}`);
    }
  });

  it('el rato bueno dura unos diez segundos', () => {
    // Es el motivo de montar la curva con dos ondas. Si el tramo caliente
    // durase lo que el tramo entero se podría jugar sobre seguro: se nota que
    // premia, se dispara el automático y se para antes de que enfríe.
    let rachas = 0;
    let segundos = 0;

    for (let cuenta = 0; cuenta < 200; cuenta += 1) {
      let seguidos = 0;
      for (let segundo = 0; segundo < 600; segundo += 1) {
        if (factorSuerte(`user${cuenta}`, new Date(INICIO + segundo * 1_000)) > 1.4) {
          seguidos += 1;
        } else if (seguidos > 0) {
          rachas += 1;
          segundos += seguidos;
          seguidos = 0;
        }
      }
    }

    const duracion = segundos / rachas;
    assert.ok(duracion > 7 && duracion < 14, `las rachas calientes duran ${duracion.toFixed(1)} s`);
  });

  it('sube y baja en curva, sin saltos secos', () => {
    // Se interpola entre tramos de veinticinco y de doce segundos: en un segundo
    // la suerte no puede pasar de fría a caliente.
    let anterior = factorSuerte('luna', new Date(INICIO));
    for (let segundo = 1; segundo < 300; segundo += 1) {
      const actual = factorSuerte('luna', new Date(INICIO + segundo * 1000));
      assert.ok(Math.abs(actual - anterior) < 0.12, `saltó ${Math.abs(actual - anterior).toFixed(3)}`);
      anterior = actual;
    }
  });

  it('cada cuenta lleva la suya, y siempre la misma', () => {
    const momento = new Date(INICIO + 7 * 60_000);
    assert.equal(factorSuerte('luna', momento), factorSuerte('luna', momento));
    assert.notEqual(factorSuerte('luna', momento), factorSuerte('dani', momento));
  });

  it('separa mucho el mejor momento del peor', () => {
    // Es lo que hace que la mecánica enganche: rachas buenas de verdad y malas
    // de verdad, en vez de que todos acaben siempre en la media.
    const base = expectedReturn(0.0182, '10:950,20:80,50:64,500:85');
    assert.ok(base * 1.67 > 1.3, 'en caliente debería devolver más de lo gastado');
    assert.ok(base * 1.67 < 1.6, 'pero no tanto como para que compense cronometrar la racha');
    assert.ok(base * 0.7 < 0.65, 'en frío debería devolver bastante menos');
  });
});

describe('regalos con destinatario', () => {
  it('sin destinatario van al anfitrión, como siempre', async () => {
    const host = await createUser();
    const viewer = await createUser();
    const roomId = await openRoom(host.token);

    const { status, data } = await api.request('POST', '/api/gifts/send', {
      token: viewer.token,
      body: { roomId, giftCode: 'test-simple', quantity: 2 },
    });

    assert.equal(status, 201);
    assert.equal(data.giftSend.recipient.id, host.id);
    assert.equal(data.giftSend.coinsSpent, 20);
    assert.equal(data.wallet.coins, 4980);
  });

  it('el premio devuelve monedas al emisor en el mismo movimiento', async () => {
    const host = await createUser();
    const viewer = await createUser();
    const roomId = await openRoom(host.token);

    const { status, data } = await api.request('POST', '/api/gifts/send', {
      token: viewer.token,
      body: { roomId, giftCode: 'test-lucky', quantity: 1 },
    });

    assert.equal(status, 201);
    assert.equal(data.giftSend.coinsSpent, 100);
    assert.equal(data.giftSend.coinsRewarded, 200);
    assert.equal(data.giftSend.luckyMultiplier, 2);
    // Gasta 100 y recupera 200: sube 100 respecto a las 5000 iniciales.
    assert.equal(data.wallet.coins, 5100);

    const movimientos = await prisma.transaction.findMany({
      where: { userId: viewer.id, reference: data.giftSend.id },
      orderBy: { amount: 'asc' },
    });
    assert.deepEqual(
      movimientos.map((m) => [m.type, m.amount]),
      [
        ['gift_sent', -100],
        ['gift_reward', 200],
      ],
    );
  });

  it('el evento lleva la ilustración del regalo, no solo el emoji', async () => {
    const host = await createUser();
    const viewer = await createUser();
    const roomId = await openRoom(host.token);

    await prisma.gift.update({ where: { code: 'test-simple' }, data: { image: 'lion-imperial' } });

    const { data } = await api.request('POST', '/api/gifts/send', {
      token: viewer.token,
      body: { roomId, giftCode: 'test-simple' },
    });

    // Sin este campo la app no sabe que hay ilustración y dibuja el emoji.
    assert.equal(data.giftSend.gift.image, 'lion-imperial');

    await prisma.gift.update({ where: { code: 'test-simple' }, data: { image: null } });
  });

  it('rechaza regalar a alguien que no está en la transmisión', async () => {
    const host = await createUser();
    const viewer = await createUser();
    const extraño = await createUser();
    const roomId = await openRoom(host.token);

    const { status, data } = await api.request('POST', '/api/gifts/send', {
      token: viewer.token,
      body: { roomId, giftCode: 'test-simple', recipientIds: [extraño.id] },
    });

    assert.equal(status, 400);
    assert.match(data.error.message, /no está en la transmisión/);
  });

  it('uno se puede regalar a sí mismo: las monedas pasan a diamantes propios', async () => {
    const host = await createUser();
    const roomId = await openRoom(host.token);

    const { status, data } = await api.request('POST', '/api/gifts/send', {
      token: host.token,
      body: { roomId, giftCode: 'test-simple', recipientIds: [host.id] },
    });

    assert.equal(status, 201);
    assert.equal(data.giftSend.recipient.id, host.id);
    assert.equal(data.wallet.coins, 4990, 'gasta 10 de las 5000');

    const yo = await prisma.user.findUnique({ where: { id: host.id } });
    assert.equal(yo?.diamonds, 1, '10 monedas al 5% redondean a 1 diamante');
  });

  it('se puede regalar a varias personas a la vez y se cobra por cada una', async () => {
    const host = await createUser();
    const guest = await createUser();
    const fan = await createUser();
    const roomId = await openRoom(host.token);

    await api.request('POST', `/api/rooms/${roomId}/seats/request`, { token: guest.token });
    await api.request('POST', `/api/rooms/${roomId}/seats/${guest.id}/accept`, { token: host.token });

    const { status, data } = await api.request('POST', '/api/gifts/send', {
      token: fan.token,
      // El propio emisor entra en la lista junto al anfitrión y al invitado.
      body: { roomId, giftCode: 'test-simple', quantity: 2, recipientIds: [host.id, guest.id, fan.id] },
    });

    assert.equal(status, 201);
    assert.equal(data.giftSends.length, 3);
    // 10 monedas × 2 unidades × 3 destinatarios.
    assert.equal(data.wallet.coins, 4940);
    assert.deepEqual(
      data.giftSends.map((g: { recipient: { id: string } }) => g.recipient.id).sort(),
      [host.id, guest.id, fan.id].sort(),
    );
  });
});

describe('invitados en la tira lateral', () => {
  it('pedir subir, que te acepten y recibir un regalo estando arriba', async () => {
    const host = await createUser();
    const guest = await createUser();
    const viewer = await createUser();
    const roomId = await openRoom(host.token);

    const pedido = await api.request('POST', `/api/rooms/${roomId}/seats/request`, { token: guest.token });
    assert.equal(pedido.status, 201);
    assert.equal(pedido.data.pending.length, 1);
    assert.equal(pedido.data.seats.length, 0);

    const aceptado = await api.request('POST', `/api/rooms/${roomId}/seats/${guest.id}/accept`, {
      token: host.token,
    });
    assert.equal(aceptado.status, 200);
    assert.equal(aceptado.data.seats.length, 1);
    assert.equal(aceptado.data.seats[0].position, 1);
    // El invitado recibe credenciales para publicar voz.
    assert.equal(aceptado.data.credentials.role, 'guest');

    // Ya arriba, puede recibir regalos como el anfitrión.
    const regalo = await api.request('POST', '/api/gifts/send', {
      token: viewer.token,
      body: { roomId, giftCode: 'test-simple', recipientIds: [guest.id] },
    });
    assert.equal(regalo.status, 201);
    assert.equal(regalo.data.giftSend.recipient.id, guest.id);

    // 10 monedas al 5% son 0,5 diamantes, que se redondean a 1.
    const invitado = await prisma.user.findUnique({ where: { id: guest.id } });
    assert.equal(invitado?.diamonds, 1);
  });

  it('el anfitrión puede regalar a su invitado', async () => {
    const host = await createUser();
    const guest = await createUser();
    const roomId = await openRoom(host.token);

    await api.request('POST', `/api/rooms/${roomId}/seats/request`, { token: guest.token });
    await api.request('POST', `/api/rooms/${roomId}/seats/${guest.id}/accept`, { token: host.token });

    const { status, data } = await api.request('POST', '/api/gifts/send', {
      token: host.token,
      body: { roomId, giftCode: 'test-simple', recipientIds: [guest.id] },
    });

    assert.equal(status, 201);
    assert.equal(data.giftSend.sender.id, host.id);
    assert.equal(data.giftSend.recipient.id, guest.id);
  });

  it('solo el anfitrión sube invitados', async () => {
    const host = await createUser();
    const guest = await createUser();
    const otro = await createUser();
    const roomId = await openRoom(host.token);

    await api.request('POST', `/api/rooms/${roomId}/seats/request`, { token: guest.token });
    const { status } = await api.request('POST', `/api/rooms/${roomId}/seats/${guest.id}/accept`, {
      token: otro.token,
    });

    assert.equal(status, 403);
  });

  it('el invitado se puede bajar solo, y el anfitrión puede bajarlo', async () => {
    const host = await createUser();
    const guest = await createUser();
    const roomId = await openRoom(host.token);

    await api.request('POST', `/api/rooms/${roomId}/seats/request`, { token: guest.token });
    await api.request('POST', `/api/rooms/${roomId}/seats/${guest.id}/accept`, { token: host.token });

    const bajada = await api.request('DELETE', `/api/rooms/${roomId}/seats/${guest.id}`, {
      token: guest.token,
    });
    assert.equal(bajada.status, 200);
    assert.equal(bajada.data.seats.length, 0);

    // Y al bajarse deja de poder recibir regalos.
    const regalo = await api.request('POST', '/api/gifts/send', {
      token: host.token,
      body: { roomId, giftCode: 'test-simple', recipientIds: [guest.id] },
    });
    assert.equal(regalo.status, 400);
  });

  it('los huecos se reutilizan al quedar libres', async () => {
    const host = await createUser();
    const primero = await createUser();
    const segundo = await createUser();
    const roomId = await openRoom(host.token);

    for (const invitado of [primero, segundo]) {
      await api.request('POST', `/api/rooms/${roomId}/seats/request`, { token: invitado.token });
      await api.request('POST', `/api/rooms/${roomId}/seats/${invitado.id}/accept`, { token: host.token });
    }

    await api.request('DELETE', `/api/rooms/${roomId}/seats/${primero.id}`, { token: host.token });

    const tercero = await createUser();
    await api.request('POST', `/api/rooms/${roomId}/seats/request`, { token: tercero.token });
    const { data } = await api.request('POST', `/api/rooms/${roomId}/seats/${tercero.id}/accept`, {
      token: host.token,
    });

    // El hueco 1 quedó libre al bajarse el primero, así que lo ocupa el tercero.
    const posiciones = data.seats.map((seat: { userId: string; position: number }) => [seat.userId, seat.position]);
    assert.deepEqual(posiciones.sort(), [[segundo.id, 2], [tercero.id, 1]].sort());
  });

  it('al cerrar la transmisión no queda nadie arriba', async () => {
    const host = await createUser();
    const guest = await createUser();
    const roomId = await openRoom(host.token);

    await api.request('POST', `/api/rooms/${roomId}/seats/request`, { token: guest.token });
    await api.request('POST', `/api/rooms/${roomId}/seats/${guest.id}/accept`, { token: host.token });
    await api.request('POST', `/api/rooms/${roomId}/end`, { token: host.token });

    const restantes = await prisma.roomSeat.count({ where: { roomId } });
    assert.equal(restantes, 0);
  });
});
