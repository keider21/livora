import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { prisma } from '../src/lib/prisma';
import { NIVELES, diaDe, limitesDelDia, nivelPara, siguienteNivel } from '../src/lib/salary';
import { expectedReturn } from '../src/lib/lucky';
import { GIFT_CATALOG } from '../src/lib/gift-catalog';
import { liquidarDia, progresoDelDia } from '../src/modules/hosts/salary.service';
import { estadisticasDeLaPlataforma } from '../src/modules/hosts/stats.service';
import { startTestApi, uniqueName, type TestApi } from './helpers';

let api: TestApi;

before(async () => {
  api = await startTestApi();

  // Los archivos de prueba corren en procesos aparte sobre la misma base, así
  // que este no puede dar por hecho que otro ya sembró el catálogo.
  await prisma.gift.upsert({
    where: { code: 'rose' },
    create: { code: 'rose', name: 'Rosa', emoji: '🌹', priceCoins: 10, tier: 'basic', animation: 'float' },
    update: {},
  });
  await prisma.gift.upsert({
    where: { code: 'lion-imperial' },
    create: {
      code: 'lion-imperial',
      name: 'León Imperial',
      emoji: '🦁',
      priceCoins: 10_000,
      tier: 'exclusive',
      animation: 'aura',
    },
    update: { tier: 'exclusive' },
  });
});

after(async () => {
  await api.close();
  await prisma.$disconnect();
});

async function crearUsuario(coins = 5_000_000) {
  const username = uniqueName('sal');
  const { data } = await api.request('POST', '/api/auth/register', {
    body: {
      email: `${username}@test.local`,
      username,
      password: 'contrasena123',
      displayName: `Host ${username}`,
    },
  });
  await prisma.user.update({ where: { id: data.user.id }, data: { coins } });
  return { token: data.token as string, id: data.user.id as string };
}

/**
 * Deja a un anfitrión con un volumen de regalos concreto y las horas de directo
 * que se pidan, escribiendo los registros directamente: enviar millones de
 * monedas por la API tardaría demasiado.
 */
/**
 * Un día ya vivido de un anfitrión: una sala con sus horas y los regalos que
 * recibió.
 *
 * `conDiamantes` existe porque el ranking ordena por diamantes recibidos y se
 * queda con los veinte primeros: un anfitrión de prueba con 700.000 monedas
 * echaría del podio a los de otros archivos, que corren a la vez sobre la misma
 * base. Las pruebas que solo miran el salario lo apagan.
 */
async function prepararDia(
  hostId: string,
  luckyCoins: number,
  horas: number,
  exclusivo = 0,
  conDiamantes = true,
) {
  const { desde } = limitesDelDia(diaDe());
  const senderId = (await crearUsuario(0)).id;

  const rosa = await prisma.gift.findUniqueOrThrow({ where: { code: 'rose' } });
  const leon = await prisma.gift.findUniqueOrThrow({ where: { code: 'lion-imperial' } });

  const sala = await prisma.room.create({
    data: {
      hostId,
      title: 'Directo de prueba',
      channel: `test-${Math.random()}`,
      status: 'ended',
      startedAt: new Date(desde.getTime() + 3600_000),
      endedAt: new Date(desde.getTime() + 3600_000 + horas * 3600_000),
    },
  });

  const registros = [];
  if (luckyCoins > 0) {
    registros.push({
      giftId: rosa.id,
      roomId: sala.id,
      senderId,
      receiverId: hostId,
      quantity: 1,
      coinsSpent: luckyCoins,
      diamondsEarned: conDiamantes ? Math.round(luckyCoins * 0.05) : 0,
      createdAt: new Date(desde.getTime() + 7200_000),
    });
  }
  if (exclusivo > 0) {
    registros.push({
      giftId: leon.id,
      roomId: sala.id,
      senderId,
      receiverId: hostId,
      quantity: 1,
      coinsSpent: exclusivo,
      diamondsEarned: conDiamantes ? Math.round(exclusivo * 0.7) : 0,
      createdAt: new Date(desde.getTime() + 7200_000),
    });
  }

  if (registros.length > 0) await prisma.giftSend.createMany({ data: registros });
}

