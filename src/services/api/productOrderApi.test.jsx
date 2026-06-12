/**
 * Integration tests for the admin product-order API client (productOrderApi.js).
 *
 * MSW-mocked backend; verifies the HTTP contract (URL, method, body) for the
 * admin order-management flow. Admin half of the product_order_service audit
 * — paired with backend/tests/test_product_order_mocked.py.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';

import { server } from '../../test/mswServer';
import { productOrderApi } from './productOrderApi';
import * as orderApiModule from './productOrderApi';

const BASE = 'http://localhost:8000/api/v1/admin/product-orders';

function makeStore() {
  return configureStore({
    reducer: { [productOrderApi.reducerPath]: productOrderApi.reducer },
    middleware: (getDefault) => getDefault().concat(productOrderApi.middleware),
  });
}

let store;
beforeEach(() => {
  store = makeStore();
});

// =====================================================================
// GET /admin/product-orders/
// =====================================================================
describe('getAllProductOrders', () => {
  it('hits GET /admin/product-orders/ and returns the list', async () => {
    let seenPath = null;
    server.use(
      http.get(`${BASE}/`, ({ request }) => {
        seenPath = new URL(request.url).pathname;
        return HttpResponse.json([
          { id: 'o1', order_number: 'ORD-1', status: 'paid', profiles: { full_name: 'Alice' }, items: [] },
        ]);
      })
    );

    const res = await store.dispatch(productOrderApi.endpoints.getAllProductOrders.initiate());
    expect(seenPath).toBe('/api/v1/admin/product-orders/');
    expect(res.data).toHaveLength(1);
    expect(res.data[0].profiles.full_name).toBe('Alice');
  });
});

// =====================================================================
// PATCH /admin/product-orders/{orderId}/status
// =====================================================================
describe('updateProductOrderStatus', () => {
  it('PATCHes {status} to /admin/product-orders/{orderId}/status', async () => {
    let seenPath = null;
    let body = null;
    server.use(
      http.patch(`${BASE}/:orderId/status`, async ({ request }) => {
        seenPath = new URL(request.url).pathname;
        body = await request.json();
        return HttpResponse.json({ success: true, order: { id: 'o1', status: 'shipped' } });
      })
    );

    const res = await store.dispatch(
      productOrderApi.endpoints.updateProductOrderStatus.initiate({ orderId: 'o1', status: 'shipped' })
    );
    expect(seenPath).toBe('/api/v1/admin/product-orders/o1/status');
    expect(body).toEqual({ status: 'shipped' });
    expect(res.data.order.status).toBe('shipped');
  });
});

// =====================================================================
// Wiring
// =====================================================================
describe('exports', () => {
  it('exposes both admin product-order hooks', () => {
    expect(orderApiModule.useGetAllProductOrdersQuery).toBeTypeOf('function');
    expect(orderApiModule.useUpdateProductOrderStatusMutation).toBeTypeOf('function');
  });
});
