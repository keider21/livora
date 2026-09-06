import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Envuelve un handler async para que los rechazos lleguen al middleware de errores. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
