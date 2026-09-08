import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { prisma } from '../src/lib/prisma';
import { expectedReturn, parseMultipliers, rollLucky } from '../src/lib/lucky';
import { MULTIPLICADOR_RACHA, hayRacha, ventanasDe } from '../src/lib/lucky-window';
import { factorSuerte } from '../src/lib/lucky-mood';
import { GIFT_CATALOG } from '../src/lib/gift-catalog';
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
  // por la racha global y por la suerte personal de quien envía, que puede bajar
  // hasta 0,2. Con `luckyChance: 1` este regalo dejaría de premiar siempre y la
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
    const esperado: Record<string, number> = {
      rose: 0.8, heart: 0.8, beer: 0.8, crown: 0.8, fireworks: 0.8,
      ferrari: 0.7, yacht: 0.7, castle: 0.7,
    };

    for (const gift of GIFT_CATALOG) {
      const retorno = expectedReturn(gift.luckyChance, gift.luckyMultipliers);
      const previsto = esperado[gift.code] ?? 0;
      assert.equal(
        Number(retorno.toFixed(1)),
        previsto,
        `${gift.code} devuelve ${retorno.toFixed(2)} y estaba documentado ${previsto}`,
      );
    }
  });

  it('el premio más pequeño es ×10, como se pidió', () => {
    for (const gift of GIFT_CATALOG) {
      if (!gift.luckyChance) continue;
      const menor = Math.min(...parseMultipliers(gift.luckyMultipliers).map((m) => m.multiplier));
      assert.ok(menor >= 10, `${gift.code} puede premiar con ×${menor}, por debajo del mínimo`);
    }
  });
});

describe('rachas de suerte', () => {
  it('hay cuatro por hora y no se solapan', () => {
    for (const hora of [0, 12345, 480_000]) {
      const ventanas = ventanasDe(hora);
      assert.equal(ventanas.length, 4);

      for (let i = 1; i < ventanas.length; i += 1) {
        assert.ok(
          ventanas[i]!.inicio >= ventanas[i - 1]!.fin,
          `la ventana ${i} empieza antes de que acabe la anterior`,
        );
      }
    }
  });

  it('duran entre dos y tres minutos y caben en la hora', () => {
    for (const ventana of ventanasDe(987_654)) {
      const duracion = ventana.fin - ventana.inicio;
      assert.ok(duracion >= 2 && duracion <= 3, `dura ${duracion} minutos`);
      assert.ok(ventana.fin <= 60, 'se sale de la hora');
    }
  });

  it('la misma hora da siempre las mismas ventanas', () => {
    // Se calculan de la hora, no se guardan: así un reinicio del servidor no
    // cambia lo que estaba pasando ni hacen falta temporizadores.
    assert.deepEqual(ventanasDe(555_555), ventanasDe(555_555));
    assert.notDeepEqual(ventanasDe(555_555), ventanasDe(555_556));
  });

  it('ocupan alrededor del 17% del tiempo', () => {
    // Es el dato del que depende el retorno medio: si subiera, la economía
    // dejaría de cerrar aunque la probabilidad base no cambiara.
    let conRacha = 0;
    const muestras = 60 * 24;
    const inicio = Date.UTC(2026, 0, 1);

    for (let minuto = 0; minuto < muestras; minuto += 1) {
      if (hayRacha(new Date(inicio + minuto * 60_000))) conRacha += 1;
    }

    const proporcion = conRacha / muestras;
    assert.ok(proporcion > 0.13 && proporcion < 0.21, `salió ${(proporcion * 100).toFixed(1)}%`);
  });

  it('el retorno medio de cada regalo, contando las rachas, sigue por debajo de 1', () => {
    // La probabilidad base está pegada a su techo, así que esta es la prueba
    // que avisa si un retoque del catálogo saca la economía de cuadre.
    for (const gift of GIFT_CATALOG) {
      if (!gift.luckyChance) continue;
      const base = expectedReturn(gift.luckyChance, gift.luckyMultipliers);
      const medio = base * (1 - 0.17) + base * MULTIPLICADOR_RACHA * 0.17;
      assert.ok(medio < 1, `${gift.code} devuelve ${medio.toFixed(2)} de media contando rachas`);
    }
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
        suma += factorSuerte(`user${usuario}`, new Date(INICIO + paso * 45_000));
        muestras += 1;
      }
    }

    const media = suma / muestras;
    assert.ok(media > 0.97 && media < 1.03, `la media salió ${media.toFixed(3)}`);
  });

  it('se mueve entre 0,2 y 1,8', () => {
    for (let paso = 0; paso < 500; paso += 1) {
      const factor = factorSuerte('luna', new Date(INICIO + paso * 20_000));
      assert.ok(factor >= 0.2 && factor <= 1.8, `salió ${factor}`);
    }
  });

  it('sube y baja despacio, sin saltos secos', () => {
    // La curva se interpola entre tramos de minuto y medio: en un segundo la
    // suerte no puede pasar de fría a caliente.
    let anterior = factorSuerte('luna', new Date(INICIO));
    for (let segundo = 1; segundo < 300; segundo += 1) {
      const actual = factorSuerte('luna', new Date(INICIO + segundo * 1000));
      assert.ok(Math.abs(actual - anterior) < 0.05, `saltó ${Math.abs(actual - anterior).toFixed(3)}`);
      anterior = actual;
    }
  });

  it('cada cuenta lleva la suya, y siempre la misma', () => {
    const momento = new Date(INICIO + 7 * 60_000);
    assert.equal(factorSuerte('luna', momento), factorSuerte('luna', momento));
    assert.notEqual(factorSuerte('luna', momento), factorSuerte('dani', momento));
  });

  it('una cuenta caliente en racha global recupera más del triple', () => {
    // Es el momento que hace que la mecánica enganche: la suerte personal en su
    // máximo y la racha global a la vez.
    const base = expectedReturn(0.015, '10:900,20:64,50:64,500:99');
    assert.ok(base * 1.8 * MULTIPLICADOR_RACHA > 3, 'el mejor momento debería pasar de ×3');
    assert.ok(base * 0.2 < 0.2, 'el peor momento debería devolver muy poco');
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
