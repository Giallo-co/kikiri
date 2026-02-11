import type { User } from "../models/user.js"

export class UserRepository {
    callToExternalServiceAsync = async () : Promise<string> => {
        
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve("External call success.");
            }, 200)
        })
    }

    saveUserAsync = async (user : User) : Promise<void> => {
        
        await this.callToExternalServiceAsync();

    }

    saveRelationshipAsync = async (user : User) : Promise<void> => {
        
        await this.callToExternalServiceAsync();

    }

    getUserByIdAsync = async (id: number) : Promise<User> => {

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    email: "jonatan@gmail.com",
                    username: "zu-aster",
                    password: "encrypted",
                    id: id,
                    role: 0,
                    friends: []
                });
            }, 100);
        })
    }
}