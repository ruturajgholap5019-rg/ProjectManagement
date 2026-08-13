import { Router } from 'express';
import { ClientController } from './client.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';
import { UserRole } from '../../types/enums.js';

const router = Router();

router.use(authenticate);

router.get('/', ClientController.getAllClients);
router.get('/:id', ClientController.getClientById);
router.post('/', requireRoles(UserRole.ADMIN), ClientController.createClient);
router.put('/:id', requireRoles(UserRole.ADMIN), ClientController.updateClient);
router.delete('/:id', requireRoles(UserRole.ADMIN), ClientController.deleteClient);

export default router;
