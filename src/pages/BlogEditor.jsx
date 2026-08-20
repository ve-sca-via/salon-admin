/**
 * BlogEditor.jsx - Write / Preview / SEO editor for a blog post
 *
 * Routes: /blog/new  and  /blog/:postId/edit
 *
 * Three tabs, which is what "control over the article" actually means here:
 *   Write   — TipTap body editor (RichTextEditor)
 *   Preview — the post rendered in the real published typography (prose.css)
 *   SEO     — explicit metadata fields with live counters and a SERP preview
 *
 * Drafts autosave; published posts never do — an accidental keystroke must not
 * push a half-finished edit onto a page that is already in search results.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetBlogPostByIdQuery,
  useGetBlogTagsQuery,
  useCreateBlogPostMutation,
  useUpdateBlogPostMutation,
  useUploadBlogImageMutation,
} from '../services/api/blogApi';
import RichTextEditor from '../components/blog/RichTextEditor';
import SerpPreview from '../components/blog/SerpPreview';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Textarea } from '../components/common/FormElements';
import { Badge } from '../components/common/Badge';
import { describeStatus } from '../utils/blogStatus';
import { isEmptyHtml, readingMinutes, slugify, stripHtml } from '../utils/blogContent';
import { toast } from 'react-toastify';
import '../components/blog/prose.css';

// Mirrors the caps in app/schemas/request/blog.py — the API rejects anything
// longer, so the counters and the validation agree.
const META_TITLE_MAX = 70;
const META_DESCRIPTION_MAX = 160;
const EXCERPT_MAX = 500;
const AUTOSAVE_DELAY_MS = 2500;

const EMPTY_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  cover_image_alt: '',
  meta_title: '',
  meta_description: '',
  focus_keyword: '',
  tags: [],
  author_name: '',
  status: 'draft',
  published_at: '',
};

// =====================================================
// HELPERS
// =====================================================

/** ISO datetime <-> <input type="datetime-local"> value. */
const isoToLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const localInputToIso = (val) => (val ? new Date(val).toISOString() : '');

/** Colour the counter as it approaches the limit the API enforces. */
const counterClass = (length, max) => {
  if (length > max) return 'text-red-600 font-medium';
  if (length > max * 0.9) return 'text-amber-600';
  return 'text-gray-500';
};

const formatClock = (date) =>
  date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

