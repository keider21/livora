import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { prisma } from '../src/lib/prisma';
import { COFRES, abrirCofre, probabilidadDePremio, retornoDelCofre } from '../src/lib/chests';
import { startTestApi, uniqueName, type TestApi } from './helpers';

let api: TestApi;

before(async () => {
  api = await startTestApi();
});

after(async () => {
  await api.close();
  await prisma.$disconnect();
});

async function crearUsuario(coins: number) {
  const username = uniqueName('cofre');
  const { data } = await api.request('POST', '/api/auth/register', {
    body: {
      email: `${username}@test.local`,
      username,
      password: 'contrasena123',
      displayName: `Usuario ${username}`,
    },
  });
  await prisma.user.update({ where: { id: data.user.id }, data: { coins } });
  return { token: data.token as string, id: data.user.id as string };
}

describe('cofres', () => {
  it('ninguno es rentable de abrir', () => {
    // Igual que con los regalos: por encima de 1, abrir cofres produciría
    // monedas en vez de gastarlas y la economía dejaría de cerrar.
    for (const cofre of COFRES) {
      const retorno = retornoDelCofre(cofre);
      assert.ok(retorno < 1, `${cofre.code} devuelve ${retorno.toFixed(3)} de media`);
      assert.ok(retorno > 0.5, `${cofre.code} devuelve solo ${retorno.toFixed(3)}, sería desanimante`);
    }
  });

  it('los premios suben con el precio del cofre', () => {
    for (let i = 1; i < COFRES.length; i += 1) {
      assert.ok(COFRES[i]!.precio > COFRES[i - 1]!.precio);
      const menorDeEste = Math.min(...COFRES[i]!.premios.map((premio) => premio.monedas));
      const menorDelAnterior = Math.min(...COFRES[i - 1]!.premios.map((premio) => premio.monedas));
      assert.ok(menorDeEste > menorDelAnterior, `${COFRES[i]!.code} no mejora el premio mínimo`);
    }
  });

  it('el premio más pequeño ya triplica lo que cuesta', () => {
    // Por eso la mayoría de las veces no toca nada: si tocara a menudo con
    // premios así, el retorno se dispararía.
    for (const cofre of COFRES) {
      const menor = Math.min(...cofre.premios.map((premio) => premio.monedas));
      assert.ok(menor >= cofre.precio * 3, `${cofre.code} paga ${menor} por ${cofre.precio}`);
      assert.ok(probabilidadDePremio(cofre) < 25, `${cofre.code} premia demasiado a menudo`);
    }
  });

  it('el sorteo respeta las franjas de cada premio', () => {
    const bronce = COFRES[0]!;
    // La primera franja es el premio más común; el final del recorrido, «nada».
    assert.equal(abrirCofre(bronce, () => 0), 3_000);
    assert.equal(abrirCofre(bronce, () => 0.999), 0, 'casi al final no toca nada');
  });

  it('abrir varios sortea cada uno por separado', async () => {
    const usuario = await crearUsuario(100_000);

    const { status, data } = await api.request('POST', '/api/chests/open', {
      token: usuario.token,
      body: { code: 'bronze', cantidad: 10 },
    });

    assert.equal(status, 200);
    assert.equal(data.premios.length, 10, 'una tirada por cofre');
    assert.equal(data.coste, 10_000);
    assert.equal(
      data.ganado,
      data.premios.reduce((total: number, premio: number) => total + premio, 0),
    );
    assert.equal(data.wallet.coins, 100_000 - data.coste + data.ganado);
  });

  it('el cobro y el premio quedan en el historial', async () => {
    const usuario = await crearUsuario(50_000);

    const { data } = await api.request('POST', '/api/chests/open', {
      token: usuario.token,
      body: { code: 'silver', cantidad: 1 },
    });

    const movimientos = await prisma.transaction.findMany({
      where: { userId: usuario.id },
      orderBy: { amount: 'asc' },
    });

    assert.equal(movimientos[0]?.type, 'chest_open');
    assert.equal(movimientos[0]?.amount, -5_000);
    if (data.ganado > 0) {
      assert.equal(movimientos[movimientos.length - 1]?.type, 'chest_prize');
      assert.equal(movimientos[movimientos.length - 1]?.amount, data.ganado);
    }
  });

  it('sin monedas suficientes no se abre nada', async () => {
    const usuario = await crearUsuario(500);

    const { status } = await api.request('POST', '/api/chests/open', {
      token: usuario.token,
      body: { code: 'gold', cantidad: 1 },
    });

    assert.equal(status, 402);
    const despues = await prisma.user.findUniqueOrThrow({ where: { id: usuario.id } });
    assert.equal(despues.coins, 500, 'el saldo no se toca');
  });

  it('a la larga la casa gana, midiendo muchas aperturas', () => {
    // Comprobación estadística de que el reparto de premios hace lo que dice la
    // tabla: con muchas tiradas el resultado se acerca al retorno documentado.
    for (const cofre of COFRES) {
      let ganado = 0;
      const tiradas = 200_000;
      for (let i = 0; i < tiradas; i += 1) ganado += abrirCofre(cofre);

      const real = ganado / (tiradas * cofre.precio);
      const previsto = retornoDelCofre(cofre);
      assert.ok(
        Math.abs(real - previsto) < 0.25,
        `${cofre.code}: salió ${real.toFixed(2)} y la tabla dice ${previsto.toFixed(2)}`,
      );
      assert.ok(real < 1, `${cofre.code} devolvió ${real.toFixed(2)} en la simulación`);
    }
  });
});
