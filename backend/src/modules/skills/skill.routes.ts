import { Router } from 'express';
import { SkillController } from './skill.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/:userId', SkillController.addSkill);
router.get('/:userId', SkillController.getUserSkills);
router.get('/:userId/timeline', SkillController.getUserTimeline);

export default router;
