/* eslint-disable no-duplicate-imports */
import { BadRequestError } from '@utils/apiError';
import { FILE_UPLOAD } from '@utils/constants';
import multer from 'multer';

import type { Request } from 'express';
import type { FileFilterCallback } from 'multer';

// ── Memory storage — buffers go directly to S3, nothing written to disk ────
const memoryStorage = multer.memoryStorage();

// ── File filters ───────────────────────────────────────────────────────────

function avatarFileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  const allowed = FILE_UPLOAD.ALLOWED_IMAGE_TYPES as readonly string[];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError(`Invalid image type. Allowed types: ${allowed.join(', ')}`));
  }
}

function resumeFileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  const allowed = FILE_UPLOAD.ALLOWED_RESUME_TYPES as readonly string[];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Only PDF files are accepted for resumes'));
  }
}

// ── Exported multer instances ──────────────────────────────────────────────

/**
 * Use as: uploadAvatarMiddleware.single('avatar')
 * Field name must be 'avatar'
 */
export const uploadAvatarMiddleware = multer({
  storage: memoryStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: FILE_UPLOAD.MAX_IMAGE_SIZE, // 2 MB
    files: 1,
  },
});

/**
 * Use as: uploadResumeMiddleware.single('resume')
 * Field name must be 'resume'
 */
export const uploadResumeMiddleware = multer({
  storage: memoryStorage,
  fileFilter: resumeFileFilter,
  limits: {
    fileSize: FILE_UPLOAD.MAX_RESUME_SIZE, // 5 MB
    files: 1,
  },
});
