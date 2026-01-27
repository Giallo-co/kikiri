import type { User } from '../models/user.js'


export class UserService {
    private PasswordLength : number = 8;

    
    registerUser( userToRegister: User ): User {
            console.log("Starting to register user!")
            const password = userToRegister.password;

            if (!password) {
                console.log("Password is needed!");
                throw new Error("Empty Password");
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
    }