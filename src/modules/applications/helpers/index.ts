import { type ApplicationStatus } from '@prisma/client';

import { BadRequestError } from '@/shared/utils/apiError';

// ─────────────────────────────────────────────
// STATUS TRANSITION RULES
// ─────────────────────────────────────────────

export const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  PENDING: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW_SCHEDULED', 'REJECTED'],
  INTERVIEW_SCHEDULED: ['OFFERED', 'REJECTED'],
  OFFERED: ['HIRED', 'REJECTED'],
  // Terminal states — no further transitions
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function validateTransition(from: ApplicationStatus, to: ApplicationStatus): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new BadRequestError(
      `Cannot move application from ${from} to ${to}. ` +
        `Allowed transitions: ${allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'}`,
    );
  }
}

// ─────────────────────────────────────────────
// STATUS → NOTIFICATION MAP
// ─────────────────────────────────────────────

export const STATUS_NOTIFICATION: Record<
  string,
  { title: string; message: (jobTitle: string, companyName: string) => string }
> = {
  UNDER_REVIEW: {
    title: 'Application Under Review 🔍',
    message: (job, company) => `Your application for ${job} at ${company} is being reviewed`,
  },
  SHORTLISTED: {
    title: "You've Been Shortlisted! 🎉",
    message: (job, company) => `Great news! You were shortlisted for ${job} at ${company}`,
  },
  INTERVIEW_SCHEDULED: {
    title: 'Interview Scheduled 📅',
    message: (job, company) => `An interview has been arranged for ${job} at ${company}`,
  },
  OFFERED: {
    title: 'Offer Received! 🏆',
    message: (job, company) => `You received a job offer for ${job} at ${company}`,
  },
  HIRED: {
    title: "You're Hired! 🎊",
    message: (job, company) => `Congratulations! You got the job at ${company} — ${job}`,
  },
  REJECTED: {
    title: 'Application Update',
    message: (job, company) => `An update on your application for ${job} at ${company}`,
  },
};
