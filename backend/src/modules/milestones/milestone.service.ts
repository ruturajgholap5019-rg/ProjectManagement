import { prisma } from '../../config/database.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { MilestoneStatus } from '../../types/enums.js';

export class MilestoneService {
  static async createMilestone(projectId: string, data: { name: string; description?: string; sortOrder?: number; startDate?: string; dueDate?: string }) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError('Project not found', 404);

    const sortOrder = data.sortOrder ?? (await prisma.milestone.count({ where: { projectId } }));

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        name: data.name.trim(),
        description: data.description?.trim(),
        sortOrder,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    return milestone;
  }

  static async listMilestones(projectId: string) {
    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Derive completed tasks count for each milestone
    const milestoneIds = milestones.map((m: any) => m.id);
    const completedCounts = await prisma.task.groupBy({
      by: ['milestoneId'],
      where: {
        milestoneId: { in: milestoneIds },
        status: 'COMPLETED',
      },
      _count: { id: true },
    });

    const countMap = new Map(completedCounts.map((c: any) => [c.milestoneId!, c._count.id]));

    return milestones.map((m: any) => ({
      ...m,
      totalTasks: m._count.tasks,
      completedTasks: countMap.get(m.id) || 0,
    }));
  }

  static async updateMilestone(id: string, data: { name?: string; description?: string; status?: MilestoneStatus; sortOrder?: number; startDate?: string; dueDate?: string }) {
    const existing = await prisma.milestone.findUnique({ where: { id } });
    if (!existing) throw new AppError('Milestone not found', 404);

    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        description: data.description?.trim(),
        status: data.status,
        sortOrder: data.sortOrder,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });

    return updated;
  }

  static async deleteMilestone(id: string) {
    const existing = await prisma.milestone.findUnique({ where: { id } });
    if (!existing) throw new AppError('Milestone not found', 404);

    await prisma.milestone.delete({ where: { id } });
    return { message: 'Milestone deleted. Tasks unlinked.' };
  }
}
