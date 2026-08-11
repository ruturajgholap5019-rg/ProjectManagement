import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { env } from '../config/env.js';
import { ALLOWED_MIME_TYPES, sanitizeFileName } from '../utils/fileValidation.js';
import { AppError } from './error.middleware.js';

const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname);
    const storedName = `${crypto.randomUUID()}${ext}`;
    cb(null, storedName);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES, // 50MB
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    // 1. Sanitize original filename
    file.originalname = sanitizeFileName(file.originalname);

    // 2. Reject archives (ZIP/RAR)
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.zip' || ext === '.rar' || ext === '.7z' || ext === '.tar' || ext === '.gz') {
      return cb(new AppError('Archive files (ZIP/RAR/7z) are not allowed in v1 due to security policies.', 400));
    }

    // 3. Check MIME whitelist
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new AppError(`File type '${file.mimetype}' is not permitted.`, 400));
    }

    cb(null, true);
  },
});
