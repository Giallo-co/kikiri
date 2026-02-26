import { UserRepository } from "../../repositories/userRepository";
import { UserService } from "../../services/userService";
import { User } from "../../models/user";

// Mock del UserRepository
jest.mock("../../repositories/userRepository");

describe('UserService - Friendship Logic', () => {
    let userService: UserService;
    let userRepository: UserRepository;
    let dummyUser: User;

    beforeEach(() => {
        // Reiniciamos mocks y datos antes de cada test
        userRepository = new UserRepository();
        userService = new UserService(userRepository);

        dummyUser = {
            email: "test@gmail.com",
            username: "Test",
            password: "encrypted",
            id: 1,
            role: 0,
            friends: [10, 20]
        };
    });

    it('should add a friend to the user list', async () => {
        // Setup
        (userRepository.getUserByIdAsync as jest.Mock).mockResolvedValue(dummyUser);
        const saveSpy = userRepository.saveRelationshipAsync as jest.Mock;
        const result = await userService.addFriendAsync(1, 99);

        expect(result.friends).toContain(99);
        expect(result.friends).toHaveLength(3);
        expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    });

    it('should get the list of friends', async () => {
        (userRepository.getUserByIdAsync as jest.Mock).mockResolvedValue(dummyUser);

        const friends = await userService.getFriends(1);

        expect(friends).toEqual([10, 20]);
    });

    it('should remove a friend from the list', async () => {
        (userRepository.getUserByIdAsync as jest.Mock).mockResolvedValue(dummyUser);
        const saveSpy = userRepository.saveRelationshipAsync as jest.Mock;

        const result = await userService.removeFriend(1, 10);

        expect(result.friends).not.toContain(10);
        expect(result.friends).toContain(20);
        expect(saveSpy).toHaveBeenCalled();
    });

    it('should update the entire friend list', async () => {
        (userRepository.getUserByIdAsync as jest.Mock).mockResolvedValue(dummyUser);
        const saveSpy = userRepository.saveRelationshipAsync as jest.Mock;

        const newFriends = [100, 200, 300];
        const result = await userService.updateFriendList(1, newFriends);

        expect(result.friends).toEqual(newFriends);
        expect(saveSpy).toHaveBeenCalled();
    });

    it('should throw error if user does not exist', async () => {
        (userRepository.getUserByIdAsync as jest.Mock).mockResolvedValue(undefined);

        await expect(userService.getFriends(999))
            .rejects
            .toThrow("User not found");
    });
});