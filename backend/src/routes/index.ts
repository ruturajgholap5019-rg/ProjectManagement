import { Router } from 'express';
import { AuthController } from '../modules/auth/auth.controller.js';
import { UserController } from '../modules/users/user.controller.js';
import projectRouter from '../modules/projects/project.routes.js';
import taskRouter from '../modules/tasks/task.routes.js';
import collaborationRouter from '../modules/collaboration/collaboration.routes.js';
import dashboardRouter from '../modules/dashboard/dashboard.routes.js';
import activityRouter from '../modules/activities/activity.routes.js';
import searchRouter from '../modules/search/search.routes.js';
import skillRouter from '../modules/skills/skill.routes.js';
import notificationRouter from '../modules/notifications/notification.routes.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { UserRole } from '../types/enums.js';

const router = Router();

// ----------------------------------------------------------------------------
// AUTH ROUTES (/api/v1/auth)
// ----------------------------------------------------------------------------
const authRouter = Router();

authRouter.post('/login', AuthController.login);
authRouter.post('/refresh', AuthController.refreshToken);
authRouter.post('/logout', AuthController.logout);
authRouter.get('/me', authenticate, AuthController.me);
authRouter.put('/me', authenticate, AuthController.updateProfile);
authRouter.post('/change-password', authenticate, AuthController.changePassword);

router.use('/auth', authRouter);

// ----------------------------------------------------------------------------
// USER ROUTES (/api/v1/users) — ADMIN ONLY
// ----------------------------------------------------------------------------
const userRouter = Router();

userRouter.use(authenticate);
userRouter.use(requireRoles(UserRole.ADMIN));

userRouter.get('/', UserController.listUsers);
userRouter.get('/:id', UserController.getUserById);
userRouter.post('/', UserController.createUser);
userRouter.put('/:id', UserController.updateUser);
userRouter.patch('/:id/activate', UserController.activateUser);
userRouter.patch('/:id/deactivate', UserController.deactivateUser);
userRouter.post('/:id/reset-password', UserController.resetPassword);
userRouter.delete('/:id', UserController.deleteUser);

router.use('/users', userRouter);

// ----------------------------------------------------------------------------
// PROJECT ROUTES (/api/v1/projects)
// ----------------------------------------------------------------------------
router.use('/projects', projectRouter);

// ----------------------------------------------------------------------------
// MILESTONES & TASKS ROUTES
// ----------------------------------------------------------------------------
router.use('/', taskRouter);

// ----------------------------------------------------------------------------
// COLLABORATION ROUTES
// ----------------------------------------------------------------------------
router.use('/', collaborationRouter);

// ----------------------------------------------------------------------------
// DASHBOARD ROUTES
// ----------------------------------------------------------------------------
router.use('/', dashboardRouter);

// ----------------------------------------------------------------------------
// WORK ACTIVITIES, SEARCH, SKILLS & NOTIFICATIONS ROUTES
// ----------------------------------------------------------------------------
router.use('/activities', activityRouter);
router.use('/search', searchRouter);
router.use('/skills', skillRouter);
router.use('/', notificationRouter);

export default router;
