import type { Request } from "express";

/**
 * Rutas de larga duración (SSE, etc.) que no deben generar PutMetricData ni access logs por request,
 * para evitar costes y ruido en CloudWatch cuando el cliente reconecta a menudo.
 */
export function shouldSkipHeavyObservability(req: Request): boolean {
  const p = (req.originalUrl || req.url || "").split("?")[0].toLowerCase();

  if (p.includes("/nodes/stream") || /\/[^/]+\/stream$/i.test(p)) {
    return true;
  }

  const prefixes = (process.env.OBSERVABILITY_SKIP_PATH_PREFIXES || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return prefixes.some((prefix) => p.startsWith(prefix));
}