describe('tabla de salarios', () => {
  it('las metas y los pagos siempre suben', () => {
    for (let i = 1; i < NIVELES.length; i += 1) {
      assert.ok(NIVELES[i]!.meta > NIVELES[i - 1]!.meta, `la meta del nivel ${i + 1} no sube`);
      assert.ok(NIVELES[i]!.salario > NIVELES[i - 1]!.salario, `el salario del nivel ${i + 1} no sube`);
    }
  });

  it('se cobra el nivel más alto alcanzado', () => {
    assert.equal(nivelPara(149_999), null, 'por debajo de la primera meta no hay salario');
    assert.equal(nivelPara(150_000)?.nivel, 1);
    assert.equal(nivelPara(1_200_000)?.nivel, 4, 'pasa de 1.000.000 pero no llega a 1.500.000');
    assert.equal(nivelPara(999_999_999)?.nivel, 13);
  });

  it('el siguiente nivel es el primero que aún no se alcanza', () => {
    assert.equal(siguienteNivel(0)?.nivel, 1);
    assert.equal(siguienteNivel(150_000)?.nivel, 2);
    assert.equal(siguienteNivel(100_000_000), null, 'en el tope ya no hay siguiente');
  });

  it('a la plataforma le sale a cuenta pagar todos los niveles', () => {
    // Es la comprobación que sostiene todo el sistema. El espectador recicla sus
    // premios, así que para generar la meta solo recarga de verdad la parte que
    // pierde; de ahí sale el ingreso con el que se paga el salario.
    const rosa = GIFT_CATALOG.find((gift) => gift.code === 'rose')!;
    const recargaReal = 1 - expectedReturn(rosa.luckyChance, rosa.luckyMultipliers);

    for (const nivel of NIVELES) {
      const ingreso = nivel.meta * recargaReal;
      const costeDiamantes = nivel.meta * 0.05;
      const margen = ingreso - costeDiamantes - nivel.salario;
      assert.ok(margen > 0, `el nivel ${nivel.nivel} deja ${margen.toFixed(0)} de margen`);
    }
  });

  it('llegar a la meta con dinero propio nunca compensa', () => {
    // Sin esto, un anfitrión podría autoregalarse para cobrar el salario. La
    // cuenta es la misma de arriba vista del otro lado: lo que gana la
    // plataforma es exactamente lo que pierde quien lo intente.
    const rosa = GIFT_CATALOG.find((gift) => gift.code === 'rose')!;
    const recargaReal = 1 - expectedReturn(rosa.luckyChance, rosa.luckyMultipliers);

    for (const nivel of NIVELES) {
      const gasto = nivel.meta * recargaReal;
      const recupera = nivel.meta * 0.05 + nivel.salario;
      assert.ok(recupera < gasto, `en el nivel ${nivel.nivel} autoregalarse saldría a cuenta`);
    }
  });
});

