import { Router } from 'express';
import { CollaborationController } from './collaboration.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { uploadMiddleware } from '../../middlewares/upload.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/comments', CollaborationController.createComment);
router.get('/comments', CollaborationController.listComments);
router.get('/attachments', CollaborationController.listAttachments);
router.post('/attachments', uploadMiddleware.single('file'), CollaborationController.uploadAttachment);
router.get('/attachments/:attachmentId/download', CollaborationController.downloadAttachment);

export default router;
