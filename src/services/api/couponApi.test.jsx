/**
 * Integration tests for the admin coupon API client (couponApi.js).
 *
 * MSW-mocked backend; verifies the exact HTTP contract the admin coupon UI
 * relies on: URL, method, query params, and request body for the
 * admin/coupons CRUD. Paired with backend/tests/test_coupon_pricing.py.
 *
 * Pattern: a throwaway store per test (fresh RTK Query cache) + per-test MSW
 * handlers registered via server.use(...) (reset in src/test/setup.js).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';

import { server } from '../../test/mswServer';
import { couponApi } from './couponApi';

const BASE = 'http://localhost:8000/api/v1';
const COUPONS = `${BASE}/admin/coupons`;

const sampleCoupon = (overrides = {}) => ({
  id: 'c1',
  code: 'SAVE20',
  title: '20% off services',
  scope: 'platform',
  salon_id: null,
  funded_by: 'platform',
  applies_to: 'service',
  discount_type: 'percentage',
  discount_value: 20,
  max_discount_cap: 300,
  min_order_amount: null,
  first_time_scope: null,
  usage_limit_total: null,
  usage_limit_per_user: 1,
  used_count: 4,
  valid_from: '2026-06-01T00:00:00Z',
  valid_until: null,
  is_active: true,
  ...overrides,
});

function makeStore() {
  return configureStore({
    reducer: { [couponApi.reducerPath]: couponApi.reducer },
    middleware: (getDefault) => getDefault().concat(couponApi.middleware),
  });
}

let store;
beforeEach(() => {
  store = makeStore();
});

// =====================================================================
// GET /admin/coupons  (list, returns a plain array)
// =====================================================================
describe('getCoupons', () => {
  it('GETs /admin/coupons and returns the array as-is', async () => {
    let seenUrl = null;
    server.use(
      http.get(COUPONS, ({ request }) => {
        seenUrl = new URL(request.url);
        return HttpResponse.json([sampleCoupon()]);
      })
    );

    const res = await store.dispatch(couponApi.endpoints.getCoupons.initiate());
    expect(seenUrl.pathname).toBe('/api/v1/admin/coupons');
    expect(res.data).toHaveLength(1);
    expect(res.data[0].code).toBe('SAVE20');
  });

  it('forwards the scope filter as a query param', async () => {
    let seenUrl = null;
    server.use(
      http.get(COUPONS, ({ request }) => {
        seenUrl = new URL(request.url);
        return HttpResponse.json([]);
      })
    );

    await store.dispatch(couponApi.endpoints.getCoupons.initiate({ scope: 'vendor' }));
    expect(seenUrl.searchParams.get('scope')).toBe('vendor');
  });
});

// =====================================================================
// GET /admin/coupons/{id}
// =====================================================================
describe('getCoupon', () => {
  it('GETs a single coupon by id', async () => {
    let seenPath = null;
    server.use(
      http.get(`${COUPONS}/:id`, ({ request, params }) => {
        seenPath = new URL(request.url).pathname;
        return HttpResponse.json(sampleCoupon({ id: params.id }));
      })
    );

    const res = await store.dispatch(couponApi.endpoints.getCoupon.initiate('c1'));
    expect(seenPath).toBe('/api/v1/admin/coupons/c1');
    expect(res.data.id).toBe('c1');
  });
});

// =====================================================================
// POST /admin/coupons  (create)
// =====================================================================
describe('createCoupon', () => {
  it('POSTs the coupon body to /admin/coupons', async () => {
    let body = null;
    server.use(
      http.post(COUPONS, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(sampleCoupon({ id: 'new-1', ...body }));
      })
    );

    const payload = {
      code: 'NEWYEAR',
      title: 'New year 25% off',
      scope: 'platform',
      funded_by: 'platform',
      applies_to: 'service',
      discount_type: 'percentage',
      discount_value: 25,
    };
    const res = await store.dispatch(couponApi.endpoints.createCoupon.initiate(payload));
    expect(body).toEqual(payload);
    expect(res.data.id).toBe('new-1');
  });

  it('surfaces a 409 (duplicate active code) as an error', async () => {
    server.use(
      http.post(COUPONS, () =>
        HttpResponse.json({ detail: 'Coupon code already exists' }, { status: 409 })
      )
    );

    const res = await store.dispatch(
      couponApi.endpoints.createCoupon.initiate({ code: 'SAVE20' })
    );
    expect(res.error.status).toBe(409);
  });
});

// =====================================================================
// PATCH /admin/coupons/{id}  (update — code & scope immutable)
// =====================================================================
describe('updateCoupon', () => {
  it('PATCHes /admin/coupons/{id} with the mutable fields', async () => {
    let seenPath = null;
    let seenMethod = null;
    let body = null;
    server.use(
      http.patch(`${COUPONS}/:id`, async ({ request, params }) => {
        seenPath = new URL(request.url).pathname;
        seenMethod = request.method;
        body = await request.json();
        return HttpResponse.json(sampleCoupon({ id: params.id, ...body }));
      })
    );

    const res = await store.dispatch(
      couponApi.endpoints.updateCoupon.initiate({
        couponId: 'c1',
        data: { title: 'Renamed', is_active: false },
      })
    );
    expect(seenMethod).toBe('PATCH');
    expect(seenPath).toBe('/api/v1/admin/coupons/c1');
    expect(body).toEqual({ title: 'Renamed', is_active: false });
    expect(res.data.title).toBe('Renamed');
  });
});

// =====================================================================
// DELETE /admin/coupons/{id}  (deactivate — keeps history)
// =====================================================================
describe('deactivateCoupon', () => {
  it('DELETEs /admin/coupons/{id}', async () => {
    let seenPath = null;
    let seenMethod = null;
    server.use(
      http.delete(`${COUPONS}/:id`, ({ request, params }) => {
        seenPath = new URL(request.url).pathname;
        seenMethod = request.method;
        return HttpResponse.json(sampleCoupon({ id: params.id, is_active: false }));
      })
    );

    const res = await store.dispatch(couponApi.endpoints.deactivateCoupon.initiate('c1'));
    expect(seenMethod).toBe('DELETE');
    expect(seenPath).toBe('/api/v1/admin/coupons/c1');
    expect(res.data.is_active).toBe(false);
  });
});
