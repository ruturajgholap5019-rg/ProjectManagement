import { Router } from 'express';
import { ActivityController } from './activity.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', ActivityController.logActivity);
router.get('/', ActivityController.listActivities);
router.get('/export/csv', ActivityController.exportActivitiesCSV);

export default router;
