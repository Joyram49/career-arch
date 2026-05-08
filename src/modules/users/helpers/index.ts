import { type IUserProfileResponse, type IUserWithRelations } from '../types';

export function mapToProfileResponse(user: IUserWithRelations): IUserProfileResponse {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    profile:
      user.profile !== null
        ? {
            id: user.profile.id,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            phone: user.profile.phone,
            avatarUrl: user.profile.avatarUrl,
            resumeUrl: user.profile.resumeUrl,
            headline: user.profile.headline,
            summary: user.profile.summary,
            location: user.profile.location,
            linkedinUrl: user.profile.linkedinUrl,
            githubUrl: user.profile.githubUrl,
            portfolioUrl: user.profile.portfolioUrl,
            skills: user.profile.skills,
            experienceYears: user.profile.experienceYears,
          }
        : null,
    subscription:
      user.subscription !== null
        ? {
            plan: user.subscription.plan,
            status: user.subscription.status,
            currentPeriodEnd: user.subscription.currentPeriodEnd,
          }
        : null,
  };
}
