import { UserRepository } from '../repositories/userRepository';
import { ServiceException } from '../errors/ServiceException';
import { User } from '../models/userModel';

export class SearchService {
  constructor(private readonly userRepository: UserRepository) {}

  public async searchUsers(q: string, page = 1, limit = 20): Promise<{ data: Partial<User>[]; total: number; page: number; limit: number }> {
    if (!q || q.trim() === '') {
      return { data: [], total: 0, page, limit };
    }

    const pageNum = Math.max(1, page);
    const take = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * take;

    try {
      const { data, total } = await this.userRepository.searchByQuery(q.trim(), skip, take);
      const sanitized = data.map((u: any) => ({
        id: u.id,
        publicId: u.publicId,
        username: u.username,
        email: u.email,
        role: u.role,
      })) as Partial<User>[];

      return { data: sanitized, total, page: pageNum, limit: take };
    } catch (err) {
      console.error('SearchService.searchUsers error', err);
      throw new ServiceException(2001, 'Error searching users');
    }
  }

  public async getUserByIdOrPublicId(idOrPublicId: string): Promise<Partial<User> | undefined> {
    try {
      const byPublic = await this.userRepository.findByPublicId(idOrPublicId);
      if (byPublic) {
        const { password, ...safe } = byPublic as any;
        return safe as Partial<User>;
      }

      const asNumber = Number(idOrPublicId);
      if (!Number.isNaN(asNumber)) {
        const byId = await this.userRepository.findById(asNumber);
        if (byId) {
          const { password, ...safe } = byId as any;
          return safe as Partial<User>;
        }
      }

      return undefined;
    } catch (err) {
      console.error('SearchService.getUserByIdOrPublicId error', err);
      throw new ServiceException(2002, 'Error retrieving user');
    }
  }
}