import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { prisma } from '../src/lib/prisma';
import { expectedReturn, parseMultipliers, rollLucky } from '../src/lib/lucky';
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
  await prisma.gift.upsert({
    where: { code: 'test-lucky' },
    create: {
      code: 'test-lucky',
      name: 'Premiado',
      emoji: '🍀',
      priceCoins: 100,
      tier: 'rare',
      animation: 'burst',
      luckyChance: 1,
      luckyMultipliers: '2',
    },
    update: { priceCoins: 100, isActive: true, luckyChance: 1, luckyMultipliers: '2' },
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

  it('ningún regalo del catálogo es rentable de enviar', () => {
    for (const gift of GIFT_CATALOG) {
      const retorno = expectedReturn(gift.luckyChance, gift.luckyMultipliers);
      assert.ok(
        retorno < 1,
        `${gift.code} devuelve ${retorno.toFixed(2)} de media: enviarlo saldría rentable`,
      );
    }
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
