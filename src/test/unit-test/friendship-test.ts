import { UserRepository } from "../../repositories/user-repository.js";
import { UserService } from "../../services/user-service.js";
import type { User } from "../../models/user.js";

describe('UserService - Friendship', () => {
    it('Should add a friend to the user list', async () => {
        const userRepository = new UserRepository();
        const userService = new UserService(userRepository);

        let dummyUser: User = {
            email: "test@gmail.com",
            username: "Test",
            password: "encrypted",
            id: 1,
            role: 0,
            friends: []
        };
        
        userRepository.getUserByIdAsync = jest.fn().mockResolvedValue(dummyUser) as any;
        
        const saveSpy = jest.spyOn(userRepository, 'saveRelationshipAsync');
        const userId = 1;
        const friendId = 99;
        const result = await userService.addFriendAsync(userId, friendId);

        expect(result.friends).toContain(friendId);
        expect(saveSpy).toHaveBeenCalled(); // Verifica que se guardo la relación en el repositorio
    });
});