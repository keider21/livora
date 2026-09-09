/**
 * Simulación de una sala real, para ver qué le pasa a la gente de verdad.
 *
 *   npm run simular        (desde server/)
 *
 * ## Por qué existe
 *
 * Mirar la curva de la suerte a quince minutos vista dice cómo se comporta el
 * sistema, no cómo se siente. Nadie está quince minutos seguidos gastando: se
 * entra un rato, se prueban unas cuantas cosas y se sale. En una sesión de tres
 * minutos casi todo depende de en qué trozo de la curva te tocó caer, y eso es
 * justo lo que el promedio esconde.
 *
 * Tampoco gasta todo el mundo igual. La mayoría suelta poco y variado —cofres,
 * regalos pequeños, alguno mediano por probar—, y muy pocos se arriesgan a tirar
 * millones en los caros. Un análisis que dé por hecho que todos hacen lo mismo
 * describe a un jugador que no existe.
 *
 * Así que aquí se monta una población con perfiles distintos, cada uno con su
 * presupuesto y su forma de gastar, y se les deja jugar su rato usando el sorteo
 * y la suerte de verdad, no una aproximación.
 *
 * ## Qué mirar del resultado
 *
 * - **Cuántos acaban ganando.** Si es cero, la sala se vacía; si es demasiado,
 *   la economía no cierra. Lo sano es que haya de los dos y se note.
 * - **Cuánto pierde el que pierde.** Perderlo todo en tres minutos echa a la
 *   gente por mucho que el promedio cuadre.
 * - **Lo que le cuesta a la plataforma.** Los diamantes que salen de esa sesión
 *   frente a las monedas que se consumieron de verdad.
 */
import { GIFT_CATALOG } from '../lib/gift-catalog';
import { rollLucky } from '../lib/lucky';
import { factorSuerte } from '../lib/lucky-mood';
import { DIAMONDS_PER_COIN, DIAMONDS_PER_COIN_EXCLUSIVE, GIFT_TIER_CHEST } from '../lib/constants';

const gift = (code: string) => GIFT_CATALOG.find((item) => item.code === code)!;

interface Perfil {
  nombre: string;
  cuantos: number;
  /** Saldo con el que entra, elegido al azar dentro del rango. */
  saldo: [number, number];
  /** Minutos que dura la sesión. */
  minutos: [number, number];
  /** Segundos entre un envío y el siguiente. */
  ritmo: [number, number];
  /** Qué manda, con su peso y las unidades por envío. */
  reparto: { code: string; peso: number; unidades: [number, number] }[];
}

/**
 * Los perfiles salen de cómo se usa esto de verdad: casi todo el mundo gasta
 * poco y variado, y los que sueltan de golpe son cuatro.
 */
const PERFILES: Perfil[] = [
  {
    nombre: 'estratega',
    cuantos: 20,
    saldo: [100_000, 500_000],
    minutos: [3, 4],
    ritmo: [1, 3],
    reparto: [
      { code: 'rose', peso: 50, unidades: [50, 300] },
      { code: 'beer', peso: 30, unidades: [50, 200] },
      { code: 'chest-bronze', peso: 15, unidades: [1, 5] },
      { code: 'crown', peso: 5, unidades: [1, 10] },
    ],
  },
  {
    nombre: 'pequeño',
    cuantos: 110,
    saldo: [5_000, 20_000],
    minutos: [3, 4],
    ritmo: [4, 12],
    reparto: [
      { code: 'clap', peso: 25, unidades: [1, 20] },
      { code: 'rose', peso: 40, unidades: [1, 30] },
      { code: 'heart', peso: 25, unidades: [1, 20] },
      { code: 'beer', peso: 10, unidades: [1, 10] },
    ],
  },
  {
    nombre: 'cofres',
    cuantos: 80,
    saldo: [10_000, 50_000],
    minutos: [3, 4],
    ritmo: [5, 15],
    reparto: [
      { code: 'chest-bronze', peso: 75, unidades: [1, 3] },
      { code: 'chest-silver', peso: 20, unidades: [1, 2] },
      { code: 'chest-gold', peso: 5, unidades: [1, 1] },
    ],
  },
  {
    nombre: 'variado',
    cuantos: 60,
    saldo: [20_000, 80_000],
    minutos: [3, 4],
    ritmo: [4, 10],
    reparto: [
      { code: 'rose', peso: 30, unidades: [10, 60] },
      { code: 'chest-bronze', peso: 25, unidades: [1, 3] },
      { code: 'crown', peso: 25, unidades: [1, 10] },
      { code: 'fireworks', peso: 15, unidades: [1, 5] },
      { code: 'ferrari', peso: 5, unidades: [1, 1] },
    ],
  },
  {
    nombre: 'arriesgado',
    cuantos: 30,
    saldo: [50_000, 200_000],
    minutos: [3, 4],
    ritmo: [6, 18],
    reparto: [
      { code: 'ferrari', peso: 45, unidades: [1, 3] },
      { code: 'yacht', peso: 30, unidades: [1, 2] },
      { code: 'castle', peso: 10, unidades: [1, 1] },
      { code: 'chest-gold', peso: 15, unidades: [1, 2] },
    ],
  },
];

/** Generador con semilla, para que dos ejecuciones den lo mismo y se comparen. */
function dado(semilla: number) {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}

const INICIO = Date.UTC(2026, 5, 1, 21, 0, 0);

interface Resultado {
  perfil: string;
  inicial: number;
  final: number;
  gastado: number;
  ganado: number;
  envios: number;
  diamantes: number;
}

