import { Router } from 'express';
import { CategoryController } from './category.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';
import { UserRole } from '../../types/enums.js';

const router = Router();

router.use(authenticate);

// Public / Authenticated users can list active categories
router.get('/', CategoryController.listCategories);

// Admin-only CRUD operations
router.post('/', requireRoles(UserRole.ADMIN), CategoryController.createCategory);
router.put('/:id', requireRoles(UserRole.ADMIN), CategoryController.updateCategory);
router.delete('/:id', requireRoles(UserRole.ADMIN), CategoryController.deleteCategory);

export default router;
