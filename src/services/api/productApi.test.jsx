/**
 * Integration tests for the admin product API client (productApi.js).
 *
 * These exercise the RTK Query endpoints against a mocked backend (MSW), so they
 * verify the exact HTTP contract the admin panel relies on: URL, method, query
 * params, and request body. They are the admin half of the product_service audit
 * — paired with backend/tests/test_product_mocked.py.
 *
 * Pattern: a throwaway store per test (fresh RTK Query cache) + per-test MSW
 * handlers registered via server.use(...) (reset in src/test/setup.js).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';

import { server } from '../../test/mswServer';
import { productApi } from './productApi';
import * as productApiModule from './productApi';

const BASE = 'http://localhost:8000/api/v1';

function makeStore() {
  return configureStore({
    reducer: { [productApi.reducerPath]: productApi.reducer },
    middleware: (getDefault) => getDefault().concat(productApi.middleware),
  });
}

let store;
beforeEach(() => {
  store = makeStore();
});

// =====================================================================
// GET /products/admin/all  (list incl. inactive)
// =====================================================================
describe('getAllProducts', () => {
  it('hits GET /products/admin/all and forwards filter params', async () => {
    let seenUrl = null;
    server.use(
      http.get(`${BASE}/products/admin/all`, ({ request }) => {
        seenUrl = new URL(request.url);
        return HttpResponse.json({
          success: true,
          products: [{ id: 'p1', name: 'Serum', is_active: false }],
          count: 1,
          total: 1,
        });
      })
    );

    const res = await store.dispatch(
      productApi.endpoints.getAllProducts.initiate({ category: 'haircare', limit: 25, offset: 0 })
    );
    expect(seenUrl.pathname).toBe('/api/v1/products/admin/all');
    expect(seenUrl.searchParams.get('category')).toBe('haircare');
    expect(seenUrl.searchParams.get('limit')).toBe('25');
    expect(res.data.products).toHaveLength(1);
  });
});

// =====================================================================
// GET /products/categories
// =====================================================================
describe('getProductCategories', () => {
  it('hits GET /products/categories', async () => {
    server.use(
      http.get(`${BASE}/products/categories`, () =>
        HttpResponse.json({ success: true, categories: ['haircare'] })
      )
    );

    const res = await store.dispatch(
      productApi.endpoints.getProductCategories.initiate()
    );
    expect(res.data.categories).toEqual(['haircare']);
  });
});

// =====================================================================
// POST /products  (create)
// =====================================================================
describe('createProduct', () => {
  it('POSTs the product body to /products', async () => {
    let body = null;
    server.use(
      http.post(`${BASE}/products`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          success: true,
          message: 'created',
          product: { id: 'new-1', ...body },
        });
      })
    );

    const res = await store.dispatch(
      productApi.endpoints.createProduct.initiate({ name: 'Hair Serum', price: 499 })
    );
    expect(body).toEqual({ name: 'Hair Serum', price: 499 });
    expect(res.data.product.id).toBe('new-1');
  });
});

// =====================================================================
// PUT /products/{id}  (update)
// =====================================================================
describe('updateProduct', () => {
  it('PUTs to /products/{id} with the changed fields', async () => {
    let seenPath = null;
    let body = null;
    server.use(
      http.put(`${BASE}/products/:id`, async ({ request, params }) => {
        seenPath = new URL(request.url).pathname;
        body = await request.json();
        return HttpResponse.json({
          success: true,
          message: 'updated',
          product: { id: params.id, ...body },
        });
      })
    );

    const res = await store.dispatch(
      productApi.endpoints.updateProduct.initiate({
        productId: 'abc-123',
        data: { name: 'Renamed' },
      })
    );
    expect(seenPath).toBe('/api/v1/products/abc-123');
    expect(body).toEqual({ name: 'Renamed' });
    expect(res.data.product.name).toBe('Renamed');
  });
});

// =====================================================================
// DELETE /products/{id}  (soft by default, hard via flag)
// =====================================================================
describe('deleteProduct', () => {
  it('DELETEs /products/{id} with hard=false by default', async () => {
    let params = null;
    server.use(
      http.delete(`${BASE}/products/:id`, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json({ success: true, message: 'Product deactivated', product_id: 'abc-123' });
      })
    );

    const res = await store.dispatch(
      productApi.endpoints.deleteProduct.initiate({ productId: 'abc-123' })
    );
    expect(params.get('hard')).toBe('false');
    expect(res.data.message).toBe('Product deactivated');
  });

  it('passes hard=true when requested', async () => {
    let params = null;
    server.use(
      http.delete(`${BASE}/products/:id`, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json({ success: true, message: 'Product permanently deleted', product_id: 'abc-123' });
      })
    );

    await store.dispatch(
      productApi.endpoints.deleteProduct.initiate({ productId: 'abc-123', hard: true })
    );
    expect(params.get('hard')).toBe('true');
  });
});

// =====================================================================
// POST /upload/cloudinary-product-image  (image upload)
//
// This endpoint belongs to the *upload* module, not product_service — the
// product form just borrows it. The real multipart round-trip is exercised by
// the upload module's own tests; here we only assert the client is wired to it
// (a jsdom FormData pushed through axios+MSW in node doesn't resolve cleanly).
// =====================================================================
describe('uploadProductImage', () => {
  it('exposes the mutation hook and registered endpoint', () => {
    expect(productApiModule.useUploadProductImageMutation).toBeTypeOf('function');
    expect(productApi.endpoints.uploadProductImage).toBeDefined();
  });
});

// =====================================================================
// Regression: getProductById was dead code, removed in P1 cleanup
// =====================================================================
describe('product_service P1 cleanup', () => {
  it('no longer exports a getProductById hook', () => {
    expect(productApiModule.useGetProductByIdQuery).toBeUndefined();
    expect(productApi.endpoints.getProductById).toBeUndefined();
  });
});
