/**
 * Blog content helpers shared by the editor and the TipTap wrapper.
 *
 * These mirror the server-side logic in app/services/blog_service.py so the
 * numbers the author sees while writing (slug, read time) match what is
 * actually stored on save.
 */

// TipTap represents an empty document as "<p></p>"; treat that as no content so
// a blank body doesn't read as unsaved work.
const EMPTY_DOC = '<p></p>';

export const isEmptyHtml = (html) => !html || html === EMPTY_DOC || html === '<p><br></p>';

/** Plain text from an HTML body, for word counts and keyword checks. */
export const stripHtml = (html) =>
  (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** Average adult reading speed — same constant as blog_service.WORDS_PER_MINUTE. */
const WORDS_PER_MINUTE = 200;

export const readingMinutes = (html) => {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  return words ? Math.max(1, Math.round(words / WORDS_PER_MINUTE)) : 1;
};

/** Same rules as blog_service._generate_slug, so the previewed URL is the real one. */
export const slugify = (title) =>
  (title || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