// =====================================================
// COMPONENT
// =====================================================
const BlogEditor = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const isNew = !postId;

  const { data, isLoading, isError } = useGetBlogPostByIdQuery(postId, { skip: isNew });
  const { data: tagsData } = useGetBlogTagsQuery();
  const [createPost, { isLoading: isCreating }] = useCreateBlogPostMutation();
  const [updatePost, { isLoading: isUpdating }] = useUpdateBlogPostMutation();
  const [uploadImage] = useUploadBlogImageMutation();

  const [activeTab, setActiveTab] = useState('write');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [tagInput, setTagInput] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const coverInputRef = useRef(null);

  // Snapshot of the last persisted form, used for the dirty check that drives
  // autosave and the leave-page guard.
  const savedSnapshot = useRef(JSON.stringify(EMPTY_FORM));
  // Whether the slug was manually edited — once it is, the title stops driving it.
  const slugTouched = useRef(false);
  // Whether this post has ever been published, which is when a slug change
  // becomes destructive (search engines have the old URL indexed).
  const wasPublished = useRef(false);

  const isSaving = isCreating || isUpdating;
  const post = data?.post;

  // ---- Load an existing post into the form ----
  useEffect(() => {
    if (!post) return;
    const loaded = {
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      cover_image_url: post.cover_image_url || '',
      cover_image_alt: post.cover_image_alt || '',
      meta_title: post.meta_title || '',
      meta_description: post.meta_description || '',
      focus_keyword: post.focus_keyword || '',
      tags: post.tags || [],
      author_name: post.author_name || '',
      status: post.status || 'draft',
      published_at: isoToLocalInput(post.published_at),
    };
    setForm(loaded);
    savedSnapshot.current = JSON.stringify(loaded);
    slugTouched.current = true; // an existing slug is never regenerated from the title
    wasPublished.current = post.status === 'published';
  }, [post]);

  const isDirty = JSON.stringify(form) !== savedSnapshot.current;

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // Keep the slug in step with the title until the author takes it over.
  const handleTitleChange = (value) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched.current ? prev.slug : slugify(value),
    }));
  };

  // ---- Derived display values ----
  const statusInfo = describeStatus({ status: form.status, published_at: localInputToIso(form.published_at) });
  const effectiveReadTime = useMemo(() => readingMinutes(form.content), [form.content]);
  const knownTags = tagsData?.tags || [];
  const tagSuggestions = knownTags.filter((t) => !form.tags.includes(t)).slice(0, 12);

  // =====================================================
  // VALIDATION
  // =====================================================
  /** Blocking problems, keyed to the tab that fixes them. */
  const validate = (targetStatus) => {
    const problems = [];
    if (!form.title.trim()) problems.push('A title is required.');
    if (form.cover_image_url && !form.cover_image_alt.trim()) {
      problems.push('Cover image alt text is required (SEO tab).');
    }
    if (form.meta_title.length > META_TITLE_MAX) problems.push('Meta title is over 70 characters.');
    if (form.meta_description.length > META_DESCRIPTION_MAX) {
      problems.push('Meta description is over 160 characters.');
    }
    if (targetStatus === 'published' && isEmptyHtml(form.content)) {
      problems.push('Cannot publish an empty article.');
    }
    return problems;
  };

  /** Non-blocking SEO gaps, surfaced on the SEO tab and before publishing. */
  const seoWarnings = useMemo(() => {
    const warnings = [];
    if (!form.focus_keyword.trim()) warnings.push('No focus keyword set.');
    if (!form.meta_description.trim() && !form.excerpt.trim()) {
      warnings.push('No meta description or excerpt — Google will invent a snippet.');
    }
    if (!form.cover_image_url) warnings.push('No cover image — link previews will be bare.');
    if (form.focus_keyword.trim()) {
      const keyword = form.focus_keyword.trim().toLowerCase();
      if (!form.title.toLowerCase().includes(keyword)) {
        warnings.push('The focus keyword does not appear in the title.');
      }
      if (!stripHtml(form.content).toLowerCase().includes(keyword)) {
        warnings.push('The focus keyword does not appear in the article body.');
      }
    }
    if (!/<a\s/i.test(form.content)) {
      warnings.push('No links in the article — link to /salons or /products so the post passes SEO value on.');
    }
    return warnings;
  }, [form]);

  // =====================================================
  // SAVE
  // =====================================================
  const buildPayload = (targetStatus, publishedAtIso) => {
    const payload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content,
      cover_image_url: form.cover_image_url.trim(),
      cover_image_alt: form.cover_image_alt.trim(),
      meta_title: form.meta_title.trim(),
      meta_description: form.meta_description.trim(),
      focus_keyword: form.focus_keyword.trim(),
      tags: form.tags,
      author_name: form.author_name.trim(),
      status: targetStatus,
    };

    // Only send a slug the author actually chose; an empty one lets the backend
    // generate and de-duplicate it.
    const slug = form.slug.trim();
    if (slug) payload.slug = slug;

    if (publishedAtIso) payload.published_at = publishedAtIso;

    return payload;
  };

  /**
   * Persist the form.
   * @param targetStatus  status to save under (defaults to the current one)
   * @param options.silent  autosave — no toast, no navigation
   * @param options.publishedAt  ISO timestamp to set (schedule / publish now)
   */
  const save = useCallback(
    async (targetStatus, { silent = false, publishedAt } = {}) => {
      const status = targetStatus || form.status;
      const problems = validate(status);
      if (problems.length) {
        if (!silent) problems.forEach((p) => toast.error(p));
        return null;
      }

      const publishedAtIso =
        publishedAt !== undefined ? publishedAt : localInputToIso(form.published_at);
      const payload = buildPayload(status, publishedAtIso);

      try {
        let saved;
        if (isNew) {
          const result = await createPost(payload).unwrap();
          saved = result.post;
        } else {
          const result = await updatePost({ postId, data: payload }).unwrap();
          saved = result.post;
        }

        // Adopt whatever the server actually stored — the slug may have been
        // generated or de-duplicated, and published_at defaults to now on publish.
        const persisted = {
          ...form,
          status: saved?.status ?? status,
          slug: saved?.slug ?? form.slug,
          published_at: isoToLocalInput(saved?.published_at) || form.published_at,
        };
        setForm(persisted);
        savedSnapshot.current = JSON.stringify(persisted);
        setLastSavedAt(new Date());
        if (saved?.status === 'published') wasPublished.current = true;

        if (!silent) toast.success(isNew ? 'Post created' : 'Post saved');
        if (isNew && saved?.id) navigate(`/blog/${saved.id}/edit`, { replace: true });

        return saved;
      } catch (error) {
        const message = error?.data?.detail || error?.data?.message || 'Failed to save post';
        // A failed autosave still has to be visible, or work is lost silently.
        toast.error(typeof message === 'string' ? message : 'Failed to save post');
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, isNew, postId, createPost, updatePost, navigate]
  );

  // ---- Autosave (existing drafts only) ----
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    if (isNew || !isDirty || form.status !== 'draft' || isSaving) return;
    const timer = setTimeout(async () => {
      setIsAutosaving(true);
      await saveRef.current('draft', { silent: true });
      setIsAutosaving(false);
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [form, isNew, isDirty, isSaving]);

  // ---- Leave-page guard ----
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // =====================================================
  // PUBLISH ACTIONS
  // =====================================================
  const confirmSlugChange = () => {
    // Only destructive once the old URL is out in the world.
    if (!wasPublished.current) return true;
    if (post && form.slug.trim() === post.slug) return true;
    return window.confirm(
      `Changing the slug changes the article's URL.\n\n` +
        `Old: /blog/${post?.slug}\nNew: /blog/${form.slug.trim()}\n\n` +
        `Search engines have the old URL indexed and it will start returning 404. Continue?`
    );
  };

  const handleSaveDraft = async () => {
    if (!confirmSlugChange()) return;
    await save('draft');
  };

  const handleSaveChanges = async () => {
    if (!confirmSlugChange()) return;
    await save(form.status);
  };

  const handlePublishNow = async () => {
    if (!confirmSlugChange()) return;
    if (seoWarnings.length) {
      const proceed = window.confirm(
        `This post is publishable but has SEO gaps:\n\n• ${seoWarnings.join('\n• ')}\n\nPublish anyway?`
      );
      if (!proceed) {
        setActiveTab('seo');
        return;
      }
    }
    const saved = await save('published', { publishedAt: new Date().toISOString() });
    if (saved) toast.success('Post is live');
  };

  const handleSchedule = async () => {
    if (!form.published_at) {
      toast.error('Pick a date and time to schedule for');
      return;
    }
    const when = new Date(form.published_at);
    if (when <= new Date()) {
      toast.error('Scheduled time must be in the future — use Publish now instead');
      return;
    }
    if (!confirmSlugChange()) return;
    const saved = await save('published', { publishedAt: when.toISOString() });
    if (saved) toast.success(`Scheduled for ${when.toLocaleString()}`);
  };

  const handleUnpublish = async () => {
    if (!window.confirm('Move this post back to draft? It will disappear from the site.')) return;
    const saved = await save('draft');
    if (saved) toast.info('Post moved to draft');
  };

  // =====================================================
  // COVER IMAGE
  // =====================================================
  const handleCoverSelect = async (e) => {
    const file = (e.target.files || [])[0];
    if (coverInputRef.current) coverInputRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image exceeds the 5MB size limit');
      return;
    }

    setIsUploadingCover(true);
    try {
      const result = await uploadImage(file).unwrap();
      const url = result?.url;
      if (!url) throw new Error('Upload did not return a URL');
      updateField('cover_image_url', url);
      toast.success('Cover image uploaded — add alt text before saving');
    } catch (error) {
      toast.error(error?.data?.detail || error?.message || 'Failed to upload cover image');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleBodyImageUpload = async (file) => {
    const result = await uploadImage(file).unwrap();
    return result?.url;
  };

  // =====================================================
  // TAGS
  // =====================================================
  const addTag = (raw) => {
    const tag = (raw || '').trim().toLowerCase();
    if (!tag) return;
    setForm((prev) => (prev.tags.includes(tag) ? prev : { ...prev, tags: [...prev.tags, tag] }));
    setTagInput('');
  };

  const removeTag = (tag) =>
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && form.tags.length) {
      removeTag(form.tags[form.tags.length - 1]);
    }
  };

  // =====================================================
  // EARLY RETURNS
  // =====================================================
  if (!isNew && isLoading) {
    return <div className="py-16 text-center text-gray-500">Loading post…</div>;
  }

  if (!isNew && isError) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-gray-600">This post could not be loaded.</p>
        <Button variant="outline" onClick={() => navigate('/blog')}>Back to Blog</Button>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================
  const TABS = [
    { id: 'write', label: 'Write' },
    { id: 'preview', label: 'Preview' },
    { id: 'seo', label: 'SEO', badge: seoWarnings.length || null },
  ];

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate('/blog')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Blog
          </button>
          <h1 className="text-2xl font-bold text-gray-900 truncate">
            {form.title || (isNew ? 'New post' : 'Untitled post')}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm">
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            <span className="text-gray-500">{effectiveReadTime} min read</span>
            <span className="text-gray-400">
              {isAutosaving
                ? 'Autosaving…'
                : isDirty
                  ? 'Unsaved changes'
                  : lastSavedAt
                    ? `Saved at ${formatClock(lastSavedAt)}`
                    : ''}
            </span>
          </div>
        </div>

        {/* ---- Publish controls ---- */}
        <div className="flex flex-wrap gap-2">
          {form.status === 'draft' ? (
            <>
              <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save draft'}
              </Button>
              <Button variant="secondary" onClick={handleSchedule} disabled={isSaving}>
                Schedule
              </Button>
              <Button variant="primary" onClick={handlePublishNow} disabled={isSaving}>
                Publish now
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleUnpublish} disabled={isSaving}>
                Move to draft
              </Button>
              {statusInfo.label === 'Scheduled' && (
                <Button variant="secondary" onClick={handlePublishNow} disabled={isSaving}>
                  Publish now
                </Button>
              )}
              <Button variant="primary" onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Update post'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ---- Tabs ---- */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.badge ? (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* ================= WRITE ================= */}
      {activeTab === 'write' && (
        <div className="space-y-4">
          <Card>
            <div className="space-y-4">
              <Input
                label="Title"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. How Often Should You Get a Hair Spa?"
              />
              <Textarea
                label="Excerpt"
                rows={2}
                maxLength={EXCERPT_MAX}
                value={form.excerpt}
                onChange={(e) => updateField('excerpt', e.target.value)}
                placeholder="One or two lines shown on the blog index card. Falls back to the opening of the article."
              />
            </div>
          </Card>

          <RichTextEditor
            value={form.content}
            onChange={(html) => updateField('content', html)}
            onUploadImage={handleBodyImageUpload}
            placeholder="Write the article. Use H2 for sections, and link to /salons or /products where it helps the reader."
          />
        </div>
      )}

      {/* ================= PREVIEW ================= */}
      {activeTab === 'preview' && (
        <Card>
          <div className="max-w-3xl mx-auto py-4">
            {form.cover_image_url && (
              <img
                src={form.cover_image_url}
                alt={form.cover_image_alt || ''}
                className="w-full rounded-lg mb-8 object-cover max-h-96"
              />
            )}

            <h1 className="text-4xl leading-tight text-gray-900 font-[Marcellus,Georgia,serif]">
              {form.title || 'Untitled post'}
            </h1>

            <div className="mt-3 mb-8 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              {form.author_name && <span>By {form.author_name}</span>}
              <span>{effectiveReadTime} min read</span>
              {form.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>

            {isEmptyHtml(form.content) ? (
              <p className="text-gray-400 italic">Nothing written yet.</p>
            ) : (
              // Author's own draft, rendered locally in the same typography the
              // published page uses. The stored copy is sanitised server-side
              // before it is ever served to the public.
              <div className="blog-prose" dangerouslySetInnerHTML={{ __html: form.content }} />
            )}
          </div>
        </Card>
      )}

      {/* ================= SEO ================= */}
      {activeTab === 'seo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* --- Left: fields --- */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Search appearance">
              <div className="space-y-4">
                <div>
                  <Input
                    label="Meta title"
                    value={form.meta_title}
                    maxLength={META_TITLE_MAX}
                    onChange={(e) => updateField('meta_title', e.target.value)}
                    placeholder={form.title || 'Falls back to the post title'}
                  />
                  <p className={`mt-1 text-xs ${counterClass(form.meta_title.length, META_TITLE_MAX)}`}>
                    {form.meta_title.length}/{META_TITLE_MAX} characters · left empty, the post title is used
                  </p>
                </div>

                <div>
                  <Textarea
                    label="Meta description"
                    rows={3}
                    value={form.meta_description}
                    maxLength={META_DESCRIPTION_MAX}
                    onChange={(e) => updateField('meta_description', e.target.value)}
                    placeholder={form.excerpt || 'Falls back to the excerpt'}
                  />
                  <p className={`mt-1 text-xs ${counterClass(form.meta_description.length, META_DESCRIPTION_MAX)}`}>
                    {form.meta_description.length}/{META_DESCRIPTION_MAX} characters · left empty, the excerpt is used
                  </p>
                </div>

                <Input
                  label="Focus keyword"
                  value={form.focus_keyword}
                  onChange={(e) => updateField('focus_keyword', e.target.value)}
                  placeholder="e.g. hair spa in delhi"
                />
              </div>
            </Card>

            <Card title="URL">
              <div className="space-y-2">
                <Input
                  label="Slug"
                  value={form.slug}
                  onChange={(e) => {
                    slugTouched.current = true;
                    updateField('slug', e.target.value);
                  }}
                  placeholder={slugify(form.title) || 'generated-from-the-title'}
                />
                <p className="text-xs text-gray-500 break-all">
                  /blog/{form.slug || slugify(form.title) || 'generated-from-the-title'}
                </p>
                {wasPublished.current && post && form.slug.trim() !== post.slug && (
                  <p className="text-xs text-red-600">
                    This post is already published as <strong>/blog/{post.slug}</strong>. Changing the
                    slug breaks every link search engines have indexed.
                  </p>
                )}
              </div>
            </Card>

            <Card title="Cover image">
              <div className="space-y-3">
                {form.cover_image_url ? (
                  <img
                    src={form.cover_image_url}
                    alt={form.cover_image_alt || 'Cover preview'}
                    className="w-full max-h-56 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="h-32 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500">
                    No cover image
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUploadingCover}
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {isUploadingCover ? 'Uploading…' : form.cover_image_url ? 'Replace image' : 'Upload image'}
                  </Button>
                  {form.cover_image_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateField('cover_image_url', '');
                        updateField('cover_image_alt', '');
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverSelect}
                  className="hidden"
                  data-testid="blog-cover-input"
                />

                {form.cover_image_url && (
                  <div>
                    <Input
                      label="Cover image alt text *"
                      value={form.cover_image_alt}
                      onChange={(e) => updateField('cover_image_alt', e.target.value)}
                      placeholder="Describe the image, e.g. Woman receiving a hair spa treatment"
                      error={!form.cover_image_alt.trim() ? 'Required when a cover image is set' : ''}
                    />
                  </div>
                )}
              </div>
            </Card>

            <Card title="Tags & byline">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-sm rounded-full bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          aria-label={`Remove tag ${tag}`}
                          className="hover:text-blue-950"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => addTag(tagInput)}
                    placeholder="Type a tag and press Enter"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {tagSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500 self-center">Existing:</span>
                      {tagSuggestions.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTag(tag)}
                          className="px-2 py-0.5 text-xs rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Input
                  label="Author byline"
                  value={form.author_name}
                  onChange={(e) => updateField('author_name', e.target.value)}
                  placeholder="e.g. Team Lubist"
                />
              </div>
            </Card>

            <Card title="Publish date">
              <div className="space-y-2">
                <Input
                  type="datetime-local"
                  label="Publish at"
                  value={form.published_at}
                  onChange={(e) => updateField('published_at', e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  A future date schedules the post — it stays hidden until then, with no further
                  action needed. Leave empty and &ldquo;Publish now&rdquo; sets it to the current time.
                </p>
              </div>
            </Card>
          </div>

          {/* --- Right: preview + checks --- */}
          <div className="space-y-6">
            <SerpPreview
              title={form.title}
              metaTitle={form.meta_title}
              excerpt={form.excerpt}
              metaDescription={form.meta_description}
              slug={form.slug || slugify(form.title)}
            />

            <Card title="SEO checks">
              {seoWarnings.length === 0 ? (
                <p className="text-sm text-green-700">Everything checks out.</p>
              ) : (
                <ul aria-label="SEO issues" className="space-y-2 text-sm text-amber-700">
                  {seoWarnings.map((warning) => (
                    <li key={warning} className="flex gap-2">
                      <span aria-hidden="true">⚠</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogEditor;
