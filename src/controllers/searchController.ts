import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search_by_nameid';
import { UserRepository } from '../repositories/userRepository';

export class SearchController {
  private readonly searchService: SearchService;

  constructor() {
    const userRepository = new UserRepository();
    this.searchService = new SearchService(userRepository);
  }

  public async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q ?? '').trim();
      if (!q) {
        return res.json({ data: [], total: 0, page: 1, limit: 20 }); // esto deberia devolver nada si no se busca nada (si no se meten caracteres a buscar)
      }

      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(100, Number(req.query.limit ?? 20));

      const result = await this.searchService.searchUsers(q, page, limit);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const idOrPublicId = String(req.params.id);
      const user = await this.searchService.getUserByIdOrPublicId(idOrPublicId);

      if (!user) return res.status(404).json({ message: 'User not found' });

      return res.json(user);
    } catch (error) {
      next(error);
    }
  }
}