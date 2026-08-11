import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/notifications', NotificationController.getNotifications);
router.patch('/notifications/read-all', NotificationController.markAllAsRead);

export default router;
