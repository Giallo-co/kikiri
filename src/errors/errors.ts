import { ServiceException } from "./serviceException.js";

export class UserErrors {
    public static readonly InvalidPassword : ServiceException =
        new ServiceException(1000, "User entered invalid password");

    public static readonly InvalidEmail : ServiceException =
        new ServiceException(1001, "User entered invalid email");

}

export class RelationshipErrors {
    public static readonly InexistentUser : ServiceException =
        new ServiceException(2000, "User tried to start a relationship with an inexistent user.");
}