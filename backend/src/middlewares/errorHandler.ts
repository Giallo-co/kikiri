import { Request, Response, NextFunction } from 'express';
import { ServiceException } from '../errors/ServiceException'; 

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack); 
  if (err instanceof ServiceException) {
    res.status(400).json({
      "Code": err.errorCode,
      "message": err.message
    });
  } else {
    res.status(500).send('Something broke!');
  }
};