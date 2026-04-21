import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export function getAuthUserId(req: Request): number | undefined {
  const payload = (req as { user?: JwtPayload }).user;
  if (payload?.sub === undefined || payload.sub === null) return undefined;
  const id = typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : Number(payload.sub);
  return Number.isFinite(id) ? id : undefined;
}
