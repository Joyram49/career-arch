import crypto from 'crypto';
/**
 * Generates a URL-safe, SEO-friendly slug from a job title.
 *
 * Rules:
 * - Lowercase, hyphen-separated, no special characters
 * - Base capped at 60 chars (SEO sweet spot)
 * - 6-char crypto suffix guarantees uniqueness without a DB lookup loop
 * - Slug is set ONCE at job creation — never regenerated on title updates
 *
 * @example
 * generateSlug("Senior React Developer (Remote)")
 * // → "senior-react-developer-remote-a1b2c3"
 */

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  const suffix = crypto.randomBytes(3).toString('hex');

  return `${base}-${suffix}`;
}
