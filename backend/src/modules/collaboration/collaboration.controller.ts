import { Request, Response, NextFunction } from 'express';
import { CommentService } from './comment.service.js';
import { AttachmentService } from './attachment.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { validateFileMagicBytes } from '../../utils/fileValidation.js';
import { Attachment } from '../../models/index.js';
import fs from 'fs';

export class CollaborationController {
  static async createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const { projectId, taskId, content } = req.body;
      const comment = await CommentService.createComment({
        projectId: projectId || req.params.id,
        taskId,
        userId: req.user.id,
        content,
      });

      sendSuccess(res, comment, 'Comment added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async listComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, taskId } = req.query;
      const comments = await CommentService.listComments({
        projectId: (projectId || req.params.id) as string | undefined,
        taskId: taskId as string | undefined,
      });

      sendSuccess(res, comments, 'Comments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, taskId } = req.query;
      const attachments = await AttachmentService.listAttachments({
        projectId: (projectId || req.params.id) as string | undefined,
        taskId: taskId as string | undefined,
      });

      sendSuccess(res, attachments, 'Attachments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async uploadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = (req as any).file;
      if (!req.user) throw new AppError('Unauthorized', 401);
      if (!file) throw new AppError('No file provided for upload', 400);

      const { projectId, taskId } = req.body;

      const isValidMagic = await validateFileMagicBytes(file.path, file.mimetype);
      if (!isValidMagic) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        throw new AppError('File signature does not match claimed MIME type. Upload rejected.', 400);
      }

      const attachment = await AttachmentService.createAttachment({
        projectId: projectId || undefined,
        taskId: taskId || undefined,
        uploadedBy: req.user.id,
        fileName: file.originalname,
        storedName: file.filename,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      sendSuccess(res, attachment, 'File uploaded and attached successfully', 201);
    } catch (error) {
      const file = (req as any).file;
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      next(error);
    }
  }

  static async downloadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const { attachmentId } = req.params;
      const attachment = await Attachment.findById(attachmentId);

      if (!attachment) {
        throw new AppError('Attachment not found', 404);
      }

      const filePath = attachment.filePath;
      if (!fs.existsSync(filePath)) {
        throw new AppError('File not found on server. It may have been removed.', 404);
      }

      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
      res.setHeader('Content-Length', attachment.fileSize.toString());

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}
