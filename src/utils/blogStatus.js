/**
 * Display status for a blog post.
 *
 * There is no `scheduled` status in the database — a scheduled post is a
 * published one with a future `published_at`, which every public read filters
 * on (`status='published' AND published_at <= now()`). The distinction exists
 * only for display, so it is derived here rather than stored.
 *
 * Shared by the blog list and the editor header.
 */
export const describeStatus = (post) => {
  if (!post || post.status === 'draft') return { label: 'Draft', variant: 'default' };
  if (post.status === 'archived') return { label: 'Archived', variant: 'danger' };
  if (post.published_at && new Date(post.published_at) > new Date()) {
    return { label: 'Scheduled', variant: 'warning' };
  }
  return { label: 'Live', variant: 'success' };
};

export default describeStatus;
