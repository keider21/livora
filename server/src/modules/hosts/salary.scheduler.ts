import { diaDe } from '../../lib/salary';
import { liquidarDia } from './salary.service';

/**
 * Liquidación diaria de los salarios.
 *
 * Cada pocos minutos comprueba si ya cambió el día en la zona del corte y, si
 * es así, paga el día anterior. Se apoya en que `liquidarDia` no paga dos veces:
 * la clave única por anfitrión y día lo impide, así que da igual cuántas veces
 * se ejecute.
 *
 * Se comprueba también al arrancar, que es lo que cubre el caso de que el
 * servidor estuviera apagado justo a medianoche. Un cron externo sería más
 * preciso, pero obligaría a mantener otra pieza; con esto el retraso máximo es
 * el del intervalo.
 */

/** Cada cuánto se mira el reloj. */
const INTERVALO_MS = 5 * 60_000;

let ultimoLiquidado: string | null = null;

/** El día anterior al que se le pasa, como YYYY-MM-DD. */
function diaAnterior(dia: string): string {
  const fecha = new Date(`${dia}T12:00:00.000Z`);
  fecha.setUTCDate(fecha.getUTCDate() - 1);
  return fecha.toISOString().slice(0, 10);
}

async function revisar(): Promise<void> {
  const ayer = diaAnterior(diaDe());
  if (ultimoLiquidado === ayer) return;

  try {
    const { pagados } = await liquidarDia(ayer);
    ultimoLiquidado = ayer;
    if (pagados.length > 0) {
      console.log(`[salario] ${ayer}: ${pagados.length} anfitriones cobraron`);
    }
  } catch (error) {
    // Si falla se reintenta en el siguiente paso: no se marca como liquidado.
    console.error('[salario] no se pudo liquidar', ayer, error);
  }
}

export function iniciarLiquidacionDeSalarios(): () => void {
  void revisar();
  const temporizador = setInterval(() => void revisar(), INTERVALO_MS);

  // `unref` evita que este temporizador mantenga vivo el proceso al cerrarlo.
  temporizador.unref?.();
  return () => clearInterval(temporizador);
}
