// ─────────────────────────────────────────────
// EMAIL TYPES
// ─────────────────────────────────────────────

export interface IEmailJobData {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string | number | boolean>;
}
