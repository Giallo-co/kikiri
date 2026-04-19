import { ServiceException } from "./ServiceException";
export class UserErrors {

    public static readonly TestError : ServiceException =
        new ServiceException(1000, "This is the message from the test error.");
}