function jugar(perfil: Perfil, indice: number, azar: () => number): Resultado {
  const entre = ([a, b]: [number, number]) => a + Math.floor(azar() * (b - a + 1));

  const cuenta = `sim-${perfil.nombre}-${indice}`;
  const inicial = entre(perfil.saldo);
  // Cada uno entra en un momento distinto: si todos empezaran a la vez verían el
  // mismo trozo de su curva y la comparación no diría nada.
  const arranque = INICIO + Math.floor(azar() * 3600_000);
  const hasta = arranque + entre(perfil.minutos) * 60_000;

  const pesos = perfil.reparto.reduce((total, item) => total + item.peso, 0);

  let saldo = inicial;
  let gastado = 0;
  let ganado = 0;
  let envios = 0;
  let diamantes = 0;
  let ahora = arranque;

  while (ahora < hasta && saldo > 0) {
    let tirada = azar() * pesos;
    let elegido = perfil.reparto[0]!;
    for (const item of perfil.reparto) {
      tirada -= item.peso;
      if (tirada < 0) {
        elegido = item;
        break;
      }
    }

    const regalo = gift(elegido.code);
    let unidades = entre(elegido.unidades);
    // Con el saldo justo se manda lo que se pueda; si no llega ni para una, se
    // acabó la sesión, que es lo que pasa de verdad.
    if (regalo.priceCoins * unidades > saldo) unidades = Math.floor(saldo / regalo.priceCoins);
    if (unidades < 1) break;

    const coste = regalo.priceCoins * unidades;
    const esCofre = regalo.tier === GIFT_TIER_CHEST;
    const probabilidad = esCofre ? 1 : regalo.luckyChance * factorSuerte(cuenta, new Date(ahora));
    const premio = rollLucky(regalo.priceCoins, unidades, probabilidad, regalo.luckyMultipliers, azar);

    saldo -= coste;
    gastado += coste;
    envios += 1;

    if (esCofre) {
      // Del cofre no vuelve nada: lo que sale se lo lleva quien lo recibe.
      diamantes += premio.coins * DIAMONDS_PER_COIN;
    } else {
      saldo += premio.coins;
      ganado += premio.coins;
      diamantes +=
        coste * (regalo.tier === 'exclusive' ? DIAMONDS_PER_COIN_EXCLUSIVE : DIAMONDS_PER_COIN);
    }

    ahora += entre(perfil.ritmo) * 1000;
  }

  return { perfil: perfil.nombre, inicial, final: saldo, gastado, ganado, envios, diamantes };
}

function percentil(valores: number[], p: number): number {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.floor((orden.length * p) / 100))]!;
}

function main() {
  const azar = dado(20260909);
  const resultados: Resultado[] = [];

  for (const perfil of PERFILES) {
    for (let i = 0; i < perfil.cuantos; i += 1) resultados.push(jugar(perfil, i, azar));
  }

  console.log(`Sesiones de 3-4 minutos · ${resultados.length} personas\n`);
  console.log('perfil        gente  saldo medio  acaban con   ganan  se arruinan  peor    mejor');

  for (const perfil of PERFILES) {
    const suyos = resultados.filter((r) => r.perfil === perfil.nombre);
    const cambios = suyos.map((r) => (r.final - r.inicial) / r.inicial);
    const ganan = suyos.filter((r) => r.final > r.inicial).length;
    const secos = suyos.filter((r) => r.final < r.inicial * 0.05).length;
    const saldoMedio = suyos.reduce((t, r) => t + r.inicial, 0) / suyos.length;
    const quedan = suyos.reduce((t, r) => t + r.final, 0) / suyos.reduce((t, r) => t + r.inicial, 0);

    console.log(
      `${perfil.nombre.padEnd(12)} ${String(suyos.length).padStart(5)}  ` +
        `${Math.round(saldoMedio).toLocaleString('es').padStart(11)}  ` +
        `${(quedan * 100).toFixed(0).padStart(9)}%  ` +
        `${((100 * ganan) / suyos.length).toFixed(0).padStart(5)}%  ` +
        `${((100 * secos) / suyos.length).toFixed(0).padStart(10)}%  ` +
        `${(percentil(cambios, 10) * 100).toFixed(0).padStart(5)}%  ` +
        `${(percentil(cambios, 90) * 100).toFixed(0).padStart(6)}%`,
    );
  }

  const inicial = resultados.reduce((t, r) => t + r.inicial, 0);
  const final = resultados.reduce((t, r) => t + r.final, 0);
  const volumen = resultados.reduce((t, r) => t + r.gastado, 0);
  const diamantes = resultados.reduce((t, r) => t + r.diamantes, 0);
  const ganan = resultados.filter((r) => r.final > r.inicial).length;
  const secos = resultados.filter((r) => r.final < r.inicial * 0.05).length;

  console.log(`\nMonedas: entraron ${inicial.toLocaleString('es')}, quedaron ${final.toLocaleString('es')}`);
  console.log(`  consumidas: ${(inicial - final).toLocaleString('es')} (${(100 * (1 - final / inicial)).toFixed(1)}%)`);
  console.log(`  volumen movido en regalos: ${Math.round(volumen).toLocaleString('es')}`);
  console.log(`  vueltas por moneda: ${(volumen / inicial).toFixed(2)}`);
  console.log(`\nGente: ${((100 * ganan) / resultados.length).toFixed(0)}% acaba con más de lo que entró, ${((100 * secos) / resultados.length).toFixed(0)}% se queda sin nada`);
  console.log(
    `\nCoste para la plataforma: ${Math.round(diamantes).toLocaleString('es')} diamantes ` +
      `($${(diamantes / 10_000).toFixed(2)}) por ${(inicial - final).toLocaleString('es')} monedas consumidas ` +
      `($${((inicial - final) / 10_000).toFixed(2)} si se compraron)`,
  );
  console.log(`  se va en diamantes el ${((100 * diamantes) / (inicial - final)).toFixed(0)}% de lo consumido`);
}

main();
