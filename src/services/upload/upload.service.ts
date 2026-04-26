import crypto from 'crypto';
import path from 'path';

import cloudinary from '@config/cloudinary';
import { logger } from '@config/logger';
import { BadRequestError } from '@utils/apiError';
import { FILE_UPLOAD } from '@utils/constants';

// ── Key generators ─────────────────────────────────────────────────────────

function generateAvatarPublicId(userId: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const random = crypto.randomBytes(8).toString('hex');

  return `career-arch/avatars/${userId}/${random}${ext}`;
}

function generateResumePublicId(userId: string): string {
  const random = crypto.randomBytes(8).toString('hex');

  return `career-arch/resumes/${userId}/${random}`;
}

// ── Avatar upload ──────────────────────────────────────────────────────────

export async function uploadAvatarToCloudinary(
  userId: string,
  file: Express.Multer.File,
): Promise<string> {
  const allowedTypes = FILE_UPLOAD.ALLOWED_IMAGE_TYPES as readonly string[];

  if (!allowedTypes.includes(file.mimetype)) {
    throw new BadRequestError(`Invalid image type. Allowed: ${allowedTypes.join(', ')}`);
  }

  if (file.size > FILE_UPLOAD.MAX_IMAGE_SIZE) {
    throw new BadRequestError('Avatar file size exceeds the 2 MB limit');
  }

  const publicId = generateAvatarPublicId(userId, file.originalname);

  const result = await cloudinary.uploader.upload(
    `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
    {
      public_id: publicId,
      folder: '', // already included in publicId
      resource_type: 'image',
      overwrite: true,
    },
  );

  logger.info(`Avatar uploaded to Cloudinary: ${result.public_id}`);
  return result.secure_url;
}

// ── Resume upload ──────────────────────────────────────────────────────────

export async function uploadResumeToCloudinary(
  userId: string,
  file: Express.Multer.File,
): Promise<string> {
  const allowedTypes = FILE_UPLOAD.ALLOWED_RESUME_TYPES as readonly string[];

  if (!allowedTypes.includes(file.mimetype)) {
    throw new BadRequestError('Invalid file type. Only PDF resumes are allowed.');
  }

  if (file.size > FILE_UPLOAD.MAX_RESUME_SIZE) {
    throw new BadRequestError('Resume file size exceeds the 5 MB limit');
  }

  const publicId = generateResumePublicId(userId);

  const result = await cloudinary.uploader.upload(
    `data:application/pdf;base64,${file.buffer.toString('base64')}`,
    {
      public_id: publicId,
      resource_type: 'raw', // IMPORTANT for PDFs
      folder: '',
      format: 'pdf',
    },
  );

  logger.info(`Resume uploaded to Cloudinary: ${result.public_id}`);
  return result.secure_url;
}

// ── Delete from Cloudinary ────────────────────────────────────────────────

export async function deleteFromCloudinary(url: string): Promise<void> {
  try {
    const publicId = extractPublicIdFromUrl(url);
    if (publicId === null) return;

    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image', // fallback; we handle raw below
    });

    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    });

    logger.info(`Cloudinary asset deleted: ${publicId}`);
  } catch (error) {
    logger.error(`Failed to delete Cloudinary asset:`, error);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractPublicIdFromUrl(url: string): string | null {
  try {
    const parts = url.split('/upload/')[1];
    if (parts === undefined) return null;

    // remove version if exists (v123456/)
    const withoutVersion = parts.replace(/^v\d+\//, '');

    // remove extension
    return withoutVersion.replace(/\.[^/.]+$/, '');
  } catch {
    return null;
  }
}
