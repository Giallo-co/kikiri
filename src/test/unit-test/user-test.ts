import { UserRepository } from "../../repositories/user-repository.js";
import { UserService } from "../../services/user-service.js";
import type { User } from "../../models/user.js";

describe('UserService', () => {
    it('Should return a new User', async () => {
        const userRepository = new UserRepository();
        const userService = new UserService(userRepository);

        let user : User = {
            email: "philipfallag@gmail.com",
            username: "Philip",
            password: "encrypted",
            id: 1,
            role: 0,
            friends: []
        }
        const result = await userService.registerUserAsync(user);

        expect(result).toMatchObject(user);
    })
})