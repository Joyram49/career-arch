import {
  deleteFromCloudinary,
  uploadAvatarToCloudinary,
} from '@modules/uploads/services/upload.service';
import { NotFoundError } from '@shared/utils/apiError';

import { prisma } from '@/config/database';

import { type IOrgProfileResponse } from '../types';
import { type UpdateOrgProfileInput } from '../validations/org.validation';

// ─────────────────────────────────────────────
// GET ORG PROFILE
// ─────────────────────────────────────────────

export async function getOrgProfile(orgId: string): Promise<IOrgProfileResponse> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      email: true,
      isApproved: true,
      isPaymentMethodOnFile: true,
      hasUnpaidIncentives: true,
      profile: true,
    },
  });

  if (org?.email == null || org.profile === null) {
    throw new NotFoundError('Organization profile not found');
  }
  return {
    ...org.profile,
    email: org.email,
    isApproved: org.isApproved,
    hasUnpaidIncentives: org.hasUnpaidIncentives,
    isPaymentMethodOnFile: org.isPaymentMethodOnFile,
  };
}

// ─────────────────────────────────────────────
// UPDATE ORG PROFILE
// ─────────────────────────────────────────────

export async function updateOrgProfile(
  orgId: string,
  data: UpdateOrgProfileInput,
): Promise<IOrgProfileResponse> {
  // confirm if org exists
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      email: true,
      isApproved: true,
      isPaymentMethodOnFile: true,
      hasUnpaidIncentives: true,
      profile: {
        select: {
          id: true,
        },
      },
    },
  });

  if (org === null) {
    throw new NotFoundError('Organization not found');
  }

  //   build only the fields that were actually sent (avoid overriding with undefined)
  const profileData: Record<string, unknown> = {};
  if (data.companyName !== undefined) profileData['companyName'] = data.companyName;
  if (data.website !== undefined) profileData['website'] = data.website;
  if (data.industry !== undefined) profileData['industry'] = data.industry;
  if (data.companySize !== undefined) profileData['companySize'] = data.companySize;
  if (data.foundedYear !== undefined) profileData['foundedYear'] = data.foundedYear;
  if (data.description !== undefined) profileData['description'] = data.description;
  if (data.location !== undefined) profileData['location'] = data.location;
  if (data.country !== undefined) profileData['country'] = data.country;
  if (data.linkedinUrl !== undefined) profileData['linkedinUrl'] = data.linkedinUrl;
  if (data.twitterUrl !== undefined) profileData['twitterUrl'] = data.twitterUrl;

  const updatedOrgProfile = await prisma.orgProfile.update({
    where: { orgId },
    data: profileData,
  });
  return {
    ...updatedOrgProfile,
    email: org.email,
    isApproved: org.isApproved,
    isPaymentMethodOnFile: org.isPaymentMethodOnFile,
    hasUnpaidIncentives: org.hasUnpaidIncentives,
  };
}

// ─────────────────────────────────────────────
// UPLOAD ORG LOGO
// ─────────────────────────────────────────────

export async function uploadOrgLogo(
  orgId: string,
  file: Express.Multer.File,
): Promise<{ logoUrl: string }> {
  // Fetch existing logo URL so we can clean up Cloudinary after upload
  const profile = await prisma.orgProfile.findUnique({
    where: { orgId },
    select: { logoUrl: true },
  });

  if (profile === null) {
    throw new NotFoundError('Organization profile not found');
  }

  // Reuse the avatar upload util — same image constraints apply to logos
  const newLogoUrl = await uploadAvatarToCloudinary(orgId, file);

  await prisma.orgProfile.update({
    where: { orgId },
    data: { logoUrl: newLogoUrl },
  });

  // Delete old logo from Cloudinary — fire-and-forget
  if (profile.logoUrl !== null) {
    void deleteFromCloudinary(profile.logoUrl);
  }

  return { logoUrl: newLogoUrl };
}
