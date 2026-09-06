import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { HttpError } from '../lib/http-error';

type Source = 'body' | 'query' | 'params';

/** Valida y normaliza una parte de la petición con un esquema Zod. */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === 'body') {
        req.body = parsed;
      } else {
        // req.query y req.params son getters de solo lectura en Express 5,
        // por eso el resultado se guarda aparte en lugar de reasignarse.
        Object.assign(req[source] as Record<string, unknown>, parsed);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          HttpError.badRequest(
            'Datos inválidos',
            error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          ),
        );
        return;
      }
      next(error);
    }
  };
}
