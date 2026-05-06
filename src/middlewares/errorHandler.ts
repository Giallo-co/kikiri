import { Request, Response, NextFunction } from 'express';
import { ServiceException } from '../errors/ServiceException'; 
import config from '../config/config';
import { logger } from '../lib/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const ctx = { method: req.method, path: req.originalUrl };

  if (err instanceof ServiceException) {
    logger.warn('request_failed', {
      ...ctx,
      errorCode: err.errorCode,
      message: err.message,
      statusCode: err.statusCode,
    });
  } else {
    logger.error('unhandled_error', {
      ...ctx,
      message: err.message,
      stack: err.stack,
    });
  }

  if (err instanceof ServiceException) {
    res.status(err.statusCode).json({
      "Code": err.errorCode,
      "message": err.message
    });
  } else {
    res.status(500).send(config.errorMessage);
  }
};