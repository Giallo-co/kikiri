export class ServiceException extends Error {

    public readonly errorCode : number;

    constructor(errorCode: number, errorMessage: string) {
        super(errorMessage);
        this.errorCode = errorCode;
    }

}