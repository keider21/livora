import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error';
import { isProduction } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: 'not_found', message: `Ruta no encontrada: ${req.method} ${req.path}` },
  });
}

// Express identifica el middleware de errores por su aridad de 4 argumentos.
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Error interno del servidor';
  if (!isProduction) {
    console.error('[error]', error);
  }

  res.status(500).json({
    error: {
      code: 'internal_error',
      message: isProduction ? 'Error interno del servidor' : message,
    },
  });
}
