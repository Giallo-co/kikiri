import { Request, Response, NextFunction } from "express";
import { InteractionRepository } from "../repositories/interactionRepository";

export class InteractionController {
  constructor(private interactionRepository: InteractionRepository) {}

  async likePost(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = Number(req.params.postId);
      const { userId } = req.body; // En el futuro esto debería venir del JWT Auth, es decir:
      // const userId = req.user.id;

      if (isNaN(postId) || typeof userId !== 'number') {
        return res.status(400).json({ message: "Datos inválidos" });
      }

      const alreadyLiked = await this.interactionRepository.checkUserLikedPost(userId, postId);
      if (alreadyLiked) {
        return res.status(400).json({ message: "El usuario ya dio like a este post" });
      }

      await this.interactionRepository.addLike(userId, postId);
      return res.status(200).json({ message: "Like agregado correctamente" });
    } catch (error) {
      next(error);
    }
  }

  async unlikePost(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = Number(req.params.postId);
      const { userId } = req.body;

      if (isNaN(postId) || typeof userId !== 'number') {
        return res.status(400).json({ message: "Datos inválidos" });
      }

      await this.interactionRepository.removeLike(userId, postId);
      return res.status(200).json({ message: "Like removido correctamente" });
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = Number(req.params.postId);
      const { userId, content } = req.body;

      if (isNaN(postId) || typeof userId !== 'number' || !content) {
        return res.status(400).json({ message: "Datos incompletos o inválidos" });
      }

      const comment = await this.interactionRepository.addComment(userId, postId, content);
      return res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  }

  async getComments(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = Number(req.params.postId);
      if (isNaN(postId)) {
        return res.status(400).json({ message: "postId inválido" });
      }

      const comments = await this.interactionRepository.getCommentsByPost(postId);
      return res.status(200).json(comments);
    } catch (error) {
      next(error);
    }
  }

  async sharePost(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = Number(req.params.postId);
      const { userId } = req.body; 

      if (isNaN(postId) || typeof userId !== 'number') {
        return res.status(400).json({ message: "Datos inválidos" });
      }

      const alreadyShared = await this.interactionRepository.checkUserSharedPost(userId, postId);
      
      if (alreadyShared) {
        return res.status(200).json({ message: "Post listo para compartir (Ya registrado previamente)" });
      }

      await this.interactionRepository.addShare(userId, postId);
      return res.status(200).json({ message: "Post compartido y contador actualizado" });
      
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
      // Tomamos el ID del comentario de la URL (/v1/comments/5)
      const commentId = Number(req.params.commentId); 
      const { userId } = req.body; // En el futuro esto vendrá de req.user

      if (isNaN(commentId) || typeof userId !== 'number') {
        return res.status(400).json({ message: "Datos inválidos" });
      }

      const comment = await this.interactionRepository.getCommentById(commentId);

      if (!comment) {
        return res.status(404).json({ message: "Comentario no encontrado" });
      }

      if (comment.userId !== userId) {
        return res.status(403).json({ message: "No tienes permiso para eliminar este comentario" });
      }

      await this.interactionRepository.deleteComment(commentId);
      return res.status(200).json({ message: "Comentario eliminado exitosamente" });

    } catch (error) {
      next(error);
    }
  }
}