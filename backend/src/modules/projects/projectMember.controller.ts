import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../middlewares/error.middleware.js';

export class ProjectMemberController {
  static async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: projectId } = req.params;

      const members = await prisma.projectMember.findMany({
        where: { projectId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              memberType: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      });

      // Calculate active assigned task count for each member in this project
      const memberUserIds = members.map((m) => m.userId);
      const activeTaskCounts = await prisma.task.groupBy({
        by: ['assigneeId'],
        where: {
          projectId,
          assigneeId: { in: memberUserIds },
          status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW', 'REVISION'] },
        },
        _count: { id: true },
      });

      const countMap = new Map(activeTaskCounts.map((c) => [c.assigneeId, c._count.id]));

      const result = members.map((m) => ({
        ...m.user,
        joinedAt: m.joinedAt,
        activeTasks: countMap.get(m.userId) || 0,
      }));

      sendSuccess(res, result, 'Project members retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: projectId } = req.params;
      const { userId } = req.body;

      if (!userId) throw new AppError('userId is required', 400);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError('User not found', 404);

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new AppError('Project not found', 404);
      if (project.status === 'CANCELLED') {
        throw new AppError('Cannot assign team members to a cancelled project.', 400);
      }

      const existing = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });

      if (existing) {
        throw new AppError('User is already a member of this project', 400);
      }

      const membership = await prisma.projectMember.create({
        data: { projectId, userId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
        },
      });

      sendSuccess(res, membership, 'Member added to project', 201);
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: projectId, userId } = req.params;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new AppError('Project not found', 404);

      // Prevent removing the Project Lead
      if (project.leadId === userId) {
        throw new AppError('Cannot remove the Project Lead from project members. Reassign the lead first.', 400);
      }

      await prisma.projectMember.delete({
        where: { projectId_userId: { projectId, userId } },
      });

      sendSuccess(res, null, 'Member removed from project');
    } catch (error) {
      next(error);
    }
  }
}
