import { prisma } from '../config/database.js';

export interface AuditLogInput {
  userId: string;
  action: string;
  projectId?: string;
  taskId?: string;
  details?: Record<string, any>;
}

export class AuditService {
  static async log(input: AuditLogInput) {
    try {
      return await prisma.activityLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          projectId: input.projectId || null,
          taskId: input.taskId || null,
          details: input.details ? JSON.stringify(input.details) : null,
        },
      });
    } catch (error) {
      console.error('Failed to log audit activity:', error);
      // Audit logging errors should not throw or break the main operation
    }
  }

  static async getLogs(query: { projectId?: string; taskId?: string; userId?: string; limit?: number }) {
    const where: any = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.taskId) where.taskId = query.taskId;
    if (query.userId) where.userId = query.userId;

    return prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit || 50,
    });
  }
}
