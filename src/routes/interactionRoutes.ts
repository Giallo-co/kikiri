import { Router } from 'express';
import { InteractionController } from '../controllers/interactionController';
import { InteractionRepository } from '../repositories/interactionRepository';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

const interactionRepository = new InteractionRepository();
const interactionController = new InteractionController(interactionRepository);

// Rutas de Likes
router.post("/v1/posts/:postId/like", authenticateToken, (req, res, next) => interactionController.likePost(req, res, next));
router.delete("/v1/posts/:postId/like", authenticateToken, (req, res, next) => interactionController.unlikePost(req, res, next));

// Rutas de Comentarios
router.post("/v1/posts/:postId/comment", authenticateToken, (req, res, next) => interactionController.addComment(req, res, next));
router.get("/v1/posts/:postId/comments", authenticateToken, (req, res, next) => interactionController.getComments(req, res, next));
router.delete("/v1/comments/:commentId", authenticateToken, (req, res, next) => interactionController.deleteComment(req, res, next));

// Rutas de Shares
router.post("/v1/posts/:postId/share", authenticateToken, (req, res, next) => interactionController.sharePost(req, res, next));

export default router;