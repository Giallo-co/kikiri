import type { User } from '../models/user.js'
import { UserErrors } from '../errors/errors.js';
import type { UserRepository } from '../repositories/user-repository.js';


export class UserService {
    private PasswordLength : number = 8;

    constructor(private readonly userRepository : UserRepository) {
        console.log('Initilized user Repository')
    }
    
    async registerUserAsync( userToRegister: User ): Promise<User> {
        console.log("Starting to register user!")
        const password = userToRegister.password;

        if (!password || password.length < this.PasswordLength) {
            console.log("Password is needed!");
            throw UserErrors.InvalidPassword;
        }

        let user : User = {
            email: userToRegister.email,
            username: userToRegister.username,
            password: "encrypted",
            id: userToRegister.id,
            role: 0,
            friends: []
        }

        let promise1 = this.userRepository.saveUserAsync(user);
        let promise2 = this.userRepository.saveRelationshipAsync(user);
        await Promise.all([promise1, promise2]); //concurrent promises
        return user;
    }
    

    simulation() : Promise<string> {
        return new Promise ((resolve, reject) => {
            setTimeout(() => {
                resolve("Completed Task");
            }, 5000);
        })
    }

}