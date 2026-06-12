/**
 * Integration tests for the admin_service-backed endpoints consumed by the admin
 * panel: dashboard stats (adminApi.getDashboardStats -> /admin/stats) and the
 * pending vendor-requests list (salonApi.getPendingSalons -> /admin/vendor-requests).
 * Paired with backend/tests/test_admin_mocked.py.
 *
 * (approve/reject -> vendor_approval_service; recent-activity -> activity_log are
 *  separate modules and tested elsewhere.)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';

import { server } from '../../test/mswServer';
import { adminApi } from './adminApi';
import { salonApi } from './salonApi';

const BASE = 'http://localhost:8000/api/v1/admin';

function makeStore() {
  return configureStore({
    reducer: {
      [adminApi.reducerPath]: adminApi.reducer,
      [salonApi.reducerPath]: salonApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(adminApi.middleware, salonApi.middleware),
  });
}

let store;
beforeEach(() => {
  store = makeStore();
});

// =====================================================================
// GET /admin/stats
// =====================================================================
describe('getDashboardStats', () => {
  it('hits GET /admin/stats and returns the stats payload', async () => {
    let seenPath = null;
    server.use(
      http.get(`${BASE}/stats`, ({ request }) => {
        seenPath = new URL(request.url).pathname;
        return HttpResponse.json({
          total_salons: 3, active_salons: 2, pending_requests: 2,
          total_rms: 2, total_bookings: 3, today_bookings: 1,
          total_revenue: 600, this_month_revenue: 600, pending_payment_salons: 1,
        });
      })
    );

    const res = await store.dispatch(adminApi.endpoints.getDashboardStats.initiate());
    expect(seenPath).toBe('/api/v1/admin/stats');
    expect(res.data.total_salons).toBe(3);
    expect(res.data.total_revenue).toBe(600);
  });
});

// =====================================================================
// GET /admin/vendor-requests  (pending list)
// =====================================================================
describe('getPendingSalons', () => {
  it('hits GET /admin/vendor-requests with status_filter=pending', async () => {
    let url = null;
    server.use(
      http.get(`${BASE}/vendor-requests`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json([
          { id: 'r1', status: 'pending', business_name: 'Biz', rm_profile: { profiles: { full_name: 'Alice RM' } } },
        ]);
      })
    );

    const res = await store.dispatch(salonApi.endpoints.getPendingSalons.initiate({ limit: 50, offset: 0 }));
    expect(url.pathname).toBe('/api/v1/admin/vendor-requests');
    expect(url.searchParams.get('status_filter')).toBe('pending');
    expect(res.data).toHaveLength(1);
    expect(res.data[0].rm_profile.profiles.full_name).toBe('Alice RM');
  });
});
