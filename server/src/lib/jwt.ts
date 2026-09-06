import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from './http-error';

export interface TokenPayload {
  sub: string;
  username: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === 'string' || !decoded.sub) {
      throw new Error('payload inválido');
    }
    return { sub: String(decoded.sub), username: String((decoded as TokenPayload).username ?? '') };
  } catch {
    throw HttpError.unauthorized('Token inválido o expirado');
  }
}
