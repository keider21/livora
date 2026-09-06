import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { HttpError } from '../lib/http-error';
import { prisma } from '../lib/prisma';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/** Exige un token válido y un usuario activo. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) throw HttpError.unauthorized('Falta el token de acceso');

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isBanned: true },
    });

    if (!user) throw HttpError.unauthorized('La cuenta ya no existe');
    if (user.isBanned) throw HttpError.forbidden('Cuenta suspendida');

    req.userId = user.id;
    next();
  } catch (error) {
    next(error);
  }
}

/** Resuelve el usuario si hay token, pero no falla si no lo hay. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.userId = verifyAccessToken(token).sub;
  } catch {
    // Token inválido en una ruta pública: se ignora y se sigue como anónimo.
  }
  next();
}
