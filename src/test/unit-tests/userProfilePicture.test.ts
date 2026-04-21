import { UserService } from '../../services/userService';
import { UserRepository } from '../../repositories/userRepository';
import { ServiceException } from '../../errors/ServiceException';

describe('UserService.setProfilePictureKey', () => {
  const updateProfilePictureKey = jest.fn();

  const repo = {
    updateProfilePictureKey
  } as unknown as UserRepository;

  const service = new UserService(repo);

  beforeEach(() => {
    updateProfilePictureKey.mockReset();
  });

  it('updates when actor matches user and key is valid', async () => {
    updateProfilePictureKey.mockResolvedValue({
      id: 5,
      publicId: 'p',
      email: 'e',
      username: 'u',
      password: 'x',
      role: 0,
      profilePictureKey: 'img/users/pictures/5/avatar-a.jpg'
    });

    const user = await service.setProfilePictureKey(5, 5, 'img/users/pictures/5/avatar-a.jpg');
    expect(updateProfilePictureKey).toHaveBeenCalledWith(5, 'img/users/pictures/5/avatar-a.jpg');
    expect(user.profilePictureKey).toBe('img/users/pictures/5/avatar-a.jpg');
  });

  it('returns 403 when actor is not the target user', async () => {
    await expect(
      service.setProfilePictureKey(1, 2, 'img/users/pictures/2/avatar-a.jpg')
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(updateProfilePictureKey).not.toHaveBeenCalled();
  });

  it('rejects key that does not belong to user', async () => {
    await expect(
      service.setProfilePictureKey(3, 3, 'img/users/pictures/4/avatar-a.jpg')
    ).rejects.toBeInstanceOf(ServiceException);
    expect(updateProfilePictureKey).not.toHaveBeenCalled();
  });
});
