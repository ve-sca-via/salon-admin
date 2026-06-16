/**
 * Integration tests for the admin salon API client (salonApi.js) consumed by the
 * admin panel's Salons page. Confirms each mutation/query targets the real
 * backend route in the salon_service module. Paired with
 * backend/tests/test_salon_mocked.py.
 *
 *   getAllSalons        -> GET    /admin/salons
 *   updateSalon         -> PUT    /admin/salons/{id}
 *   deleteSalon         -> DELETE /admin/salons/{id}
 *   toggleSalonStatus   -> PUT    /admin/salons/{id}/status
 *   sendPaymentReminder -> POST   /admin/salons/{id}/send-payment-reminder
 *
 * (getPendingSalons -> /admin/vendor-requests is a different module, covered in
 *  adminApi.test.jsx.)
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

describe('getAllSalons', () => {
  it('GETs /admin/salons with status/limit/offset', async () => {
    let url = null;
    server.use(http.get(`${BASE}/salons`, ({ request }) => {
      url = new URL(request.url);
      return HttpResponse.json({ success: true, data: [{ id: 's1' }], count: 1 });
    }));
    const res = await store.dispatch(salonApi.endpoints.getAllSalons.initiate({ limit: 50, offset: 0 }));
    expect(url.pathname).toBe('/api/v1/admin/salons');
    expect(url.searchParams.get('limit')).toBe('50');
    expect(res.data.count).toBe(1);
  });
});

describe('updateSalon', () => {
  it('PUTs the update body to /admin/salons/{id}', async () => {
    let p = null, body = null;
    server.use(http.put(`${BASE}/salons/:id`, async ({ request }) => {
      p = new URL(request.url).pathname; body = await request.json();
      return HttpResponse.json({ success: true, message: 'Salon updated successfully', data: { id: 's1' } });
    }));
    const res = await store.dispatch(salonApi.endpoints.updateSalon.initiate(
      { salonId: 's1', data: { business_name: 'New Name' } }));
    expect(p).toBe('/api/v1/admin/salons/s1');
    expect(body).toEqual({ business_name: 'New Name' });
    expect(res.data.success).toBe(true);
  });
});

describe('deleteSalon', () => {
  it('DELETEs /admin/salons/{id}', async () => {
    let p = null, method = null;
    server.use(http.delete(`${BASE}/salons/:id`, ({ request }) => {
      p = new URL(request.url).pathname; method = request.method;
      return HttpResponse.json({ success: true, message: 'Salon deleted successfully', data: {} });
    }));
    await store.dispatch(salonApi.endpoints.deleteSalon.initiate('s1'));
    expect(p).toBe('/api/v1/admin/salons/s1');
    expect(method).toBe('DELETE');
  });
});

describe('toggleSalonStatus', () => {
  it('PUTs {is_active} to /admin/salons/{id}/status', async () => {
    let p = null, body = null;
    server.use(http.put(`${BASE}/salons/:id/status`, async ({ request }) => {
      p = new URL(request.url).pathname; body = await request.json();
      return HttpResponse.json({ success: true, message: 'Salon deactivated successfully', data: { id: 's1', is_active: false } });
    }));
    const res = await store.dispatch(salonApi.endpoints.toggleSalonStatus.initiate(
      { salonId: 's1', isActive: false }));
    expect(p).toBe('/api/v1/admin/salons/s1/status');
    expect(body).toEqual({ is_active: false });
    expect(res.data.data.is_active).toBe(false);
  });
});

describe('sendPaymentReminder', () => {
  it('POSTs /admin/salons/{id}/send-payment-reminder', async () => {
    let p = null, method = null;
    server.use(http.post(`${BASE}/salons/:id/send-payment-reminder`, ({ request }) => {
      p = new URL(request.url).pathname; method = request.method;
      return HttpResponse.json({ success: true, message: 'Payment reminder email sent', data: {} });
    }));
    const res = await store.dispatch(salonApi.endpoints.sendPaymentReminder.initiate('s1'));
    expect(p).toBe('/api/v1/admin/salons/s1/send-payment-reminder');
    expect(method).toBe('POST');
    expect(res.data.success).toBe(true);
  });
});
