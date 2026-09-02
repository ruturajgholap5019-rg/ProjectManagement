import { ActivityLog, User } from '../models/index.js';

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
      return await ActivityLog.create({
        userId: input.userId,
        action: input.action,
        projectId: input.projectId || null,
        taskId: input.taskId || null,
        details: input.details ? JSON.stringify(input.details) : null,
      });
    } catch (error) {
      console.error('Failed to log audit activity:', error);
      // Audit logging errors should not throw or break the main operation
    }
  }

  static async getLogs(query: { projectId?: string; taskId?: string; userId?: string; limit?: number }) {
    const filter: Record<string, any> = {};
    if (query.projectId) filter.projectId = query.projectId;
    if (query.taskId) filter.taskId = query.taskId;
    if (query.userId) filter.userId = query.userId;

    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit || 50)
      .lean();

    const userIds = [...new Set(logs.map((l: any) => l.userId).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }, 'firstName lastName role _id').lean();
    const userMap = new Map(users.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName, role: u.role }]));

    return logs.map((log: any) => ({
      ...log,
      id: log._id,
      user: userMap.get(log.userId) || null,
    }));
  }
}
