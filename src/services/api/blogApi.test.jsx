/**
 * Integration tests for the admin blog API client (blogApi.js).
 *
 * Exercises the RTK Query endpoints against a mocked backend (MSW), verifying
 * the exact HTTP contract app/api/blog.py exposes: URL, method, query params
 * and request body. The admin half of the blog feature — paired with
 * backend/tests/test_blog_mocked.py.
 *
 * Pattern: a throwaway store per test (fresh RTK Query cache) + per-test MSW
 * handlers registered via server.use(...) (reset in src/test/setup.js).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';

import { server } from '../../test/mswServer';
import { blogApi } from './blogApi';
import * as blogApiModule from './blogApi';

const BASE = 'http://localhost:8000/api/v1';

function makeStore() {
  return configureStore({
    reducer: { [blogApi.reducerPath]: blogApi.reducer },
    middleware: (getDefault) => getDefault().concat(blogApi.middleware),
  });
}

let store;
beforeEach(() => {
  store = makeStore();
});

// =====================================================================
// GET /blog/admin/all  (list incl. drafts)
// =====================================================================
describe('getAllBlogPosts', () => {
  it('hits GET /blog/admin/all with pagination defaults', async () => {
    let seenUrl = null;
    server.use(
      http.get(`${BASE}/blog/admin/all`, ({ request }) => {
        seenUrl = new URL(request.url);
        return HttpResponse.json({
          success: true,
          posts: [{ id: 'p1', title: 'Hair spa guide', slug: 'hair-spa-guide', status: 'draft' }],
          count: 1,
          total: 1,
          offset: 0,
          limit: 25,
        });
      })
    );

    const res = await store.dispatch(blogApi.endpoints.getAllBlogPosts.initiate({}));

    expect(seenUrl.pathname).toBe('/api/v1/blog/admin/all');
    expect(seenUrl.searchParams.get('limit')).toBe('25');
    expect(seenUrl.searchParams.get('offset')).toBe('0');
    expect(res.data.posts).toHaveLength(1);
  });

  it('forwards status and search filters, and omits them when unset', async () => {
    const seen = [];
    server.use(
      http.get(`${BASE}/blog/admin/all`, ({ request }) => {
        seen.push(new URL(request.url));
        return HttpResponse.json({ success: true, posts: [], count: 0, total: 0, offset: 0, limit: 25 });
      })
    );

    await store.dispatch(
      blogApi.endpoints.getAllBlogPosts.initiate({
        status: 'published',
        search: 'hair spa',
        limit: 10,
        offset: 20,
      })
    );
    await store.dispatch(blogApi.endpoints.getAllBlogPosts.initiate({ limit: 10, offset: 0 }));

    expect(seen[0].searchParams.get('status')).toBe('published');
    expect(seen[0].searchParams.get('search')).toBe('hair spa');
    expect(seen[0].searchParams.get('offset')).toBe('20');

    // No empty status=/search= params — the backend treats those as filters.
    expect(seen[1].searchParams.has('status')).toBe(false);
    expect(seen[1].searchParams.has('search')).toBe(false);
  });
});

// =====================================================================
// GET /blog/admin/{id}  (editor load — must NOT use the public slug route)
// =====================================================================
describe('getBlogPostById', () => {
  it('loads a draft by UUID via the admin route', async () => {
    let seenUrl = null;
    server.use(
      http.get(`${BASE}/blog/admin/:postId`, ({ request, params }) => {
        seenUrl = new URL(request.url);
        return HttpResponse.json({
          success: true,
          message: 'Blog post retrieved',
          post: { id: params.postId, title: 'Draft post', status: 'draft', content: '<p>Body</p>' },
        });
      })
    );

    const res = await store.dispatch(blogApi.endpoints.getBlogPostById.initiate('abc-123'));

    expect(seenUrl.pathname).toBe('/api/v1/blog/admin/abc-123');
    expect(res.data.post.status).toBe('draft');
  });
});

// =====================================================================
// GET /blog/tags
// =====================================================================
describe('getBlogTags', () => {
  it('hits the public tags route', async () => {
    let seenUrl = null;
    server.use(
      http.get(`${BASE}/blog/tags`, ({ request }) => {
        seenUrl = new URL(request.url);
        return HttpResponse.json({ success: true, tags: ['hair', 'bridal'], count: 2 });
      })
    );

    const res = await store.dispatch(blogApi.endpoints.getBlogTags.initiate());

    expect(seenUrl.pathname).toBe('/api/v1/blog/tags');
    expect(res.data.tags).toEqual(['hair', 'bridal']);
  });
});

// =====================================================================
// POST /blog  (create)
// =====================================================================
describe('createBlogPost', () => {
  it('POSTs the post body to /blog', async () => {
    let body = null;
    server.use(
      http.post(`${BASE}/blog`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          success: true,
          message: 'Blog post created successfully',
          post: { id: 'new-1', slug: 'hair-spa-guide', ...body },
        });
      })
    );

    const res = await store.dispatch(
      blogApi.endpoints.createBlogPost.initiate({
        title: 'Hair Spa Guide',
        content: '<p>Body</p>',
        status: 'draft',
        tags: ['hair'],
      })
    );

    expect(body).toEqual({
      title: 'Hair Spa Guide',
      content: '<p>Body</p>',
      status: 'draft',
      tags: ['hair'],
    });
    expect(res.data.post.id).toBe('new-1');
  });

  it('surfaces a validation error from the API', async () => {
    server.use(
      http.post(`${BASE}/blog`, () =>
        HttpResponse.json({ detail: 'cover_image_alt is required when cover_image_url is set' }, { status: 422 })
      )
    );

    const res = await store.dispatch(
      blogApi.endpoints.createBlogPost.initiate({ title: 'X', cover_image_url: 'https://x/a.jpg' })
    );

    expect(res.error.status).toBe(422);
    expect(res.error.data.detail).toMatch(/cover_image_alt/);
  });
});

// =====================================================================
// PUT /blog/{id}  (update)
// =====================================================================
describe('updateBlogPost', () => {
  it('PUTs to /blog/{postId} with the changed fields', async () => {
    let body = null;
    let seenUrl = null;
    server.use(
      http.put(`${BASE}/blog/:postId`, async ({ request }) => {
        seenUrl = new URL(request.url);
        body = await request.json();
        return HttpResponse.json({
          success: true,
          message: 'Blog post updated successfully',
          post: { id: 'p1', status: 'published' },
        });
      })
    );

    await store.dispatch(
      blogApi.endpoints.updateBlogPost.initiate({
        postId: 'p1',
        data: { status: 'published', published_at: '2026-08-20T10:00:00.000Z' },
      })
    );

    expect(seenUrl.pathname).toBe('/api/v1/blog/p1');
    expect(body).toEqual({ status: 'published', published_at: '2026-08-20T10:00:00.000Z' });
  });
});

// =====================================================================
// DELETE /blog/{id}  (archive by default)
// =====================================================================
describe('deleteBlogPost', () => {
  it('archives by default (hard=false) rather than purging the row', async () => {
    let seenUrl = null;
    server.use(
      http.delete(`${BASE}/blog/:postId`, ({ request }) => {
        seenUrl = new URL(request.url);
        return HttpResponse.json({ success: true, message: 'Blog post archived', post_id: 'p1' });
      })
    );

    await store.dispatch(blogApi.endpoints.deleteBlogPost.initiate({ postId: 'p1' }));

    // Archiving keeps the slug reserved so an indexed URL can never be reused.
    expect(seenUrl.pathname).toBe('/api/v1/blog/p1');
    expect(seenUrl.searchParams.get('hard')).toBe('false');
  });

  it('passes hard=true when a permanent delete is requested', async () => {
    let seenUrl = null;
    server.use(
      http.delete(`${BASE}/blog/:postId`, ({ request }) => {
        seenUrl = new URL(request.url);
        return HttpResponse.json({ success: true, message: 'Blog post deleted', post_id: 'p1' });
      })
    );

    await store.dispatch(blogApi.endpoints.deleteBlogPost.initiate({ postId: 'p1', hard: true }));

    expect(seenUrl.searchParams.get('hard')).toBe('true');
  });
});

// =====================================================================
// POST /upload/cloudinary-blog-image  (cover + in-article images)
//
// The real multipart round-trip is covered by the backend upload tests; here we
// only assert the client is wired to the endpoint (a jsdom FormData pushed
// through axios+MSW in node doesn't resolve cleanly) — same limitation as
// bannerApi.test.jsx.
// =====================================================================
describe('uploadBlogImage', () => {
  it('exposes the mutation hook and registered endpoint', () => {
    expect(blogApiModule.useUploadBlogImageMutation).toBeTypeOf('function');
    expect(blogApi.endpoints.uploadBlogImage).toBeDefined();
  });
});