describe('cuentas de la plataforma', () => {
  // Los archivos de prueba corren en paralelo sobre la misma base, así que aquí
  // no se comparan fotos de dos momentos: se comprueban igualdades que tienen
  // que cumplirse en cualquier foto, y que lo añadido aparece.

  it('la deuda son los diamantes guardados, y las monedas no cuentan', async () => {
    const rico = await crearUsuario(0);
    await prisma.user.update({ where: { id: rico.id }, data: { coins: 9_000_000, diamonds: 40_000 } });

    const cuentas = await estadisticasDeLaPlataforma();

    assert.ok(cuentas.deuda.diamantes >= 40_000, 'los diamantes nuevos entran en la deuda');
    assert.ok(cuentas.monedas.enCirculacion >= 9_000_000, 'y las monedas en circulación');
    assert.equal(
      cuentas.deuda.dolares,
      cuentas.deuda.diamantes / 10_000,
      'la deuda sale solo de los diamantes: las monedas no se pueden retirar',
    );
    assert.ok(
      Math.abs(cuentas.posicion.dolares - (cuentas.caja.dolares - cuentas.deuda.dolares)) < 1e-9,
      'la posición es lo que entró menos lo que se debe',
    );
  });

  it('la exposición cuenta las vueltas que da una moneda de la suerte', async () => {
    // El 5% que se ve en cada envío subestima el coste: como el regalo devuelve
    // el 85%, la misma moneda se gasta unas siete veces antes de agotarse. Sin
    // esto, «lo que hay que tener preparado» saldría seis veces más pequeño de
    // lo que es.
    const cuentas = await estadisticasDeLaPlataforma();

    assert.ok(cuentas.exposicion.retorno > 0.5, 'el retorno del catálogo se lee de verdad');
    const porMoneda = cuentas.exposicion.siSuerte / (cuentas.exposicion.monedas / 10_000);
    const esperado = 0.05 / (1 - cuentas.exposicion.retorno);
    assert.ok(Math.abs(porMoneda - esperado) < 0.01, `sale ${porMoneda.toFixed(3)} y debería ${esperado.toFixed(3)}`);

    assert.ok(
      cuentas.exposicion.siExclusivos > cuentas.exposicion.siSuerte,
      'el exclusivo sigue siendo el camino más caro',
    );
  });

  it('los salarios del día suman el nivel de cada anfitrión por separado', async () => {
    // No todos van por la misma meta, así que no vale multiplicar por el número
    // de anfitriones: uno en el nivel 1 y otro en el 3 pagan cosas distintas.
    const antes = await estadisticasDeLaPlataforma();

    const uno = await crearUsuario();
    await prepararDia(uno.id, 200_000, 3, 0, false);
    const otro = await crearUsuario();
    await prepararDia(otro.id, 700_000, 3, 0, false);

    const despues = await estadisticasDeLaPlataforma();

    // 200.000 es nivel 1 (10.000) y 700.000 es nivel 3 (18.000).
    assert.equal(despues.metas.aPagar - antes.metas.aPagar, 28_000);
    assert.equal(despues.metas.conMeta - antes.metas.conMeta, 2);
  });

  it('una recarga entra en caja por lo que costó, no por las monedas', async () => {
    const comprador = await crearUsuario(0);
    await api.request('POST', '/api/wallet/topup', {
      token: comprador.token,
      body: { packageId: 'starter' },
    });

    const cuentas = await estadisticasDeLaPlataforma();

    assert.ok(cuentas.caja.recargas >= 1);
    assert.ok(cuentas.caja.dolares >= 0.99, 'el paquete de 10.000 monedas cuesta 0,99');
    assert.ok(
      cuentas.caja.monedasCompradas >= 10_000,
      'y las monedas que dio quedan contadas como compradas',
    );
  });
});

describe('reinicio desde la app', () => {
  it('las estadísticas también son solo de la cuenta de pruebas', async () => {
    const cualquiera = await crearUsuario();
    const { status } = await api.request('GET', '/api/hosts/me/stats', { token: cualquiera.token });
    assert.equal(status, 403);
  });

  it('solo lo puede hacer la cuenta de pruebas', async () => {
    // Borra lo acumulado de todo el mundo, así que la puerta no puede ser un
    // permiso que alguien se gane: es una lista de usuarios escrita a mano.
    const cualquiera = await crearUsuario();
    const { status } = await api.request('POST', '/api/hosts/me/reset', { token: cualquiera.token });
    assert.equal(status, 403);
  });
});

