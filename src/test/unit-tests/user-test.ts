import { UserRepository } from "../../repositories/user-repository.js";
import { UserService } from "../../services/user-service.js";
import type { User } from "../../models/user.js";

describe('UserService', () => {
    it('Should return a new User', async () => {
        const userRepository = new UserRepository();
        const userService = new UserService(userRepository);

        let user : User = {
            email: "hugo@test.com",
            username: "hugo",
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
    })

    it('Should simulate password encryption (security check)', async () => {
    const userRepository = new UserRepository();
    const userService = new UserService(userRepository);

    const rawUser = { 
      email: "security@test.com", 
      username: "SecurityGuy", 
      password: "SuperSecretPassword123", 
      id: 99, 
      role: 0, 
      friends: [] 
    };

    const result = await userService.registerUserAsync(rawUser as any);

    expect(result.password).toBe("encrypted");
    expect(result.password).not.toBe("SuperSecretPassword123");
  });

})