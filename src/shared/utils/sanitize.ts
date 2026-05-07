import DOMPurify from 'isomorphic-dompurify';

/**
 * HTML tags produced by TipTap starter-kit that we allow in job descriptions.
 * Everything else (script, iframe, style, etc.) is stripped.
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'a',
];

/**
 * Allowed attributes — only href/target/rel on <a> tags.
 * data-*, class, style, on* are all stripped automatically.
 */
const ALLOWED_ATTR = ['href', 'target', 'rel'];

/**
 * Sanitizes HTML from TipTap rich-text fields before persisting to DB.
 * Applied to: description, requirements, responsibilities — on create AND update.
 *
 * @param dirty - Raw HTML string from client
 * @returns Sanitized HTML string safe for storage and rendering
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

/**
 * Sanitizes an optional HTML field — returns undefined if input is undefined.
 */
export function sanitizeOptionalHtml(dirty: string | undefined): string | null {
  if (dirty === undefined) return null;
  return sanitizeHtml(dirty);
}
