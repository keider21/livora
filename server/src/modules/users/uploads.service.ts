import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { HttpError } from '../../lib/http-error';

/**
 * Guarda las imágenes que suben los usuarios.
 *
 * ## Por qué en disco y no en la base
 *
 * Una foto de perfil son cientos de kilobytes. Metida en SQLite, cada consulta
 * que traiga al usuario la arrastra con ella, y eso se paga en la lista de salas
 * y en el ranking, que traen decenas de usuarios de golpe. En disco, la base
 * guarda una ruta de treinta caracteres y la imagen la sirve el servidor de
 * archivos, que es para lo que está.
 *
 * ## Por qué el nombre sale del contenido
 *
 * El archivo se llama como el hash de lo que lleva dentro. Así subir dos veces
 * la misma foto no ocupa el doble, y **el nombre no se puede adivinar**: sin
 * eso, alguien podría pedir `/uploads/avatar-de-fulano.jpg` y sacar fotos de
 * cuentas ajenas probando nombres.
 *
 * ## Lo que falta
 *
 * Esto guarda en el disco de la máquina. Cuando el backend se despliegue de
 * verdad (paso 10.7) habrá que mover esto a un almacenamiento aparte, o cada
 * reinicio del servidor se llevará las fotos por delante.
 */

export const CARPETA_SUBIDAS = resolve(process.cwd(), 'uploads');

/** Lo que puede pesar una imagen ya decodificada. */
const MAXIMO_BYTES = 3 * 1024 * 1024;

const TIPOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Guarda una imagen que llega como `data:` y devuelve su ruta pública.
 *
 * Se acepta base64 y no multipart porque la app ya envía JSON en todas las
 * llamadas: añadir un segundo formato traería otra librería y otro camino de
 * errores para ganar un tercio de tamaño en el transporte.
 */
export async function guardarImagen(dataUrl: string, prefijo: string): Promise<string> {
  const partes = /^data:([a-z/+-]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!partes) throw HttpError.badRequest('La imagen no llegó en el formato esperado');

  const [, tipo, base64] = partes;
  const extension = TIPOS[tipo!.toLowerCase()];
  if (!extension) throw HttpError.badRequest('Solo se aceptan imágenes JPG, PNG o WebP');

  const datos = Buffer.from(base64!, 'base64');
  if (datos.length === 0) throw HttpError.badRequest('La imagen llegó vacía');
  if (datos.length > MAXIMO_BYTES) {
    throw HttpError.badRequest('La imagen pesa demasiado: máximo 3 MB');
  }

  const nombre = `${prefijo}-${createHash('sha256').update(datos).digest('hex').slice(0, 24)}.${extension}`;
  await mkdir(CARPETA_SUBIDAS, { recursive: true });
  await writeFile(resolve(CARPETA_SUBIDAS, nombre), datos);

  return `/uploads/${nombre}`;
}
