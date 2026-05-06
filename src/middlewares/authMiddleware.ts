import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../lib/logger';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1] as string;

  try {
    const jwtSecretKey = process.env.JWT_SECRET_KEY as string;
    const decoded = jwt.verify(token, jwtSecretKey);
    
    (req as any).user = decoded; 
    
    next();
  } catch (error) {
    logger.warn('jwt_verify_failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};