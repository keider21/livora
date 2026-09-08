#!/usr/bin/env node
/**
 * Comprime los clips de los regalos antes de empaquetarlos.
 *
 *   node scripts/optimize-gift-media.mjs [--watermark]
 *
 * Los vídeos que salen de los generadores de IA vienen a una calidad absurda
 * para un teléfono: el del León llegaba a 1440×1440 y 31 Mbps, 19 MB por cinco
 * segundos. Cada clip suma su tamaño entero a la APK, así que sin este paso diez
 * regalos serían 190 MB de descarga.
 *
 * A 1080×1080 y CRF 24 ese mismo clip baja a 2,3 MB sin diferencia visible en
 * pantalla de móvil.
 *
 * Con `--watermark` recorta además una franja inferior, que es donde esos
 * generadores estampan su marca. Se recorta y se rellena en negro en vez de usar
 * el filtro `delogo`, que sobre fondos con luces deja un manchón peor que la
 * propia marca.
 *
 * Los archivos ya comprimidos se saltan: se reconoce por el bitrate.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, renameSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const giftsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'gifts');
const recortarMarca = process.argv.includes('--watermark');

/** Alto en píxeles de la franja que se recorta con `--watermark`. */
const FRANJA = 92;
const LADO = 1080;
const CRF = 24;
/** Por encima de esto se considera sin comprimir. */
const BITRATE_MAXIMO = 6_000_000;

function buscarFfmpeg() {
  const candidatos = ['ffmpeg'];
  if (process.env.LOCALAPPDATA) {
    const winget = join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages');
    if (existsSync(winget)) {
      for (const paquete of readdirSync(winget)) {
        if (!paquete.startsWith('Gyan.FFmpeg')) continue;
        const raiz = join(winget, paquete);
        for (const build of readdirSync(raiz)) {
          const exe = join(raiz, build, 'bin', 'ffmpeg.exe');
          if (existsSync(exe)) candidatos.push(exe);
        }
      }
    }
  }

  for (const candidato of candidatos) {
    try {
      execFileSync(candidato, ['-version'], { stdio: 'ignore' });
      return candidato;
    } catch {
      // Se prueba el siguiente.
    }
  }
  return null;
}

const ffmpeg = buscarFfmpeg();
if (!ffmpeg) {
  console.error('No se encontró ffmpeg. Instálalo con: winget install Gyan.FFmpeg');
  process.exit(1);
}

const videos = readdirSync(giftsDir).filter((archivo) => archivo.endsWith('.mp4'));
if (videos.length === 0) {
  console.log('No hay clips que comprimir en assets/gifts/.');
  process.exit(0);
}

for (const archivo of videos) {
  const origen = join(giftsDir, archivo);
  const bytes = statSync(origen).size;

  // Se mide el bitrate para no recomprimir lo ya comprimido: cada pasada de
  // vuelta pierde calidad.
  const info = leerInfo(ffmpeg, origen);
  const duracion = /Duration: (\d+):(\d+):([\d.]+)/.exec(info);
  const segundos = duracion
    ? Number(duracion[1]) * 3600 + Number(duracion[2]) * 60 + Number(duracion[3])
    : 0;
  const bitrate = segundos ? (bytes * 8) / segundos : 0;

  if (bitrate && bitrate < BITRATE_MAXIMO && !recortarMarca) {
    console.log(`· ${archivo}: ya está comprimido (${(bytes / 1024 / 1024).toFixed(1)} MB), se salta`);
    continue;
  }

  const filtros = [`scale=${LADO}:${LADO}:flags=lanczos`];
  if (recortarMarca) {
    filtros.push(`crop=${LADO}:${LADO - FRANJA}:0:0`, `pad=${LADO}:${LADO}:0:0:black`);
  }

  const salida = `${origen}.tmp.mp4`;
  execFileSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', origen,
    '-vf', filtros.join(','),
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', String(CRF), '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '96k',
    salida,
  ]);

  const nuevos = statSync(salida).size;
  renameSync(salida, origen);
  const ahorro = Math.round((1 - nuevos / bytes) * 100);
  console.log(
    `✔ ${archivo}: ${(bytes / 1024 / 1024).toFixed(1)} MB → ${(nuevos / 1024 / 1024).toFixed(1)} MB (-${ahorro}%)`,
  );
}

/**
 * Datos del archivo. `ffmpeg -i` sin salida los escribe por stderr y termina
 * con error a propósito, así que la excepción es el camino normal aquí.
 */
function leerInfo(exe, archivo) {
  try {
    execFileSync(exe, ['-hide_banner', '-i', archivo], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return '';
  } catch (error) {
    return String(error.stderr ?? '');
  }
}
