export type * from './auth.types';
export type * from './email.types';
export type * from './response.type';
export type * from './subscription.type';
// ─────────────────────────────────────────────
// COMMON TYPES
// ─────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc';

export interface IIdParam {
  id: string;
}
