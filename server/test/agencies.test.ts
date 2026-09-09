import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { prisma } from '../src/lib/prisma';
import { GIFT_CATALOG } from '../src/lib/gift-catalog';
import { COMISION_MAXIMA } from '../src/modules/agencies/agencies.service';
import { startTestApi, uniqueName, type TestApi } from './helpers';

let api: TestApi;

before(async () => {
  api = await startTestApi();

  // Un regalo sin premio, para que la comisión salga de una cifra redonda.
  await prisma.gift.upsert({
    where: { code: 'agency-plain' },
    create: {
      code: 'agency-plain',
      name: 'Simple de agencia',
      emoji: '🎁',
      priceCoins: 1_000,
      tier: 'basic',
      animation: 'float',
      luckyChance: 0,
      luckyMultipliers: '',
    },
    update: { priceCoins: 1_000, isActive: true, luckyChance: 0, luckyMultipliers: '' },
  });
});

after(async () => {
  await api.close();
  await prisma.$disconnect();
});

async function crearUsuario(coins = 0) {
  const username = uniqueName('ag');
  const { data } = await api.request('POST', '/api/auth/register', {
    body: {
      email: `${username}@test.local`,
      username,
      password: 'contrasena123',
      displayName: `Usuario ${username}`,
    },
  });
  if (coins) await prisma.user.update({ where: { id: data.user.id }, data: { coins } });
  return { token: data.token as string, id: data.user.id as string, username };
}

describe('agencias', () => {
  it('se crea con su código y un anfitrión se une con él', async () => {
    const dueño = await crearUsuario();
    const { status, data } = await api.request('POST', '/api/agencies', {
      token: dueño.token,
      body: { name: 'Agencia Prueba' },
    });

    assert.equal(status, 201);
    assert.equal(data.agencia.rate, 0.1, 'la comisión por defecto');
    assert.match(data.agencia.code, /^[A-Z2-9]{6}$/, 'el código evita letras que se confunden');

    const anfitrion = await crearUsuario();
    const unido = await api.request('POST', '/api/agencies/join', {
      token: anfitrion.token,
      body: { code: data.agencia.code },
    });
    assert.equal(unido.status, 200);

    const mia = await api.request('GET', '/api/agencies/mine', { token: anfitrion.token });
    assert.equal(mia.data.agencia.name, 'Agencia Prueba');
  });

  it('la comisión sale del margen de la casa, no del anfitrión', async () => {
    // Es lo que hace que a un anfitrión le compense entrar en una agencia: cobra
    // exactamente lo mismo que si no estuviera en ninguna.
    const dueño = await crearUsuario();
    const { data: creada } = await api.request('POST', '/api/agencies', {
      token: dueño.token,
      body: { name: 'Agencia Margen' },
    });

    const anfitrion = await crearUsuario();
    await api.request('POST', '/api/agencies/join', {
      token: anfitrion.token,
      body: { code: creada.agencia.code },
    });

    const sala = await api.request('POST', '/api/rooms', {
      token: anfitrion.token,
      body: { title: 'Sala con agencia' },
    });

    const fan = await crearUsuario(50_000);
    const { status } = await api.request('POST', '/api/gifts/send', {
      token: fan.token,
      body: { roomId: sala.data.room.id, giftCode: 'agency-plain', quantity: 10 },
    });
    assert.equal(status, 201);

    // 10.000 monedas al 5% son 500 diamantes para el anfitrión, y el 10% de eso,
    // 50, para la agencia. El anfitrión conserva sus 500 enteros.
    const host = await prisma.user.findUniqueOrThrow({ where: { id: anfitrion.id } });
    const jefe = await prisma.user.findUniqueOrThrow({ where: { id: dueño.id } });
    assert.equal(host.diamonds, 500, 'el anfitrión cobra lo mismo que sin agencia');
    assert.equal(jefe.diamonds, 50, 'y la agencia cobra aparte');
  });

  it('el panel dice quién generó cuánto', async () => {
    const dueño = await crearUsuario();
    const { data: creada } = await api.request('POST', '/api/agencies', {
      token: dueño.token,
      body: { name: 'Agencia Panel' },
    });

    const anfitrion = await crearUsuario();
    await api.request('POST', '/api/agencies/join', {
      token: anfitrion.token,
      body: { code: creada.agencia.code },
    });
    const sala = await api.request('POST', '/api/rooms', {
      token: anfitrion.token,
      body: { title: 'Sala panel' },
    });
    const fan = await crearUsuario(50_000);
    await api.request('POST', '/api/gifts/send', {
      token: fan.token,
      body: { roomId: sala.data.room.id, giftCode: 'agency-plain', quantity: 5 },
    });

    const { data } = await api.request('GET', '/api/agencies/me', { token: dueño.token });
    assert.equal(data.hosts.length, 1);
    assert.equal(data.hosts[0].generado, 250, 'lo que ganó el anfitrión');
    assert.equal(data.hosts[0].comision, 25, 'y lo que se llevó la agencia');
    assert.equal(data.agencia.cobrado, 25);
  });

  it('no se puede estar en dos agencias a la vez ni en la propia', async () => {
    const dueño = await crearUsuario();
    const { data: creada } = await api.request('POST', '/api/agencies', {
      token: dueño.token,
      body: { name: 'Agencia Una' },
    });

    const propia = await api.request('POST', '/api/agencies/join', {
      token: dueño.token,
      body: { code: creada.agencia.code },
    });
    assert.equal(propia.status, 400, 'el dueño no es anfitrión de sí mismo');

    const otroDueño = await crearUsuario();
    const { data: segunda } = await api.request('POST', '/api/agencies', {
      token: otroDueño.token,
      body: { name: 'Agencia Dos' },
    });

    const anfitrion = await crearUsuario();
    await api.request('POST', '/api/agencies/join', {
      token: anfitrion.token,
      body: { code: creada.agencia.code },
    });
    const repetido = await api.request('POST', '/api/agencies/join', {
      token: anfitrion.token,
      body: { code: segunda.agencia.code },
    });
    assert.equal(repetido.status, 409, 'hay que salir de la primera');

    await api.request('POST', '/api/agencies/leave', { token: anfitrion.token });
    const otraVez = await api.request('POST', '/api/agencies/join', {
      token: anfitrion.token,
      body: { code: segunda.agencia.code },
    });
    assert.equal(otraVez.status, 200);
  });

  it('la comisión no puede pasarse de lo que la casa puede cubrir', async () => {
    // Los anfitriones ya se llevan cerca del 40% de cada moneda consumida. Una
    // comisión desbocada encima de eso deja a la casa sin con qué pagar el resto.
    const dueño = await crearUsuario();
    const { status } = await api.request('POST', '/api/agencies', {
      token: dueño.token,
      body: { name: 'Agencia Avara', rate: COMISION_MAXIMA + 0.1 },
    });
    assert.equal(status, 400);
  });

  it('sin agencia no se cobra comisión de nadie', async () => {
    const anfitrion = await crearUsuario();
    const sala = await api.request('POST', '/api/rooms', {
      token: anfitrion.token,
      body: { title: 'Sala sin agencia' },
    });
    const fan = await crearUsuario(50_000);
    await api.request('POST', '/api/gifts/send', {
      token: fan.token,
      body: { roomId: sala.data.room.id, giftCode: 'agency-plain', quantity: 3 },
    });

    const pagos = await prisma.agencyPayout.count({ where: { hostId: anfitrion.id } });
    assert.equal(pagos, 0);
    assert.ok(GIFT_CATALOG.length > 0, 'el catálogo sigue cargando');
  });
});
