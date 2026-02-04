import type { User } from '../models/user.js'
import { UserErrors } from '../errors/errors.js';


export class UserService {
    private PasswordLength : number = 8;

    
    registerUser( userToRegister: User ): User {
        console.log("Starting to register user!")
        const password = userToRegister.password;

        if (!password || password.length < this.PasswordLength) {
            console.log("Password is needed!");
            throw UserErrors.InvalidPassword;
        }

        if (password.length < this.PasswordLength) {
            console.log("Password is too short!");
            throw new Error("Password length");
        }

        return {
            email : userToRegister.email,
            username : userToRegister.username,
            password : "encrypted",
            id : userToRegister.id,
            role : 0,
            friends : []
        }
    }
    

    simulation() : Promise<string> {
        return new Promise ((resolve, reject) => {
            setTimeout(() => {
                resolve("Completed Task");
            }, 5000);
        })
    }

}