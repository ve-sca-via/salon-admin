/**
 * Integration tests for the admin panel's vendor_approval_service surface:
 * the approve / reject mutations the PendingSalons page fires
 * (salonApi.approveVendorRequest / rejectVendorRequest). Confirms each mutation
 * targets the real backend route and sends the admin_notes body the API expects.
 * Paired with backend/tests/test_vendor_approval_mocked.py.
 *
 *   approveVendorRequest -> POST /admin/vendor-requests/{id}/approve  { admin_notes }
 *   rejectVendorRequest  -> POST /admin/vendor-requests/{id}/reject   { admin_notes }
 *
 * (getPendingSalons -> GET /admin/vendor-requests is the admin_service list and
 *  is covered in adminApi.test.jsx.)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';

import { server } from '../../test/mswServer';
import { salonApi } from './salonApi';

const BASE = 'http://localhost:8000/api/v1/admin';

function makeStore() {
  return configureStore({
    reducer: { [salonApi.reducerPath]: salonApi.reducer },
    middleware: (g) => g().concat(salonApi.middleware),
  });
}
let store;
beforeEach(() => { store = makeStore(); });

describe('approveVendorRequest', () => {
  it('POSTs admin_notes to /admin/vendor-requests/{id}/approve', async () => {
    let path = null, method = null, body = null;
    server.use(
      http.post(`${BASE}/vendor-requests/:id/approve`, async ({ request }) => {
        path = new URL(request.url).pathname;
        method = request.method;
        body = await request.json();
        return HttpResponse.json({
          success: true,
          message: 'Vendor request approved successfully',
          data: { salon_id: 's1', rm_score_awarded: 10, warnings: null },
        });
      })
    );

    const res = await store.dispatch(
      salonApi.endpoints.approveVendorRequest.initiate({ requestId: 'r1', adminNotes: 'Looks good' })
    );

    expect(path).toBe('/api/v1/admin/vendor-requests/r1/approve');
    expect(method).toBe('POST');
    // No fee entered -> null, meaning "use the default fee for this account type".
    expect(body).toEqual({ admin_notes: 'Looks good', custom_registration_fee_amount: null });
    expect(res.data.success).toBe(true);
    expect(res.data.data.salon_id).toBe('s1');
  });

  it.each([
    ['1500', 1500],
    ['0', 0], // 0 waives the fee; must not be treated as "blank"
  ])('sends a custom registration fee of %s as a number', async (input, expected) => {
    let body = null;
    server.use(
      http.post(`${BASE}/vendor-requests/:id/approve`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ success: true, message: 'ok', data: { salon_id: 's1' } });
      })
    );

    await store.dispatch(
      salonApi.endpoints.approveVendorRequest.initiate({
        requestId: 'r1', adminNotes: '', customRegistrationFeeAmount: input,
      })
    );

    expect(body.custom_registration_fee_amount).toBe(expected);
  });
});

describe('rejectVendorRequest', () => {
  it('POSTs admin_notes to /admin/vendor-requests/{id}/reject', async () => {
    let path = null, method = null, body = null;
    server.use(
      http.post(`${BASE}/vendor-requests/:id/reject`, async ({ request }) => {
        path = new URL(request.url).pathname;
        method = request.method;
        body = await request.json();
        return HttpResponse.json({
          success: true,
          message: 'Vendor request rejected',
          salon_id: 'r1',
          salon_name: 'Glamour Studio',
        });
      })
    );

    const res = await store.dispatch(
      salonApi.endpoints.rejectVendorRequest.initiate({ requestId: 'r1', adminNotes: 'Incomplete documents' })
    );

    expect(path).toBe('/api/v1/admin/vendor-requests/r1/reject');
    expect(method).toBe('POST');
    expect(body).toEqual({ admin_notes: 'Incomplete documents' });
    expect(res.data.success).toBe(true);
  });
});
