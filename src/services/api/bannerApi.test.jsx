/**
 * Integration tests for the admin banner API client (bannerApi.js).
 *
 * Exercises the RTK Query endpoints against a mocked backend (MSW), verifying
 * the exact HTTP contract the admin panel relies on: URL, method, query params,
 * and request body. The admin half of the banner feature — paired with
 * backend/tests/test_banner_mocked.py.
 *
 * Pattern: a throwaway store per test (fresh RTK Query cache) + per-test MSW
 * handlers registered via server.use(...) (reset in src/test/setup.js).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';

import { server } from '../../test/mswServer';
import { bannerApi } from './bannerApi';
import * as bannerApiModule from './bannerApi';

const BASE = 'http://localhost:8000/api/v1';

function makeStore() {
  return configureStore({
    reducer: { [bannerApi.reducerPath]: bannerApi.reducer },
    middleware: (getDefault) => getDefault().concat(bannerApi.middleware),
  });
}

let store;
beforeEach(() => {
  store = makeStore();
});

// =====================================================================
// GET /banners/admin/all  (list incl. inactive)
// =====================================================================
describe('getAllBanners', () => {
  it('hits GET /banners/admin/all', async () => {
    let seenUrl = null;
    server.use(
      http.get(`${BASE}/banners/admin/all`, ({ request }) => {
        seenUrl = new URL(request.url);
        return HttpResponse.json({
          success: true,
          banners: [{ id: 'b1', title: 'Promo', is_active: false, sort_order: 0 }],
          count: 1,
        });
      })
    );

    const res = await store.dispatch(bannerApi.endpoints.getAllBanners.initiate());
    expect(seenUrl.pathname).toBe('/api/v1/banners/admin/all');
    expect(res.data.banners).toHaveLength(1);
  });
});

// =====================================================================
// POST /banners  (create)
// =====================================================================
describe('createBanner', () => {
  it('POSTs the banner body to /banners', async () => {
    let body = null;
    server.use(
      http.post(`${BASE}/banners`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          success: true,
          message: 'created',
          banner: { id: 'new-1', ...body },
        });
      })
    );

    const res = await store.dispatch(
      bannerApi.endpoints.createBanner.initiate({
        image_url: 'https://res.cloudinary.com/x/banners/a.jpg',
        title: 'Sale',
      })
    );
    expect(body).toEqual({ image_url: 'https://res.cloudinary.com/x/banners/a.jpg', title: 'Sale' });
    expect(res.data.banner.id).toBe('new-1');
  });
});

// =====================================================================
// PUT /banners/{id}  (update)
// =====================================================================
describe('updateBanner', () => {
  it('PUTs to /banners/{id} with the changed fields', async () => {
    let seenPath = null;
    let body = null;
    server.use(
      http.put(`${BASE}/banners/:id`, async ({ request, params }) => {
        seenPath = new URL(request.url).pathname;
        body = await request.json();
        return HttpResponse.json({
          success: true,
          message: 'updated',
          banner: { id: params.id, ...body },
        });
      })
    );

    const res = await store.dispatch(
      bannerApi.endpoints.updateBanner.initiate({
        bannerId: 'abc-123',
        data: { is_active: false },
      })
    );
    expect(seenPath).toBe('/api/v1/banners/abc-123');
    expect(body).toEqual({ is_active: false });
    expect(res.data.banner.is_active).toBe(false);
  });
});

// =====================================================================
// PUT /banners/reorder  (bulk order update)
// =====================================================================
describe('reorderBanners', () => {
  it('PUTs the orders array to /banners/reorder', async () => {
    let seenPath = null;
    let body = null;
    server.use(
      http.put(`${BASE}/banners/reorder`, async ({ request }) => {
        seenPath = new URL(request.url).pathname;
        body = await request.json();
        return HttpResponse.json({ success: true, banners: [], count: 0 });
      })
    );

    const orders = [
      { id: 'b1', sort_order: 0 },
      { id: 'b2', sort_order: 1 },
    ];
    await store.dispatch(bannerApi.endpoints.reorderBanners.initiate(orders));
    expect(seenPath).toBe('/api/v1/banners/reorder');
    expect(body).toEqual({ orders });
  });
});

// =====================================================================
// DELETE /banners/{id}  (soft by default, hard via flag)
// =====================================================================
describe('deleteBanner', () => {
  it('DELETEs /banners/{id} with hard=false by default', async () => {
    let params = null;
    server.use(
      http.delete(`${BASE}/banners/:id`, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json({ success: true, message: 'Banner deactivated', banner_id: 'abc-123' });
      })
    );

    const res = await store.dispatch(bannerApi.endpoints.deleteBanner.initiate({ bannerId: 'abc-123' }));
    expect(params.get('hard')).toBe('false');
    expect(res.data.message).toBe('Banner deactivated');
  });

  it('passes hard=true when requested', async () => {
    let params = null;
    server.use(
      http.delete(`${BASE}/banners/:id`, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json({ success: true, message: 'Banner permanently deleted', banner_id: 'abc-123' });
      })
    );

    await store.dispatch(bannerApi.endpoints.deleteBanner.initiate({ bannerId: 'abc-123', hard: true }));
    expect(params.get('hard')).toBe('true');
  });
});

// =====================================================================
// POST /upload/cloudinary-banner-image  (image upload)
//
// The real multipart round-trip is covered by the backend upload tests; here we
// only assert the client is wired to the endpoint (a jsdom FormData pushed
// through axios+MSW in node doesn't resolve cleanly).
// =====================================================================
describe('uploadBannerImage', () => {
  it('exposes the mutation hook and registered endpoint', () => {
    expect(bannerApiModule.useUploadBannerImageMutation).toBeTypeOf('function');
    expect(bannerApi.endpoints.uploadBannerImage).toBeDefined();
  });
});
