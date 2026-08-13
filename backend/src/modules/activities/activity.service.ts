import { prisma } from '../../config/database.js';
import { AppError } from '../../middlewares/error.middleware.js';

export interface CreateActivityInput {
  userId: string;
  projectId: string;
  workDescription: string;
  hoursSpent: number;
  assignedById?: string;
  dateTime?: string;
}

export class ActivityService {
  static async logActivity(input: CreateActivityInput) {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new AppError('Project not found', 404);

    const activity = await prisma.$transaction(async (tx) => {
      const maxSerial = await tx.workActivity.aggregate({
        _max: { serialNo: true },
      });
      const nextSerialNo = (maxSerial._max.serialNo || 0) + 1;

      return tx.workActivity.create({
        data: {
          serialNo: nextSerialNo,
          userId: input.userId,
          projectId: input.projectId,
          workDescription: input.workDescription.trim(),
          hoursSpent: Number(input.hoursSpent) || 1.0,
          assignedById: input.assignedById || null,
          dateTime: input.dateTime ? new Date(input.dateTime) : new Date(),
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          project: { select: { id: true, name: true, projectType: true, status: true } },
          assignedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });

    return activity;
  }

  static async listActivities(filters: {
    userId?: string;
    projectId?: string;
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.projectId) where.projectId = filters.projectId;

    if (filters.search) {
      where.OR = [
        { workDescription: { contains: filters.search } },
        { user: { firstName: { contains: filters.search } } },
        { user: { lastName: { contains: filters.search } } },
        { project: { name: { contains: filters.search } } },
      ];
    }

    // Time Period Filter Logic
    const now = new Date();
    if (filters.period === 'daily') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.dateTime = { gte: startOfDay };
    } else if (filters.period === 'weekly') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      where.dateTime = { gte: startOfWeek };
    } else if (filters.period === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      where.dateTime = { gte: startOfMonth };
    } else if (filters.period === 'yearly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      where.dateTime = { gte: startOfYear };
    } else if (filters.period === 'custom' && (filters.startDate || filters.endDate)) {
      where.dateTime = {};
      if (filters.startDate) where.dateTime.gte = new Date(filters.startDate);
      if (filters.endDate) where.dateTime.lte = new Date(filters.endDate);
    }

    const activities = await prisma.workActivity.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true, projectType: true, status: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dateTime: 'desc' },
    });

    const totalHours = activities.reduce((acc: number, a: any) => acc + a.hoursSpent, 0);

    return {
      activities,
      totalHours,
      count: activities.length,
    };
  }

  static async exportToCSV(filters: any) {
    const { activities, totalHours } = await this.listActivities(filters);

    // UTF-8 Byte Order Mark (BOM) for perfect Microsoft Excel rendering
    let csv = '\uFEFF';
    csv += 'DIGITAL PROJECT TRACKER — WORK ACTIVITY LOG REPORT\n';
    csv += `Report Generated On: ${new Date().toLocaleString()}\n`;
    csv += `Total Time Logged: ${totalHours.toFixed(1)} Hours\n`;
    csv += `Total Activity Records: ${activities.length}\n\n`;

    csv += 'Serial Number,Date & Time,Team Member (Student),Project Name,Work Description,Hours Spent,Assigned By\n';

    activities.forEach((a: any) => {
      const dateStr = new Date(a.dateTime).toISOString().replace('T', ' ').slice(0, 19);
      const member = `"${(a.user?.firstName + ' ' + a.user?.lastName).replace(/"/g, '""')}"`;
      const proj = `"${(a.project?.name || 'General').replace(/"/g, '""')}"`;
      const desc = `"${(a.workDescription || '').replace(/"/g, '""')}"`;
      const assigner = a.assignedBy ? `"${(a.assignedBy.firstName + ' ' + a.assignedBy.lastName).replace(/"/g, '""')}"` : '"Admin"';

      csv += `${a.serialNo},${dateStr},${member},${proj},${desc},${a.hoursSpent},${assigner}\n`;
    });

    return csv;
  }

  static async updateActivity(
    id: string,
    input: { workDescription?: string; hoursSpent?: number; projectId?: string; dateTime?: string; userId?: string },
    currentUser: { id: string; role: string }
  ) {
    const activity = await prisma.workActivity.findUnique({ where: { id } });
    if (!activity) throw new AppError('Work activity log not found', 404);

    if (currentUser.role !== 'ADMIN' && activity.userId !== currentUser.id) {
      throw new AppError('You do not have permission to edit this work activity log', 403);
    }

    if (input.projectId) {
      const project = await prisma.project.findUnique({ where: { id: input.projectId } });
      if (!project) throw new AppError('Project not found', 404);
    }

    return prisma.workActivity.update({
      where: { id },
      data: {
        ...(input.workDescription !== undefined && { workDescription: input.workDescription.trim() }),
        ...(input.hoursSpent !== undefined && { hoursSpent: Number(input.hoursSpent) || 1.0 }),
        ...(input.projectId !== undefined && { projectId: input.projectId }),
        ...(input.userId !== undefined && currentUser.role === 'ADMIN' && { userId: input.userId }),
        ...(input.dateTime !== undefined && { dateTime: new Date(input.dateTime) }),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true, projectType: true, status: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  static async deleteActivity(id: string, currentUser: { id: string; role: string }) {
    const activity = await prisma.workActivity.findUnique({ where: { id } });
    if (!activity) throw new AppError('Work activity log not found', 404);

    if (currentUser.role !== 'ADMIN' && activity.userId !== currentUser.id) {
      throw new AppError('You do not have permission to delete this work activity log', 403);
    }

    await prisma.workActivity.delete({ where: { id } });
    return { success: true, message: 'Work activity log deleted successfully' };
  }
}
