import { Router } from 'express';
import { ReportController } from './report.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';
import { UserRole } from '../../types/enums.js';

const router = Router();

router.use(authenticate);

// Admin-only: export full Excel report (Dashboard + Projects + Tasks + Activity Log)
router.get('/export/excel', requireRoles(UserRole.ADMIN), ReportController.exportExcel);

export default router;
