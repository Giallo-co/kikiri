import { Request, Response, NextFunction } from 'express';
import { UserPostService } from '../services/userPostService';
import { getAuthUserId } from '../utils/authRequest';

export class UserPostController {
  constructor(private readonly userPostService: UserPostService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = getAuthUserId(req);
      if (actorId === undefined) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { title, body, imageKeys, audioKey } = req.body as {
        title?: string;
        body?: string;
        imageKeys?: string[];
        audioKey?: string;
      };

      const post = await this.userPostService.createPost(actorId, {
        title: title ?? '',
        body: body ?? '',
        imageKeys: Array.isArray(imageKeys) ? imageKeys : [],
        audioKey: audioKey ?? ''
      });

      return res.status(201).json({ post });
    } catch (err) {
      next(err);
    }
  };

  listByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requesterId = getAuthUserId(req);
      if (requesterId === undefined) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const targetUserId = Number(req.params.userId);
      if (!Number.isFinite(targetUserId)) {
        return res.status(400).json({ message: 'Invalid userId' });
      }

      const posts = await this.userPostService.listPostsForUser(requesterId, targetUserId);
      return res.status(200).json({ userId: String(targetUserId), posts });
    } catch (err) {
      next(err);
    }
  };
}
