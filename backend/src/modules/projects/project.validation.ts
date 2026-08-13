import { z } from 'zod';
import { ProjectType, Priority } from '../../types/enums.js';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Project name is required').max(255),
    description: z.string().optional(),
    scope: z.string().optional(),
    projectType: z.string().min(1, 'Project category is required'),
    leadId: z.string().optional().nullable(),
    priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
    startDate: z.string().optional().nullable(),
    targetEndDate: z.string().optional().nullable(),
    maintenanceRequired: z.boolean().optional(),
    maintenanceNotes: z.string().optional(),
    memberIds: z.array(z.string()).optional(),
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    scope: z.string().optional(),
    projectType: z.string().optional(),
    leadId: z.string().optional().nullable(),
    priority: z.nativeEnum(Priority).optional(),
    status: z.enum(['PLANNING', 'ONGOING', 'ACTIVE', 'ON_HOLD', 'AT_RISK', 'COMPLETED', 'CANCELLED']).optional(),
    statusReason: z.string().optional(),
    startDate: z.string().optional().nullable(),
    targetEndDate: z.string().optional().nullable(),
    maintenanceRequired: z.boolean().optional(),
    maintenanceNotes: z.string().optional(),
  }),
});

export const updateProjectStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PLANNING', 'ONGOING', 'ACTIVE', 'ON_HOLD', 'AT_RISK', 'COMPLETED', 'CANCELLED']),
    statusReason: z.string().optional(),
  }).refine((data) => {
    if (['AT_RISK', 'ON_HOLD', 'CANCELLED'].includes(data.status)) {
      return typeof data.statusReason === 'string' && data.statusReason.trim().length > 0;
    }
    return true;
  }, {
    message: 'statusReason is required when status is changed to AT_RISK, ON_HOLD, or CANCELLED',
    path: ['statusReason'],
  }),
});
