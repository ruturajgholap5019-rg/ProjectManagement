import { Router } from 'express';
import { SearchController } from './search.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', SearchController.search);

export default router;
