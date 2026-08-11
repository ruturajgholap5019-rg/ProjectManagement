import { prisma } from '../../config/database.js';
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

    const attachment = await prisma.attachment.create({
      data: {
        projectId: input.projectId || null,
        taskId: input.taskId || null,
        uploadedBy: input.uploadedBy,
        fileName: sanitizeFileName(input.fileName),
        storedName: input.storedName,
        filePath: input.filePath,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
      },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return attachment;
  }

  static async listAttachments(query: { projectId?: string; taskId?: string }) {
    const where: any = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.taskId) where.taskId = query.taskId;

    const attachments = await prisma.attachment.findMany({
      where,
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return attachments;
  }
}
