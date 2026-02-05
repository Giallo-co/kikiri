import { UserRepository } from "../repositories/user-repository";
import { UserService } from "../services/user-service";
import type { User } from "../models/user";

describe('UserService', () => {
    it('Should return a new User', async () => {
        const userRepository = new UserRepository();
        const userService = new UserService(userRepository);

        let user : User = {
            email: "philipfallag@gmail.com",
            username: "Philip",
            password: "12345678",
            id: 1,
            role: 2,
            friends: []
        }
        const result = await userService.registerUserAsync(user);

        expect(result).toBe(user);
    })
})