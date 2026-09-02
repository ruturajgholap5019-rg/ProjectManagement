import { Comment, User } from '../../models/index.js';
import { AppError } from '../../middlewares/error.middleware.js';

export interface CreateCommentInput {
  projectId?: string;
  taskId?: string;
  userId: string;
  content: string;
}

export class CommentService {
  static async createComment(input: CreateCommentInput) {
    const hasProject = Boolean(input.projectId);
    const hasTask = Boolean(input.taskId);

    if ((hasProject && hasTask) || (!hasProject && !hasTask)) {
      throw new AppError('Comment must belong to EXACTLY ONE parent: either a project OR a task.', 400);
    }

    if (!input.content || !input.content.trim()) {
      throw new AppError('Comment content cannot be empty.', 400);
    }

    const comment = await Comment.create({
      projectId: input.projectId || null,
      taskId: input.taskId || null,
      userId: input.userId,
      content: input.content.trim(),
    });

    const user = await User.findById(input.userId, 'firstName lastName avatarUrl role _id').lean();

    return {
      ...comment.toJSON(),
      id: comment._id,
      user: user ? { id: (user as any)._id, firstName: (user as any).firstName, lastName: (user as any).lastName, avatarUrl: (user as any).avatarUrl, role: (user as any).role } : null,
    };
  }

  static async listComments(query: { projectId?: string; taskId?: string }) {
    const filter: any = {};
    if (query.projectId) filter.projectId = query.projectId;
    if (query.taskId) filter.taskId = query.taskId;

    const comments = await Comment.find(filter).sort({ createdAt: -1 }).lean();
    const userIds = [...new Set(comments.map((c: any) => c.userId).filter(Boolean))];

    const users = await User.find({ _id: { $in: userIds } }, 'firstName lastName avatarUrl role _id').lean();
    const userMap = new Map(users.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName, avatarUrl: u.avatarUrl, role: u.role }]));

    return comments.map((c: any) => ({
      ...c,
      id: c._id,
      user: userMap.get(c.userId) || null,
    }));
  }
}
