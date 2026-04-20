import { Request, Response, NextFunction } from "express";
import { FeedService } from "../services/feedService";

export class FeedController {
  constructor(private feedService: FeedService) {}

  async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid userId" });
      }

      // se pasa el userId para hacerlo personalizado a futuro
      const feed = await this.feedService.generateFeed(userId);

      return res.status(200).json(feed);
    } catch (error) {
      next(error);
    }
  }
}