describe('la meta dentro de la sala', () => {
  it('la sala trae la meta del anfitrión al abrirla', async () => {
    // La barra tiene que estar llena desde el primer fotograma: si esperase al
    // primer regalo, quien entra a mitad de directo la vería a cero.
    const host = await crearUsuario();
    await prepararDia(host.id, 400_000, 3);

    const creada = await api.request('POST', '/api/rooms', {
      token: host.token,
      body: { title: 'Sala con meta' },
    });
    const { data } = await api.request('GET', `/api/rooms/${creada.data.room.id}`, { token: host.token });

    assert.equal(data.meta.luckyCoins, 400_000);
    assert.equal(data.meta.nivel, 2);
    assert.equal(data.meta.siguiente.nivel, 3);
    assert.equal(data.meta.niveles.length, NIVELES.length, 'la tabla entera, para pintar el detalle');
  });
});

describe('progreso y liquidación del día', () => {
  it('suma los regalos de la suerte y las horas de directo', async () => {
    const host = await crearUsuario();
    await prepararDia(host.id, 400_000, 3);

    const progreso = await progresoDelDia(host.id);
    assert.equal(progreso.luckyCoins, 400_000);
    assert.equal(progreso.liveSeconds, 3 * 3600);
    assert.equal(progreso.cumpleHoras, true);
    assert.equal(progreso.nivel, 2, '400.000 pasa la meta de 300.000');
    assert.equal(progreso.salarioEstimado, 13_000);
    assert.equal(progreso.siguiente?.nivel, 3);
  });

  it('los exclusivos no cuentan para la meta', async () => {
    // Ya dejan el 70% a quien los recibe: contarlos aquí sería pagar dos veces.
    const host = await crearUsuario();
    await prepararDia(host.id, 100_000, 3, 5_000_000);

    const progreso = await progresoDelDia(host.id);
    assert.equal(progreso.luckyCoins, 100_000);
    assert.equal(progreso.nivel, 0);
  });

  it('sin las dos horas de directo no se cobra', async () => {
    const host = await crearUsuario();
    await prepararDia(host.id, 5_000_000, 1);

    const progreso = await progresoDelDia(host.id);
    assert.equal(progreso.nivel, 7, 'la meta sí está alcanzada');
    assert.equal(progreso.cumpleHoras, false);
    assert.equal(progreso.salarioEstimado, 0, 'pero no se paga');

    await liquidarDia(diaDe());
    const pagado = await prisma.hostSalary.findUnique({
      where: { hostId_day: { hostId: host.id, day: diaDe() } },
    });
    assert.equal(pagado, null);
  });

  it('paga los diamantes y deja el movimiento en el historial', async () => {
    const host = await crearUsuario();
    const antes = await prisma.user.findUniqueOrThrow({ where: { id: host.id } });
    await prepararDia(host.id, 1_600_000, 4);

    await liquidarDia(diaDe());

    const despues = await prisma.user.findUniqueOrThrow({ where: { id: host.id } });
    assert.equal(despues.diamonds - antes.diamonds, 28_000, 'nivel 5');

    const movimiento = await prisma.transaction.findFirst({
      where: { userId: host.id, type: 'salary' },
    });
    assert.equal(movimiento?.amount, 28_000);
  });

  it('lanzarla dos veces no paga dos veces', async () => {
    // La liquidación corre también al arrancar el servidor, así que tiene que
    // poder repetirse sin consecuencias.
    const host = await crearUsuario();
    await prepararDia(host.id, 700_000, 3);

    await liquidarDia(diaDe());
    const primero = await prisma.user.findUniqueOrThrow({ where: { id: host.id } });

    await liquidarDia(diaDe());
    const segundo = await prisma.user.findUniqueOrThrow({ where: { id: host.id } });

    assert.equal(segundo.diamonds, primero.diamonds);
    assert.equal(
      await prisma.hostSalary.count({ where: { hostId: host.id, day: diaDe() } }),
      1,
    );
  });
});
