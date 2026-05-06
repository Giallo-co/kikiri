import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Access log (Winston → consola + archivo JSON en producción). Colocar antes de las rutas.
 */
export function requestLog(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const pathLabel =
      req.route?.path !== undefined
        ? `${req.baseUrl}${req.route.path}`
        : (req.originalUrl?.split("?")[0] ?? req.path);

    logger.info("http_request", {
      method: req.method,
      path: pathLabel,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 1000) / 1000,
    });
  });

  next();
}
