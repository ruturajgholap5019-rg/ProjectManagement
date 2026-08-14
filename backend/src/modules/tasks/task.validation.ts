import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Task title is required').max(500),
    description: z.string().optional(),
    assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
    coAssigneeId: z.string().uuid('Invalid co-assignee ID').optional().nullable(),
    milestoneId: z.string().uuid('Invalid milestone ID').optional().nullable(),
    parentTaskId: z.string().uuid('Invalid parent task ID').optional().nullable(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    startDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
  }),
});

export const updateTaskStatusSchema = z.object({
  body: z.object({
    status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().optional(),
    assigneeId: z.string().uuid().optional().nullable(),
    coAssigneeId: z.string().uuid().optional().nullable(),
    milestoneId: z.string().uuid().optional().nullable(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    startDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
  }),
});

export const addDependencySchema = z.object({
  body: z.object({
    dependsOnId: z.string().uuid('Invalid dependency task ID'),
  }),
});

export const toggleBlockerSchema = z.object({
  body: z.object({
    isBlocked: z.boolean(),
    blockedReason: z.string().optional(),
  }),
});

export const createMilestoneSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Milestone name is required').max(255),
    description: z.string().optional(),
    sortOrder: z.number().int().optional(),
    startDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
  }),
});

export const updateMilestoneSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
    sortOrder: z.number().int().optional(),
    startDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
  }),
});
