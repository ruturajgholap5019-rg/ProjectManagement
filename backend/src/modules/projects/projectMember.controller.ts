import { Request, Response, NextFunction } from 'express';
import { ProjectMember, User, Project, Task } from '../../models/index.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../middlewares/error.middleware.js';

export class ProjectMemberController {
  static async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: projectId } = req.params;

      const members = await ProjectMember.find({ projectId }).sort({ joinedAt: 1 }).lean();
      const memberUserIds = members.map((m: any) => m.userId);

      const users = await User.find(
        { _id: { $in: memberUserIds } },
        'firstName lastName email role memberType avatarUrl _id'
      ).lean();
      const userMap = new Map(users.map((u: any) => [u._id, u]));

      // Active tasks count for each member in this project
      const tasks = await Task.find({
        projectId,
        assigneeId: { $in: memberUserIds },
        status: { $in: ['TODO', 'IN_PROGRESS', 'REVIEW', 'REVISION'] },
      }, 'assigneeId').lean();

      const taskCountMap = new Map<string, number>();
      for (const t of tasks) {
        if ((t as any).assigneeId) {
          taskCountMap.set((t as any).assigneeId, (taskCountMap.get((t as any).assigneeId) || 0) + 1);
        }
      }

      const result = members.map((m: any) => {
        const u = userMap.get(m.userId);
        return {
          id: u ? (u as any)._id : m.userId,
          firstName: u ? (u as any).firstName : '',
          lastName: u ? (u as any).lastName : '',
          email: u ? (u as any).email : '',
          role: u ? (u as any).role : '',
          memberType: u ? (u as any).memberType : null,
          avatarUrl: u ? (u as any).avatarUrl : null,
          joinedAt: m.joinedAt,
          activeTasks: taskCountMap.get(m.userId) || 0,
        };
      });

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

      const user = await User.findById(userId);
      if (!user) throw new AppError('User not found', 404);

      const project = await Project.findById(projectId);
      if (!project) throw new AppError('Project not found', 404);
      if (project.status === 'CANCELLED') {
        throw new AppError('Cannot assign team members to a cancelled project.', 400);
      }

      const existing = await ProjectMember.findOne({ projectId, userId });
      if (existing) {
        throw new AppError('User is already a member of this project', 400);
      }

      const membership = await ProjectMember.create({ projectId, userId });

      sendSuccess(
        res,
        {
          id: membership._id,
          projectId: membership.projectId,
          userId: membership.userId,
          joinedAt: membership.joinedAt,
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
          },
        },
        'Member added to project',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: projectId, userId } = req.params;

      const project = await Project.findById(projectId);
      if (!project) throw new AppError('Project not found', 404);

      // Prevent removing the Project Lead
      if (project.leadId === userId) {
        throw new AppError('Cannot remove the Project Lead from project members. Reassign the lead first.', 400);
      }

      await ProjectMember.findOneAndDelete({ projectId, userId });

      sendSuccess(res, null, 'Member removed from project');
    } catch (error) {
      next(error);
    }
  }
}
