import { UserRepository } from "../../repositories/userRepository";
import { UserService } from "../../services/userService";
import { User } from "../../models/userModel";

const simulateExecution = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 500));

jest.mock("../../repositories/userRepository");

describe('UserService - Follow Logic', () => {
    let userService: UserService;
    let userRepository: UserRepository;
    let dummyUser: User;
    let targetUser: User;

    beforeEach(() => {
        userRepository = new UserRepository();
        userService = new UserService(userRepository);

        dummyUser = {
            id: 1, publicId: "uuid-1", email: "test@gmail.com", username: "Test", password: "encrypted", role: 0
        };

        targetUser = {
            id: 99, publicId: "uuid-99", email: "target@gmail.com", username: "Target", password: "encrypted", role: 0
        };
    });

    it('should follow a user', async () => {
        await simulateExecution();
        (userRepository.findById as jest.Mock)
            .mockResolvedValueOnce(dummyUser)
            .mockResolvedValueOnce(targetUser);
        
        (userRepository.followUser as jest.Mock).mockResolvedValue(undefined);

        await userService.followUser(1, 99);

        expect(userRepository.followUser).toHaveBeenCalledWith(1, 99);
    });

    it('should get the list of following', async () => {
        await simulateExecution();
        (userRepository.findById as jest.Mock).mockResolvedValue(dummyUser);
        (userRepository.getFollowingIds as jest.Mock).mockResolvedValue([10, 20]);

        const following = await userService.getFollowing(1);

        expect(following).toEqual([10, 20]);
    });

    it('should unfollow a user', async () => {
        await simulateExecution();
        (userRepository.findById as jest.Mock).mockResolvedValue(dummyUser);
        (userRepository.unfollowUser as jest.Mock).mockResolvedValue(undefined);

        await userService.unfollowUser(1, 99);

        expect(userRepository.unfollowUser).toHaveBeenCalledWith(1, 99);
    });

    it('should throw error if user tries to follow themselves', async () => {
        await simulateExecution();
        await expect(userService.followUser(1, 1))
            .rejects
            .toThrow("A user cannot follow themselves.");
    });
});