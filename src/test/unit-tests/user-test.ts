import { UserRepository } from "../../repositories/user-repository.js";
import { UserService } from "../../services/user-service.js";
import type { User } from "../../models/user.js";
import { UserErrors } from "../../errors/errors.js";

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

        expect(result.password).toEqual("encrypted");

        expect(result.id).toBeGreaterThan(0);

        expect(result.friends.length).toBe(0);
    });

    it('Should throw InvalidPassword when password is shorter than 8 characters', async () => {
        const userRepository = new UserRepository();
        const userService = new UserService(userRepository);

        const user: User = {
            email: "test@example.com",
            username: "TestUser",
            password: "12345",
            id: 1,
            role: 0,
            friends: []
        };

        await expect(userService.registerUserAsync(user)).rejects.toThrow(UserErrors.InvalidPassword);
    });
})