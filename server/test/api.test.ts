import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { prisma } from '../src/lib/prisma';
import { MockStreamProvider } from '../src/streaming/mock-provider';
import { rankingCacheStats } from '../src/modules/ranking/ranking.service';
import { levelFromXp, xpForLevel } from '../src/lib/levels';
import { startTestApi, uniqueName, type TestApi } from './helpers';

let api: TestApi;

before(async () => {
  api = await startTestApi();
  // La rosa del catálogo real premia una de cada tres veces. Aquí se fija sin
  // premio: si no, el saldo del emisor dependería del azar y esta prueba
  // fallaría de vez en cuando. El sorteo tiene sus propias pruebas.
  await prisma.gift.upsert({
    where: { code: 'rose' },
    create: {
      code: 'rose',
      name: 'Rosa',
      emoji: '🌹',
      priceCoins: 10,
      tier: 'basic',
      animation: 'float',
      luckyChance: 0,
      luckyMultipliers: '',
    },
    update: { priceCoins: 10, isActive: true, luckyChance: 0, luckyMultipliers: '' },
  });
});

after(async () => {
  await api.close();
  await prisma.$disconnect();
});

async function createUser() {
  const username = uniqueName('user');
  const { status, data } = await api.request('POST', '/api/auth/register', {
    body: {
      email: `${username}@test.local`,
      username,
      password: 'contrasena123',
      displayName: 'Usuario Prueba',
    },
  });
  assert.equal(status, 201);
  return { username, token: data.token as string, user: data.user };
}

describe('salud del servicio', () => {
  it('responde en /health', async () => {
    const { status, data } = await api.request('GET', '/health');
    assert.equal(status, 200);
    assert.equal(data.status, 'ok');
  });
});

describe('autenticación', () => {
  it('registra, inicia sesión y devuelve el perfil propio', async () => {
    const { username, token } = await createUser();

    const login = await api.request('POST', '/api/auth/login', {
      body: { identifier: username, password: 'contrasena123' },
    });
    assert.equal(login.status, 200);
    assert.ok(login.data.token);

    const me = await api.request('GET', '/api/auth/me', { token });
    assert.equal(me.status, 200);
    assert.equal(me.data.user.username, username);
    assert.equal(me.data.user.coins, 500, 'la cuenta nueva recibe monedas de bienvenida');
  });

  it('rechaza credenciales incorrectas', async () => {
    const { username } = await createUser();
    const { status } = await api.request('POST', '/api/auth/login', {
      body: { identifier: username, password: 'incorrecta' },
    });
    assert.equal(status, 401);
  });

  it('rechaza usuarios duplicados', async () => {
    const { username } = await createUser();
    const { status } = await api.request('POST', '/api/auth/register', {
      body: {
        email: `otro-${username}@test.local`,
        username,
        password: 'contrasena123',
        displayName: 'Duplicado',
      },
    });
    assert.equal(status, 409);
  });

  it('exige token en las rutas privadas', async () => {
    const { status } = await api.request('GET', '/api/wallet');
    assert.equal(status, 401);
  });
});

