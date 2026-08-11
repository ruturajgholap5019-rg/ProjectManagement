import { Router } from 'express';
import { ProjectController } from './project.controller.js';
import { ProjectMemberController } from './projectMember.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';
import { requireProjectAccess } from '../../middlewares/projectAccess.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { createProjectSchema, updateProjectSchema, updateProjectStatusSchema } from './project.validation.js';
import { UserRole } from '../../types/enums.js';

const router = Router();

router.use(authenticate);

// List projects visible to current user
router.get('/', ProjectController.listProjects);

// Admin creates project
router.post(
  '/',
  requireRoles(UserRole.ADMIN),
  validateRequest(createProjectSchema),
  ProjectController.createProject
);

// View project details (requires membership / Lead / Admin)
router.get('/:id', requireProjectAccess('id'), ProjectController.getProject);

// Update project details (Lead / Admin)
router.put(
  '/:id',
  requireProjectAccess('id'),
  validateRequest(updateProjectSchema),
  ProjectController.updateProject
);

// Update project status with statusReason validation (Lead / Admin)
router.patch(
  '/:id/status',
  requireProjectAccess('id'),
  validateRequest(updateProjectStatusSchema),
  ProjectController.updateStatus
);

// Soft delete project -> CANCELLED (Admin only)
router.delete(
  '/:id',
  requireRoles(UserRole.ADMIN),
  ProjectController.deleteProject
);

// ----------------------------------------------------------------------------
// PROJECT MEMBER ENDPOINTS
// ----------------------------------------------------------------------------
router.get('/:id/members', requireProjectAccess('id'), ProjectMemberController.listMembers);
router.post('/:id/members', requireProjectAccess('id'), ProjectMemberController.addMember);
router.delete('/:id/members/:userId', requireProjectAccess('id'), ProjectMemberController.removeMember);

export default router;
