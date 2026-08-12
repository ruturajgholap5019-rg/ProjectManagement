import { Router } from 'express';
import { TaskController } from './task.controller.js';
import { MilestoneController } from '../milestones/milestone.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
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

// Project-Scoped Milestones & Tasks Endpoints
router.get('/projects/:id/milestones', MilestoneController.listMilestones);
router.post('/projects/:id/milestones', validateRequest(createMilestoneSchema), MilestoneController.createMilestone);
router.get('/projects/:id/tasks', TaskController.listTasks);
router.post('/projects/:id/tasks', validateRequest(createTaskSchema), TaskController.createTask);

export default router;
