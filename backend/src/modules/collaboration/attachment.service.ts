import { Attachment, User } from '../../models/index.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { sanitizeFileName } from '../../utils/fileValidation.js';

export interface CreateAttachmentInput {
  projectId?: string;
  taskId?: string;
  uploadedBy: string;
  fileName: string;
  storedName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export class AttachmentService {
  static async createAttachment(input: CreateAttachmentInput) {
    const hasProject = Boolean(input.projectId);
    const hasTask = Boolean(input.taskId);

    if ((hasProject && hasTask) || (!hasProject && !hasTask)) {
      throw new AppError('Attachment must belong to EXACTLY ONE parent: either a project OR a task.', 400);
    }

    const attachment = await Attachment.create({
      projectId: input.projectId || null,
      taskId: input.taskId || null,
      uploadedBy: input.uploadedBy,
      fileName: sanitizeFileName(input.fileName),
      storedName: input.storedName,
      filePath: input.filePath,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
    });

    const user = await User.findById(input.uploadedBy, 'firstName lastName _id').lean();

    return {
      ...attachment.toJSON(),
      id: attachment._id,
      uploader: user ? { id: (user as any)._id, firstName: (user as any).firstName, lastName: (user as any).lastName } : null,
    };
  }

  static async listAttachments(query: { projectId?: string; taskId?: string }) {
    const filter: any = {};
    if (query.projectId) filter.projectId = query.projectId;
    if (query.taskId) filter.taskId = query.taskId;

    const attachments = await Attachment.find(filter).sort({ createdAt: -1 }).lean();
    const userIds = [...new Set(attachments.map((a: any) => a.uploadedBy).filter(Boolean))];

    const users = await User.find({ _id: { $in: userIds } }, 'firstName lastName _id').lean();
    const userMap = new Map(users.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName }]));

    return attachments.map((a: any) => ({
      ...a,
      id: a._id,
      uploader: userMap.get(a.uploadedBy) || null,
    }));
  }
}
