import DOMPurify from 'dompurify';

import { cn } from '@/lib/utils';

interface RichTextContentProps {
  html: string;
  className?: string;
}

const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'ul', 'li', 'a'];

const ALLOWED_ATTR = ['href', 'rel', 'target'];

const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i;

/**
 * Strip HTML tags from a rich-text string. Use for line-clamped teasers
 * and previews where formatting would break the layout. Decodes basic
 * entities so &amp; → & and friends.
 */
export function htmlToPlainText(input: string | null | undefined): string {
  if (!input) return '';
  if (!HTML_TAG_PATTERN.test(input)) return input;
  // Sanitize first so we strip from clean HTML, not arbitrary input.
  const clean = DOMPurify.sanitize(input, { ALLOWED_TAGS, ALLOWED_ATTR });
  if (typeof document === 'undefined') {
    return clean.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const el = document.createElement('div');
  el.innerHTML = clean;
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

export function RichTextContent({ html, className }: RichTextContentProps) {
  // Legacy plain-text descriptions (no tags) — render as before so line
  // breaks survive and we don't have to migrate stored data.
  if (!HTML_TAG_PATTERN.test(html)) {
    return (
      <div className={cn('whitespace-pre-wrap', className)}>{html}</div>
    );
  }

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(https?:|mailto:|tel:)/i,
  });

  return (
    <div
      className={cn('prose-content', className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