describe('transmisiones', () => {
  it('crea una sala, la lista y la cierra', async () => {
    const host = await createUser();

    const created = await api.request('POST', '/api/rooms', {
      token: host.token,
      body: { title: 'Mi primera transmisión', category: 'chat' },
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.room.status, 'live');
    assert.ok(created.data.credentials.token, 'el anfitrión recibe credenciales de vídeo');
    assert.equal(created.data.credentials.role, 'host');

    const roomId = created.data.room.id as string;

    const list = await api.request('GET', '/api/rooms?status=live&limit=50');
    assert.equal(list.status, 200);
    assert.ok(list.data.rooms.some((room: { id: string }) => room.id === roomId));

    const viewer = await createUser();
    const join = await api.request('POST', `/api/rooms/${roomId}/join`, { token: viewer.token });
    assert.equal(join.status, 200);
    assert.equal(join.data.role, 'viewer');

    const message = await api.request('POST', `/api/rooms/${roomId}/messages`, {
      token: viewer.token,
      body: { body: '¡Hola a todos!' },
    });
    assert.equal(message.status, 201);
    assert.equal(message.data.message.body, '¡Hola a todos!');

    const ended = await api.request('POST', `/api/rooms/${roomId}/end`, { token: host.token });
    assert.equal(ended.status, 200);

    const joinClosed = await api.request('POST', `/api/rooms/${roomId}/join`, { token: viewer.token });
    assert.equal(joinClosed.status, 409, 'no se puede entrar a una transmisión terminada');
  });

  it('solo el anfitrión puede terminar la transmisión', async () => {
    const host = await createUser();
    const other = await createUser();
    const created = await api.request('POST', '/api/rooms', {
      token: host.token,
      body: { title: 'Sala protegida' },
    });

    const { status } = await api.request('POST', `/api/rooms/${created.data.room.id}/end`, {
      token: other.token,
    });
    assert.equal(status, 403);
  });
});

describe('economía y regalos', () => {
  it('mueve monedas del emisor a diamantes del anfitrión', async () => {
    const host = await createUser();
    const fan = await createUser();

    const created = await api.request('POST', '/api/rooms', {
      token: host.token,
      body: { title: 'Sala de regalos' },
    });
    const roomId = created.data.room.id as string;

    const sent = await api.request('POST', '/api/gifts/send', {
      token: fan.token,
      body: { roomId, giftCode: 'rose', quantity: 3 },
    });
    assert.equal(sent.status, 201);
    assert.equal(sent.data.giftSend.coinsSpent, 30);
    // El anfitrión cobra el 5% en diamantes: 30 × 0,05 = 1,5, redondeado a 2.
    assert.equal(sent.data.giftSend.diamondsEarned, 2);
    assert.equal(sent.data.wallet.coins, 470, '500 de bienvenida menos 30 gastadas');

    const hostWallet = await api.request('GET', '/api/wallet', { token: host.token });
    assert.equal(hostWallet.data.wallet.diamonds, 2);

    const ranking = await api.request('GET', '/api/ranking/hosts?period=day');
    assert.ok(
      ranking.data.entries.some((entry: { user: { username: string } }) => entry.user.username === host.username),
      'el anfitrión aparece en el ranking',
    );
  });

  it('bloquea el regalo si no hay monedas suficientes', async () => {
    const host = await createUser();
    const fan = await createUser();
    const created = await api.request('POST', '/api/rooms', {
      token: host.token,
      body: { title: 'Sala cara' },
    });

    const { status } = await api.request('POST', '/api/gifts/send', {
      token: fan.token,
      body: { roomId: created.data.room.id, giftCode: 'rose', quantity: 999 },
    });
    assert.equal(status, 402);
  });

  it('recarga monedas y convierte diamantes', async () => {
    const user = await createUser();

    const topup = await api.request('POST', '/api/wallet/topup', {
      token: user.token,
      body: { packageId: 'popular' },
    });
    assert.equal(topup.status, 200);
    assert.equal(topup.data.credited, 52_500, '50.000 monedas más 2.500 de bonus');
    assert.equal(topup.data.wallet.coins, 53_000, '500 de bienvenida más la recarga');

    const noDiamonds = await api.request('POST', '/api/wallet/exchange', {
      token: user.token,
      body: { diamonds: 10 },
    });
    assert.equal(noDiamonds.status, 402);
  });
});

describe('seguimiento de usuarios', () => {
  it('sigue y deja de seguir', async () => {
    const a = await createUser();
    const b = await createUser();

    const follow = await api.request('POST', `/api/users/${b.username}/follow`, { token: a.token });
    assert.equal(follow.status, 200);
    assert.equal(follow.data.followers, 1);

    const profile = await api.request('GET', `/api/users/${b.username}`, { token: a.token });
    assert.equal(profile.data.isFollowing, true);

    const unfollow = await api.request('DELETE', `/api/users/${b.username}/follow`, { token: a.token });
    assert.equal(unfollow.data.followers, 0);
  });

  it('no permite seguirse a uno mismo', async () => {
    const a = await createUser();
    const { status } = await api.request('POST', `/api/users/${a.username}/follow`, { token: a.token });
    assert.equal(status, 400);
  });
});

describe('historial de transmisiones', () => {
  it('lista solo las salas terminadas del anfitrión, con duración y pico', async () => {
    const host = await createUser();

    const first = await api.request('POST', '/api/rooms', { token: host.token, body: { title: 'Primera' } });
    await api.request('POST', `/api/rooms/${first.data.room.id}/end`, { token: host.token });

    // Esta segunda sala sigue en vivo y no debe aparecer en el historial.
    await api.request('POST', '/api/rooms', { token: host.token, body: { title: 'Segunda, en vivo' } });

    const { status, data } = await api.request('GET', `/api/users/${host.username}/streams`);
    assert.equal(status, 200);
    assert.equal(data.streams.length, 1);
    assert.equal(data.streams[0].title, 'Primera');
    assert.ok(data.streams[0].endedAt, 'la sala terminada tiene fecha de fin');
    assert.ok(data.streams[0].durationSeconds >= 0);
    assert.equal(typeof data.streams[0].peakViewers, 'number');
  });

  it('devuelve 404 para un usuario inexistente', async () => {
    const { status } = await api.request('GET', '/api/users/nadie-con-este-nombre/streams');
    assert.equal(status, 404);
  });
});

describe('caché del ranking', () => {
  it('sirve lecturas repetidas desde memoria y se vacía al enviar un regalo', async () => {
    const host = await createUser();
    const fan = await createUser();
    const created = await api.request('POST', '/api/rooms', { token: host.token, body: { title: 'Sala ranking' } });
    const roomId = created.data.room.id as string;

    // Dos lecturas seguidas: la segunda no debe recalcular.
    await api.request('GET', '/api/ranking/hosts?period=all');
    const before = rankingCacheStats();
    await api.request('GET', '/api/ranking/hosts?period=all');
    const after = rankingCacheStats();
    assert.equal(after.hits, before.hits + 1, 'la segunda lectura fue un acierto de caché');
    assert.equal(after.misses, before.misses, 'la segunda lectura no recalculó');

    // Un regalo invalida: la siguiente lectura recalcula y ya incluye al anfitrión.
    const sent = await api.request('POST', '/api/gifts/send', {
      token: fan.token,
      body: { roomId, giftCode: 'rose', quantity: 1 },
    });
    assert.equal(sent.status, 201);

    const ranking = await api.request('GET', '/api/ranking/hosts?period=all');
    assert.equal(rankingCacheStats().misses, after.misses + 1, 'tras el regalo se recalculó');

    // El ranking se queda con los veinte primeros, y los archivos de prueba
    // corren en paralelo sobre la misma base: buscar aquí a un anfitrión con un
    // solo regalo depende de lo que estén haciendo los demás, no de esta
    // prueba. Lo que sí se comprueba es que lo recalculado es un ranking
    // válido y que el regalo llegó a su destinatario.
    const puntuaciones = ranking.data.entries.map((entry: { score: number }) => entry.score);
    assert.deepEqual(puntuaciones, [...puntuaciones].sort((a: number, b: number) => b - a));

    const anfitrion = await prisma.user.findUniqueOrThrow({ where: { id: host.user.id } });
    assert.ok(anfitrion.diamonds > 0, 'el regalo dejó diamantes al anfitrión');
  });
});

describe('perfil propio', () => {
  it('edita nombre, bio y país, y el cambio se ve en el perfil público', async () => {
    const user = await createUser();

    const updated = await api.request('PATCH', '/api/users/me', {
      token: user.token,
      body: { displayName: 'Nombre Nuevo', bio: 'Canto los martes', country: 'CO' },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.user.displayName, 'Nombre Nuevo');

    const profile = await api.request('GET', `/api/users/${user.username}`);
    assert.equal(profile.data.user.bio, 'Canto los martes');
    assert.equal(profile.data.user.country, 'CO');
  });

  it('sube una foto y la deja puesta', async () => {
    // Un PNG de un píxel: lo que se comprueba es el camino entero —llega en
    // base64, se guarda con nombre de hash y el perfil sale ya con la ruta—, no
    // la imagen.
    const user = await createUser();
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const { status, data } = await api.request('POST', '/api/users/me/avatar', {
      token: user.token,
      body: { image: png },
    });

    assert.equal(status, 200);
    assert.match(data.user.avatarUrl, /^\/uploads\/avatar-.+\.png$/);

    const perfil = await api.request('GET', `/api/users/${user.username}`);
    assert.equal(perfil.data.user.avatarUrl, data.user.avatarUrl, 'y queda guardada');
  });

  it('rechaza lo que no sea una imagen', async () => {
    const user = await createUser();
    const { status } = await api.request('POST', '/api/users/me/avatar', {
      token: user.token,
      body: { image: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' },
    });
    assert.equal(status, 400, 'solo JPG, PNG o WebP');
  });

  it('rechaza un país que no sea código de 2 letras y señala el campo', async () => {
    const user = await createUser();
    const { status, data } = await api.request('PATCH', '/api/users/me', {
      token: user.token,
      body: { country: 'Colombia' },
    });
    assert.equal(status, 400);
    assert.ok(
      data.error.details.some((item: { field: string }) => item.field === 'country'),
      'el detalle del error apunta al campo country',
    );
  });

  it('exige sesión para editar', async () => {
    const { status } = await api.request('PATCH', '/api/users/me', { body: { bio: 'x' } });
    assert.equal(status, 401);
  });
});

describe('capa de streaming', () => {
  it('el proveedor simulado emite tokens verificables', async () => {
    const provider = new MockStreamProvider();
    const channel = await provider.createChannel('sala-1');
    const credentials = await provider.issueToken({ channel, identity: 'u1', role: 'host' });

    assert.equal(credentials.provider, 'mock');
    assert.ok(credentials.expiresAt > Date.now());
    assert.equal(provider.verify(credentials.token), true);
    assert.equal(provider.verify('mock.aaa.bbb'), false);
  });
});

describe('curva de niveles', () => {
  it('sube de nivel al acumular experiencia', () => {
    assert.equal(levelFromXp(0), 1);
    assert.equal(levelFromXp(xpForLevel(2)), 2);
    assert.equal(levelFromXp(xpForLevel(5) - 1), 4);
  });
});
