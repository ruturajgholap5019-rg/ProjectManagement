import fs from 'fs';
import path from 'path';
import { AppError } from '../middlewares/error.middleware.js';

// Allowed MIME types whitelist for v1 (Conservative, NO archives)
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'application/csv',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/webm',
]);

/**
 * Validates file signature (magic bytes) to prevent extension spoofing and malicious files.
 */
export async function validateFileMagicBytes(filePath: string, claimedMime: string): Promise<boolean> {
  if (!fs.existsSync(filePath)) return false;

  const buffer = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 12, 0);
  fs.closeSync(fd);

  // Magic byte signatures
  const isPdf = buffer.slice(0, 4).toString() === '%PDF';
  const isPng = buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
  const isJpg = buffer.slice(0, 3).toString('hex') === 'ffd8ff';
  const isWebp = buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';

  if (claimedMime === 'application/pdf') return isPdf;
  if (claimedMime === 'image/png') return isPng;
  if (claimedMime === 'image/jpeg') return isJpg;
  if (claimedMime === 'image/webp') return isWebp;

  // Reject archives explicitly (ZIP/RAR)
  const isZip = buffer.slice(0, 4).toString('hex') === '504b0304';
  const isRar = buffer.slice(0, 4).toString('hex') === '52617221';
  if (isZip || isRar) {
    throw new AppError('Archive files (ZIP/RAR) are not allowed in v1 due to security rules.', 400);
  }

  return ALLOWED_MIME_TYPES.has(claimedMime);
}

/**
 * Sanitizes input filename against path traversal attacks (`../`, `\`, null bytes).
 */
export function sanitizeFileName(originalName: string): string {
  const basename = path.basename(originalName);
  return basename.replace(/[^a-zA-Z0-9_.-]/g, '_');
}
