import { type Role } from '@prisma/client';

export interface INotificationResponse {
  id: string;
  recipientRole: Role;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: Date;
}
