import { Router } from 'express';
import { TaskController } from './task.controller.js';
import { MilestoneController } from '../milestones/milestone.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireProjectAccess, requireProjectLead } from '../../middlewares/projectAccess.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  addDependencySchema,
  toggleBlockerSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
} from './task.validation.js';

const router = Router();

router.use(authenticate);

// Task Direct Endpoints
router.get('/tasks/my', TaskController.getMyTasks);
router.get('/tasks/my-tasks', TaskController.getMyTasks);
router.get('/tasks/:id', TaskController.getTask);
router.put('/tasks/:id', validateRequest(updateTaskSchema), TaskController.updateTask);
router.delete('/tasks/:id', TaskController.deleteTask);
router.patch('/tasks/:id/status', validateRequest(updateTaskStatusSchema), TaskController.updateStatus);
router.post('/tasks/:id/dependencies', validateRequest(addDependencySchema), TaskController.addDependency);
router.delete('/tasks/:id/dependencies/:depId', TaskController.removeDependency);
router.patch('/tasks/:id/block', validateRequest(toggleBlockerSchema), TaskController.toggleBlocker);

// Milestone Direct Endpoints
router.put('/milestones/:id', validateRequest(updateMilestoneSchema), MilestoneController.updateMilestone);
router.delete('/milestones/:id', MilestoneController.deleteMilestone);

// Project-Scoped Milestones & Tasks Endpoints (Protected by Project Access)
router.get('/projects/:id/milestones', requireProjectAccess('id'), MilestoneController.listMilestones);
router.post('/projects/:id/milestones', requireProjectLead('id'), validateRequest(createMilestoneSchema), MilestoneController.createMilestone);
router.get('/projects/:id/tasks', requireProjectAccess('id'), TaskController.listTasks);
router.post('/projects/:id/tasks', requireProjectAccess('id'), validateRequest(createTaskSchema), TaskController.createTask);

export default router;
