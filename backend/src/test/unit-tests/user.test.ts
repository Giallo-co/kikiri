import { UserService } from '../../services/userService';
import { UserRepository } from '../../repositories/userRepository';
import { ServiceException } from '../../errors/ServiceException';
import { User } from '../../models/userModel';

const simulateExecution = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 500));

describe('UserService - CRUD', () => {

    let userService: UserService;
    let userRepositoryMock: Partial<UserRepository>;

    beforeEach(() => {
        userRepositoryMock = {
            save: jest.fn().mockResolvedValue({
                id: 1,
                publicId: "test-public-id",
                email: "test@test.com",
                username: "testuser",
                password: "hashed",
                role: 0
            } as User),
            findByEmail: jest.fn()
        };

        userService = new UserService(userRepositoryMock as UserRepository);
    });

    it('Should throw ServiceException if password is too short', async () => {
        await simulateExecution();
        await expect(
            userService.registerUserAsync({ email: 'a@a.com', username: 'a', password: '123' })
        ).rejects.toThrow(ServiceException);
    });

    it('Should create user successfully', async () => {
        await simulateExecution();
        const result = await userService.registerUserAsync({
            email: 'test@test.com', username: 'testuser', password: '12345678'
        });
        expect(result.id).toBe(1);
    });

    it('Should return user when email exists', async () => {
        await simulateExecution();
        const sampleUser: User = {
            id: 1, publicId: "test-public-id", email: "test@test.com", username: "testuser", password: "hashed", role: 0
        };

        (userRepositoryMock.findByEmail as jest.Mock).mockResolvedValue(sampleUser);
        const result = await userService.getUserByEmail("test@test.com");
        expect(result).toEqual(sampleUser);
    });

    it('Should return undefined when email does not exist', async () => {
        await simulateExecution();
        (userRepositoryMock.findByEmail as jest.Mock).mockResolvedValue(undefined);
        const result = await userService.getUserByEmail("noexist@test.com");
        expect(result).toBeUndefined();
    });

    it('Should update user successfully', async () => {
        await simulateExecution();
        const updatedUser: User = {
            id: 1, publicId: "test-public-id", email: "updated@test.com", username: "updatedUser", password: "hashed", role: 1
        };

        (userRepositoryMock.update as jest.Mock) = jest.fn().mockResolvedValue(updatedUser);
        const result = await userService.updateUser(1, { email: "updated@test.com", username: "updatedUser", role: 1 });
        expect(result).toEqual({ ...updatedUser, password: "encrypted" });
    });

    it('Should throw ServiceException when trying to update a non-existent user', async () => {
        await simulateExecution();
        (userRepositoryMock.update as jest.Mock) = jest.fn().mockResolvedValue(undefined);
        await expect(userService.updateUser(999, { username: "noOne" })).rejects.toThrow(ServiceException);
    });

    it('Should delete user successfully', async () => {
        await simulateExecution();
        (userRepositoryMock.delete as jest.Mock) = jest.fn().mockResolvedValue(true);
        const result = await userService.deleteUser(1);
        expect(result).toBe(true);
    });

    it('Should throw ServiceException when trying to delete a non-existent user', async () => {
        await simulateExecution();
        (userRepositoryMock.delete as jest.Mock) = jest.fn().mockResolvedValue(false);
        await expect(userService.deleteUser(999)).rejects.toThrow(ServiceException);
    });
});