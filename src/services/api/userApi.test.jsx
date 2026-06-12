/**
 * Integration tests for the admin user-management API client (userApi.js).
 *
 * MSW-mocked backend; verifies the HTTP contract (URL, method, params, body) for
 * the admin user CRUD flow. Admin-only module — paired with
 * backend/tests/test_user_mocked.py. (The getAllRMs/updateRMProfile endpoints in
 * this client belong to the rm_service module and are out of scope here.)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';

import { server } from '../../test/mswServer';
import { userApi } from './userApi';
import * as userApiModule from './userApi';

const BASE = 'http://localhost:8000/api/v1/admin/users';

function makeStore() {
  return configureStore({
    reducer: { [userApi.reducerPath]: userApi.reducer },
    middleware: (getDefault) => getDefault().concat(userApi.middleware),
  });
}

function serveUsers(data = []) {
  server.use(
    http.get(`${BASE}/`, () =>
      HttpResponse.json({ success: true, data, total: data.length, page: 1, limit: 20 })
    )
  );
}

let store;
beforeEach(() => {
  store = makeStore();
});

// =====================================================================
// GET /admin/users/
// =====================================================================
describe('getAllUsers', () => {
  it('hits GET /admin/users/ and forwards filters', async () => {
    let url = null;
    server.use(
      http.get(`${BASE}/`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json({ success: true, data: [{ id: 'u1' }], total: 1, page: 1, limit: 20 });
      })
    );

    const res = await store.dispatch(
      userApi.endpoints.getAllUsers.initiate({ role: 'customer', search: 'ab', is_active: true })
    );
    expect(url.pathname).toBe('/api/v1/admin/users/');
    expect(url.searchParams.get('role')).toBe('customer');
    expect(url.searchParams.get('search')).toBe('ab');
    expect(url.searchParams.get('is_active')).toBe('true');
    expect(res.data.total).toBe(1);
  });
});

// =====================================================================
// POST /admin/users/
// =====================================================================
describe('createUser', () => {
  it('POSTs the user body to /admin/users/', async () => {
    let body = null;
    server.use(
      http.post(`${BASE}/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ success: true, data: { user_id: 'new-1', role: 'customer' } });
      })
    );

    const payload = { email: 'a@b.com', full_name: 'A', password: 'StrongPass123', role: 'customer', age: 30, gender: 'male' };
    const res = await store.dispatch(userApi.endpoints.createUser.initiate(payload));
    expect(body).toEqual(payload);
    expect(res.data.data.user_id).toBe('new-1');
  });

  it('surfaces a 400 (duplicate email) as an error result', async () => {
    server.use(
      http.post(`${BASE}/`, () =>
        HttpResponse.json({ message: 'User with email a@b.com already exists' }, { status: 400 })
      )
    );

    const res = await store.dispatch(
      userApi.endpoints.createUser.initiate({ email: 'a@b.com', role: 'customer' })
    );
    expect(res.data).toBeUndefined();
    expect(res.error.status).toBe(400);
  });
});

// =====================================================================
// PUT /admin/users/{id}
// =====================================================================
describe('updateUser', () => {
  it('PUTs {full_name} to /admin/users/{id}', async () => {
    serveUsers([{ id: 'u1', full_name: 'Old' }]);
    await store.dispatch(userApi.endpoints.getAllUsers.initiate({})); // prime cache for optimistic patch

    let seenPath = null;
    let body = null;
    server.use(
      http.put(`${BASE}/:id`, async ({ request, params }) => {
        seenPath = new URL(request.url).pathname;
        body = await request.json();
        return HttpResponse.json({ success: true, message: 'User updated successfully', data: { id: params.id } });
      })
    );

    const res = await store.dispatch(
      userApi.endpoints.updateUser.initiate({ userId: 'u1', data: { full_name: 'New' } })
    );
    expect(seenPath).toBe('/api/v1/admin/users/u1');
    expect(body).toEqual({ full_name: 'New' });
    expect(res.data.success).toBe(true);
  });
});

// =====================================================================
// DELETE /admin/users/{id}
// =====================================================================
describe('deleteUser', () => {
  it('DELETEs /admin/users/{id}', async () => {
    let seenPath = null;
    server.use(
      http.delete(`${BASE}/:id`, ({ request }) => {
        seenPath = new URL(request.url).pathname;
        return HttpResponse.json({ success: true, message: 'User deleted successfully' });
      })
    );

    const res = await store.dispatch(userApi.endpoints.deleteUser.initiate('u1'));
    expect(seenPath).toBe('/api/v1/admin/users/u1');
    expect(res.data.success).toBe(true);
  });
});

// =====================================================================
// Regression: getUserById was dead + phantom, removed in cleanup
// =====================================================================
describe('user_service cleanup', () => {
  it('no longer exposes a getUserById hook/endpoint', () => {
    expect(userApiModule.useGetUserByIdQuery).toBeUndefined();
    expect(userApi.endpoints.getUserById).toBeUndefined();
  });
});
