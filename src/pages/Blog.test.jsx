/**
 * Integration tests for the admin Blog list page.
 *
 * Renders the real <Blog/> page wired to the real blogApi RTK Query slice
 * (axios base query), with the backend mocked at the network layer by MSW.
 * Covers the flows the admin actually uses:
 *   - GET    /api/v1/blog/admin/all   (list incl. drafts, status/search filters)
 *   - DELETE /api/v1/blog/{id}        (archive — keeps the slug reserved)
 *   - PUT    /api/v1/blog/{id}        (restore an archived post to draft)
 *
 * toast and window.confirm are mocked so destructive paths can be asserted.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';

import { server } from '../test/mswServer';
import { blogApi } from '../services/api/blogApi';
import Blog from './Blog';

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
import { toast } from 'react-toastify';

const BASE = 'http://localhost:8000/api/v1';
const HOUR = 60 * 60 * 1000;

const makePost = (overrides = {}) => ({
  id: 'p1',
  title: 'Best Hair Spa in Delhi',
  slug: 'best-hair-spa-in-delhi',
  excerpt: 'A guide',
  cover_image_url: null,
  cover_image_alt: null,
  focus_keyword: 'hair spa delhi',
  tags: ['hair'],
  author_name: 'Team Lubist',
  status: 'published',
  published_at: new Date(Date.now() - HOUR).toISOString(),
  reading_minutes: 4,
  ...overrides,
});

let posts;
let listRequests;
let mutations;

function registerHandlers() {
  server.use(
    http.get(`${BASE}/blog/admin/all`, ({ request }) => {
      const url = new URL(request.url);
      listRequests.push(url);
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search');
      let result = posts;
      if (status) result = result.filter((p) => p.status === status);
      if (search) result = result.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));
      return HttpResponse.json({
        success: true,
        posts: result,
        count: result.length,
        total: result.length,
        offset: 0,
        limit: 25,
      });
    }),
    http.delete(`${BASE}/blog/:postId`, ({ request, params }) => {
      const url = new URL(request.url);
      mutations.push({ method: 'DELETE', id: params.postId, hard: url.searchParams.get('hard') });
      posts = posts.map((p) => (p.id === params.postId ? { ...p, status: 'archived' } : p));
      return HttpResponse.json({ success: true, message: 'Blog post archived', post_id: params.postId });
    }),
    http.put(`${BASE}/blog/:postId`, async ({ request, params }) => {
      const body = await request.json();
      mutations.push({ method: 'PUT', id: params.postId, body });
      posts = posts.map((p) => (p.id === params.postId ? { ...p, ...body } : p));
      return HttpResponse.json({ success: true, message: 'updated', post: posts.find((p) => p.id === params.postId) });
    })
  );
}

function renderPage() {
  const store = configureStore({
    reducer: { [blogApi.reducerPath]: blogApi.reducer },
    middleware: (getDefault) => getDefault().concat(blogApi.middleware),
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Blog />
      </MemoryRouter>
    </Provider>
  );
}

beforeEach(() => {
  posts = [makePost()];
  listRequests = [];
  mutations = [];
  vi.clearAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  registerHandlers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =====================================================================
// LIST + DERIVED STATUS
// =====================================================================
describe('post list', () => {
  it('renders posts with their slug and focus keyword', async () => {
    renderPage();

    expect(await screen.findByText('Best Hair Spa in Delhi')).toBeInTheDocument();
    expect(screen.getByText('/blog/best-hair-spa-in-delhi')).toBeInTheDocument();
    expect(screen.getByText('hair spa delhi')).toBeInTheDocument();
    expect(screen.getByText('4 min')).toBeInTheDocument();
  });

  it('shows a published post with a future date as Scheduled, not Live', async () => {
    // The backend hides these from every public read until the date passes, so
    // the admin list must not claim they are already live.
    posts = [makePost({ published_at: new Date(Date.now() + HOUR).toISOString() })];
    renderPage();

    expect(await screen.findByText('Scheduled')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('flags a post with no focus keyword', async () => {
    posts = [makePost({ focus_keyword: null })];
    renderPage();

    expect(await screen.findByText('Not set')).toBeInTheDocument();
  });

  it('offers a View link only for posts that are actually live', async () => {
    posts = [
      makePost({ id: 'p1', title: 'Live post' }),
      makePost({ id: 'p2', title: 'Draft post', status: 'draft', published_at: null }),
    ];
    renderPage();

    await screen.findByText('Live post');
    // One View link total — the draft has no public URL to open.
    expect(screen.getAllByRole('link', { name: 'View' })).toHaveLength(1);
  });

  it('shows an empty state when there are no posts', async () => {
    posts = [];
    renderPage();

    expect(await screen.findByText('No posts yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Write the first post' })).toBeInTheDocument();
  });
});

// =====================================================================
// FILTERS
// =====================================================================
describe('filters', () => {
  it('sends the status filter to the backend', async () => {
    const user = userEvent.setup();
    posts = [
      makePost({ id: 'p1', title: 'Live post' }),
      makePost({ id: 'p2', title: 'Draft post', status: 'draft', published_at: null }),
    ];
    renderPage();
    await screen.findByText('Live post');

    await user.selectOptions(screen.getByLabelText('Status'), 'draft');

    await waitFor(() => {
      expect(listRequests.at(-1).searchParams.get('status')).toBe('draft');
    });
    expect(await screen.findByText('Draft post')).toBeInTheDocument();
    expect(screen.queryByText('Live post')).not.toBeInTheDocument();
  });

  it('only searches on submit, not on every keystroke', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Best Hair Spa in Delhi');

    const before = listRequests.length;
    await user.type(screen.getByLabelText('Search'), 'hair');

    // Typing alone must not fire requests — the backend matches whole phrases,
    // so prefixes would just burn requests that match nothing.
    expect(listRequests).toHaveLength(before);

    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(listRequests.at(-1).searchParams.get('search')).toBe('hair');
    });
  });
});

// =====================================================================
// ARCHIVE / RESTORE
// =====================================================================
describe('archive and restore', () => {
  it('archives rather than hard-deleting, and warns that the post is live', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Best Hair Spa in Delhi');

    await user.click(screen.getByRole('button', { name: 'Archive' }));

    await waitFor(() => expect(mutations).toHaveLength(1));
    // Archiving keeps the slug reserved so an indexed URL is never reused.
    expect(mutations[0]).toMatchObject({ method: 'DELETE', id: 'p1', hard: 'false' });
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('is live'));
    expect(toast.success).toHaveBeenCalledWith('Post archived');
  });

  it('does nothing when the archive confirmation is declined', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(false);
    renderPage();
    await screen.findByText('Best Hair Spa in Delhi');

    await user.click(screen.getByRole('button', { name: 'Archive' }));

    expect(mutations).toHaveLength(0);
  });

  it('restores an archived post as a draft', async () => {
    const user = userEvent.setup();
    posts = [makePost({ status: 'archived' })];
    renderPage();
    await screen.findByText('Best Hair Spa in Delhi');

    await user.click(screen.getByRole('button', { name: 'Restore' }));

    await waitFor(() => expect(mutations).toHaveLength(1));
    expect(mutations[0]).toMatchObject({ method: 'PUT', id: 'p1', body: { status: 'draft' } });
    expect(toast.success).toHaveBeenCalledWith('Post restored as a draft');
  });

  it('surfaces a backend failure as an error toast', async () => {
    const user = userEvent.setup();
    server.use(
      http.delete(`${BASE}/blog/:postId`, () =>
        HttpResponse.json({ detail: 'Blog post not found' }, { status: 404 })
      )
    );
    renderPage();
    await screen.findByText('Best Hair Spa in Delhi');

    await user.click(screen.getByRole('button', { name: 'Archive' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Blog post not found'));
  });
});

// =====================================================================
// EDIT LINKS
// =====================================================================
describe('navigation', () => {
  it('links the title to the editor route for that post id', async () => {
    renderPage();

    const link = await screen.findByRole('link', { name: /Best Hair Spa in Delhi/ });
    expect(link).toHaveAttribute('href', '/blog/p1/edit');
  });

  it('renders the row action set for a live post', async () => {
    renderPage();
    await screen.findByText('Best Hair Spa in Delhi');

    const row = screen.getByText('Best Hair Spa in Delhi').closest('tr');
    expect(within(row).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'View' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Archive' })).toBeInTheDocument();
  });
});
