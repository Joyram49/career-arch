import { type JobStatus, type JobType, type SubscriptionPlan } from '@prisma/client';

export interface IJobResponse {
  id: string;
  orgId: string;
  title: string;
  slug: string;
  description: string;
  requirements: string | null;
  responsibilities: string | null;
  jobType: JobType;
  status: JobStatus;
  location: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  experienceLevel: string | null;
  skills: string[];
  category: string | null;
  deadline: Date | null;
  vacancies: number;
  views: number;
  requiredPlan: SubscriptionPlan;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { applications: number };
}

export interface IDeletedJobResponse {
  id: string;
  jobId: string;
  orgId: string;
  deletedAt: Date;
  deleteAt: Date;
  job: IJobResponse;
}
