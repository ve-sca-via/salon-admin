/**
 * Integration tests for the Write / Preview / SEO blog editor.
 *
 * Renders the real <BlogEditor/> against the real blogApi RTK Query slice with
 * MSW standing in for the backend. RichTextEditor is replaced with a plain
 * textarea: ProseMirror needs layout APIs jsdom doesn't implement, and the
 * behaviour under test here is the editor screen's own logic — payload
 * construction, publish/schedule transitions, the guards that stop a bad post
 * going live, and the autosave rule.
 *
 * TipTap's own behaviour is not under test; it is exercised by hand.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';

import { server } from '../test/mswServer';
import { blogApi } from '../services/api/blogApi';

// ---- Mocks (declared before the component import) ----
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('../components/blog/RichTextEditor', () => ({
  default: ({ value, onChange }) => (
    <textarea
      aria-label="Article body"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const mockNavigate = vi.fn();
let routeParams = {};
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => routeParams,
  };
});

import { toast } from 'react-toastify';
import BlogEditor from './BlogEditor';

const BASE = 'http://localhost:8000/api/v1';
const HOUR = 60 * 60 * 1000;

const existingPost = (overrides = {}) => ({
  id: 'p1',
  title: 'Best Hair Spa in Delhi',
  slug: 'best-hair-spa-in-delhi',
  excerpt: 'A short guide',
  content: '<p>Body text with a <a href="/salons">salon link</a>.</p>',
  cover_image_url: null,
  cover_image_alt: null,
  meta_title: 'Best Hair Spa in Delhi',
  meta_description: 'Where to get a hair spa in Delhi and what it costs.',
  focus_keyword: 'hair spa',
  tags: ['hair'],
  author_name: 'Team Lubist',
  status: 'published',
  published_at: new Date(Date.now() - HOUR).toISOString(),
  reading_minutes: 2,
  ...overrides,
});

let requests;

function registerHandlers(post) {
  const handlers = [
    http.get(`${BASE}/blog/tags`, () =>
      HttpResponse.json({ success: true, tags: ['hair', 'bridal'], count: 2 })
    ),
    http.post(`${BASE}/blog`, async ({ request }) => {
      const body = await request.json();
      requests.push({ method: 'POST', body });
      return HttpResponse.json({
        success: true,
        message: 'created',
        post: { id: 'new-1', ...body, slug: body.slug || 'generated-slug' },
      });
    }),
    http.put(`${BASE}/blog/:postId`, async ({ request, params }) => {
      const body = await request.json();
      requests.push({ method: 'PUT', id: params.postId, body });
      return HttpResponse.json({
        success: true,
        message: 'updated',
        post: { ...(post || {}), ...body },
      });
    }),
  ];

  if (post) {
    handlers.unshift(
      http.get(`${BASE}/blog/admin/:postId`, () =>
        HttpResponse.json({ success: true, message: 'ok', post })
      )
    );
  }

  server.use(...handlers);
}

function renderEditor() {
  const store = configureStore({
    reducer: { [blogApi.reducerPath]: blogApi.reducer },
    middleware: (getDefault) => getDefault().concat(blogApi.middleware),
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <BlogEditor />
      </MemoryRouter>
    </Provider>
  );
}

const gotoSeoTab = (user) => user.click(screen.getByRole('tab', { name: /SEO/ }));

beforeEach(() => {
  requests = [];
  routeParams = {};
  vi.clearAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =====================================================================
// CREATING A POST
// =====================================================================
describe('new post', () => {
  beforeEach(() => registerHandlers(null));

  it('derives the slug from the title as it is typed', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText('Title'), 'Best Hair Spa in Delhi (2026)');
    await gotoSeoTab(user);

    // Matches blog_service._generate_slug so the previewed URL is the real one.
    expect(screen.getByLabelText('Slug')).toHaveValue('best-hair-spa-in-delhi-2026');
  });

  it('stops deriving the slug once the author edits it', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText('Title'), 'First title');
    await gotoSeoTab(user);
    await user.clear(screen.getByLabelText('Slug'));
    await user.type(screen.getByLabelText('Slug'), 'my-chosen-slug');

    await user.click(screen.getByRole('tab', { name: 'Write' }));
    await user.type(screen.getByLabelText('Title'), ' changed');

    await gotoSeoTab(user);
    expect(screen.getByLabelText('Slug')).toHaveValue('my-chosen-slug');
  });

  it('POSTs a draft and moves to the post\'s edit route', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText('Title'), 'Hair Spa Guide');
    await user.type(screen.getByLabelText('Article body'), '<p>Body</p>');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].method).toBe('POST');
    expect(requests[0].body).toMatchObject({
      title: 'Hair Spa Guide',
      content: '<p>Body</p>',
      slug: 'hair-spa-guide',
      status: 'draft',
    });
    // Without this the next save would create a second post.
    expect(mockNavigate).toHaveBeenCalledWith('/blog/new-1/edit', { replace: true });
  });

  it('adds an FAQ and includes it in the save payload', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText('Title'), 'Hair Spa Guide');
    await user.type(screen.getByLabelText('Article body'), '<p>Body</p>');
    await user.click(screen.getByRole('button', { name: '+ Add FAQ' }));
    await user.type(screen.getByLabelText('Question'), 'How often should I get a hair spa?');
    await user.type(screen.getByLabelText('Answer'), 'Every 4-6 weeks.');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].body.faqs).toEqual([
      { question: 'How often should I get a hair spa?', answer: 'Every 4-6 weeks.' },
    ]);
  });

  it('drops a fully blank FAQ row on save instead of erroring', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText('Title'), 'Hair Spa Guide');
    await user.type(screen.getByLabelText('Article body'), '<p>Body</p>');
    await user.click(screen.getByRole('button', { name: '+ Add FAQ' }));
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].body.faqs).toEqual([]);
  });

  it('blocks save when a FAQ has a question but no answer', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText('Title'), 'Hair Spa Guide');
    await user.type(screen.getByLabelText('Article body'), '<p>Body</p>');
    await user.click(screen.getByRole('button', { name: '+ Add FAQ' }));
    await user.type(screen.getByLabelText('Question'), 'Unanswered question?');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(toast.error).toHaveBeenCalledWith('FAQ #1 is missing its answer.');
    expect(requests).toHaveLength(0);
  });

  it('refuses to save without a title', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText('Article body'), '<p>Body</p>');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(toast.error).toHaveBeenCalledWith('A title is required.');
    expect(requests).toHaveLength(0);
  });

  it('refuses to publish an empty article', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText('Title'), 'Empty post');
    await user.click(screen.getByRole('button', { name: 'Publish now' }));

    expect(toast.error).toHaveBeenCalledWith('Cannot publish an empty article.');
    expect(requests).toHaveLength(0);
  });

  it('publishes with a publish timestamp so the post is immediately live', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText('Title'), 'Hair Spa Guide');
    await user.type(screen.getByLabelText('Article body'), '<p>Body</p>');
    await user.click(screen.getByRole('button', { name: 'Publish now' }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].body.status).toBe('published');
    // published_at must be in the past, or every public read would hide it.
    expect(new Date(requests[0].body.published_at).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('lets the author back out of publishing when SEO checks fail', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(false);
    renderEditor();

    await user.type(screen.getByLabelText('Title'), 'Hair Spa Guide');
    await user.type(screen.getByLabelText('Article body'), '<p>Body</p>');
    await user.click(screen.getByRole('button', { name: 'Publish now' }));

    expect(requests).toHaveLength(0);
    // Declining drops the author on the tab that fixes the problem.
    expect(screen.getByRole('tab', { name: /SEO/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('rejects a schedule date in the past', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText('Title'), 'Hair Spa Guide');
    await user.type(screen.getByLabelText('Article body'), '<p>Body</p>');
    await gotoSeoTab(user);
    await user.type(screen.getByLabelText('Publish at'), '2020-01-01T09:00');
    await user.click(screen.getByRole('button', { name: 'Schedule' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Scheduled time must be in the future — use Publish now instead'
    );
    expect(requests).toHaveLength(0);
  });
});

// =====================================================================
// COVER IMAGE ALT TEXT
// =====================================================================
describe('cover image alt text', () => {
  it('blocks a save when a cover image has no alt text', async () => {
    const user = userEvent.setup();
    registerHandlers(existingPost({ status: 'draft', cover_image_url: 'https://x/a.jpg', cover_image_alt: '' }));
    routeParams = { postId: 'p1' };
    renderEditor();

    await screen.findByDisplayValue('Best Hair Spa in Delhi');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    // The API rejects this too; catching it here saves a round trip.
    expect(toast.error).toHaveBeenCalledWith('Cover image alt text is required (SEO tab).');
    expect(requests).toHaveLength(0);
  });
});

// =====================================================================
// EDITING AN EXISTING POST
// =====================================================================
describe('existing post', () => {
  beforeEach(() => {
    registerHandlers(existingPost());
    routeParams = { postId: 'p1' };
  });

  it('loads the post and shows publish controls for a live article', async () => {
    renderEditor();

    expect(await screen.findByDisplayValue('Best Hair Spa in Delhi')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update post' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move to draft' })).toBeInTheDocument();
    // "Publish now" is meaningless for an already-live post.
    expect(screen.queryByRole('button', { name: 'Publish now' })).not.toBeInTheDocument();
  });

  it('renders the article in the published typography on the Preview tab', async () => {
    const user = userEvent.setup();
    const { container } = renderEditor();
    await screen.findByDisplayValue('Best Hair Spa in Delhi');

    await user.click(screen.getByRole('tab', { name: 'Preview' }));

    const article = container.querySelector('.blog-prose');
    expect(article).toBeInTheDocument();
    expect(article.querySelector('a[href="/salons"]')).toBeInTheDocument();
  });

  it('warns before changing the slug of a published post', async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue('Best Hair Spa in Delhi');

    await gotoSeoTab(user);
    await user.clear(screen.getByLabelText('Slug'));
    await user.type(screen.getByLabelText('Slug'), 'new-slug');

    expect(screen.getByText(/breaks every link search engines have indexed/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Update post' }));

    await waitFor(() => expect(window.confirm).toHaveBeenCalled());
    expect(window.confirm.mock.calls[0][0]).toContain('/blog/best-hair-spa-in-delhi');
    expect(window.confirm.mock.calls[0][0]).toContain('/blog/new-slug');
  });

  it('abandons the save when the slug-change warning is declined', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(false);
    renderEditor();
    await screen.findByDisplayValue('Best Hair Spa in Delhi');

    await gotoSeoTab(user);
    await user.clear(screen.getByLabelText('Slug'));
    await user.type(screen.getByLabelText('Slug'), 'new-slug');
    await user.click(screen.getByRole('button', { name: 'Update post' }));

    expect(requests).toHaveLength(0);
  });

  it('moves a live post back to draft', async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue('Best Hair Spa in Delhi');

    await user.click(screen.getByRole('button', { name: 'Move to draft' }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({ method: 'PUT', id: 'p1', body: { status: 'draft' } });
  });
});

// =====================================================================
// SEO TAB
// =====================================================================
describe('SEO tab', () => {
  beforeEach(() => {
    registerHandlers(existingPost());
    routeParams = { postId: 'p1' };
  });

  it('counts meta fields against the limits the API enforces', async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue('Best Hair Spa in Delhi');
    await gotoSeoTab(user);

    expect(screen.getByText(/^22\/70 characters/)).toBeInTheDocument();
    expect(screen.getByText(/^51\/160 characters/)).toBeInTheDocument();
  });

  it('caps the meta title at the length the backend accepts', async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue('Best Hair Spa in Delhi');
    await gotoSeoTab(user);

    const metaTitle = screen.getByLabelText('Meta title');
    await user.clear(metaTitle);
    await user.type(metaTitle, 'x'.repeat(90));

    expect(metaTitle.value).toHaveLength(70);
  });

  it('shows the search-result preview using the meta fields', async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue('Best Hair Spa in Delhi');
    await gotoSeoTab(user);

    // Scoped to the preview: the same copy also sits in the meta description field.
    const preview = within(screen.getByRole('region', { name: 'Search result preview' }));
    expect(preview.getByText('Where to get a hair spa in Delhi and what it costs.')).toBeInTheDocument();
    expect(preview.getByText(/› blog › best-hair-spa-in-delhi/)).toBeInTheDocument();
    expect(preview.getByText('Best Hair Spa in Delhi')).toBeInTheDocument();
  });

  it('flags the SEO gaps that matter for ranking', async () => {
    const user = userEvent.setup();
    server.resetHandlers();
    registerHandlers(
      existingPost({
        focus_keyword: '',
        meta_description: '',
        excerpt: '',
        cover_image_url: null,
        content: '<p>No links at all here.</p>',
      })
    );
    renderEditor();
    await screen.findByDisplayValue('Best Hair Spa in Delhi');
    await gotoSeoTab(user);

    // Scoped to the checks list — the SERP preview carries its own empty-state copy.
    const checks = within(screen.getByRole('list', { name: 'SEO issues' }));
    expect(checks.getByText('No focus keyword set.')).toBeInTheDocument();
    expect(checks.getByText(/No meta description or excerpt/)).toBeInTheDocument();
    expect(checks.getByText(/No cover image/)).toBeInTheDocument();
    expect(checks.getByText(/No links in the article/)).toBeInTheDocument();
  });

  it('adds and removes tags', async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue('Best Hair Spa in Delhi');
    await gotoSeoTab(user);

    await user.type(screen.getByPlaceholderText('Type a tag and press Enter'), 'bridal makeup{Enter}');
    expect(screen.getByText('bridal makeup')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove tag bridal makeup' }));
    expect(screen.queryByText('bridal makeup')).not.toBeInTheDocument();
  });
});

// =====================================================================
// AUTOSAVE
// =====================================================================
describe('autosave', () => {
  it('autosaves a draft without a toast', async () => {
    const user = userEvent.setup();
    registerHandlers(existingPost({ status: 'draft', published_at: null }));
    routeParams = { postId: 'p1' };
    renderEditor();
    await screen.findByDisplayValue('Best Hair Spa in Delhi');

    await user.type(screen.getByLabelText('Article body'), ' more');

    await waitFor(() => expect(requests).toHaveLength(1), { timeout: 6000 });
    expect(requests[0]).toMatchObject({ method: 'PUT', id: 'p1' });
    expect(requests[0].body.status).toBe('draft');
    // Autosave is silent; a toast on every pause would be noise.
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('never autosaves a published post', async () => {
    const user = userEvent.setup();
    registerHandlers(existingPost());
    routeParams = { postId: 'p1' };
    renderEditor();
    await screen.findByDisplayValue('Best Hair Spa in Delhi');

    await user.type(screen.getByLabelText('Article body'), ' an accidental keystroke');
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // A live page in search results must only change when the author says so.
    expect(requests).toHaveLength(0);
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  }, 10000);
});
