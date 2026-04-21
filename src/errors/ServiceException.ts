export class ServiceException extends Error {
  public readonly errorCode: number;
  public readonly statusCode: number;
  constructor(errorCode: number, errorMessage: string, statusCode: number = 400) {
    super(errorMessage);
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}