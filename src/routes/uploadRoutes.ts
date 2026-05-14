import { Router } from 'express';
import { UploadController } from '../controllers/uploadController';
import { S3PresignService } from '../services/s3PresignService';
import { UserRepository } from '../repositories/userRepository';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();
const uploadController = new UploadController(new S3PresignService(), new UserRepository());

router.post('/v1/uploads/presign', authenticateToken, (req, res, next) => uploadController.presign(req, res, next));

export default router;
