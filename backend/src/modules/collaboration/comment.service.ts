import { prisma } from '../../config/database.js';
import { AppError } from '../../middlewares/error.middleware.js';

export interface CreateCommentInput {
  projectId?: string;
  taskId?: string;
  userId: string;
  content: string;
}

export class CommentService {
  static async createComment(input: CreateCommentInput) {
    // XOR Parent Check: exactly one parent must be provided
    const hasProject = Boolean(input.projectId);
    const hasTask = Boolean(input.taskId);

    if ((hasProject && hasTask) || (!hasProject && !hasTask)) {
      throw new AppError('Comment must belong to EXACTLY ONE parent: either a project OR a task.', 400);
    }

    if (!input.content || !input.content.trim()) {
      throw new AppError('Comment content cannot be empty.', 400);
    }

    const comment = await prisma.comment.create({
      data: {
        projectId: input.projectId || null,
        taskId: input.taskId || null,
        userId: input.userId,
        content: input.content.trim(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } },
      },
    });

    return comment;
  }

  static async listComments(query: { projectId?: string; taskId?: string }) {
    const where: any = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.taskId) where.taskId = query.taskId;

    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments;
  }
}
