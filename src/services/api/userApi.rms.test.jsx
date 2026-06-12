/**
 * Integration tests for the admin RM-management endpoints in userApi.js
 * (getAllRMs / updateRMProfile). These belong to the rm_service module — paired
 * with backend/tests/test_rm_mocked.py. (User-CRUD endpoints are covered in
 * userApi.test.jsx.)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';

import { server } from '../../test/mswServer';
import { userApi } from './userApi';
import * as userApiModule from './userApi';

const BASE = 'http://localhost:8000/api/v1/admin';

function makeStore() {
  return configureStore({
    reducer: { [userApi.reducerPath]: userApi.reducer },
    middleware: (getDefault) => getDefault().concat(userApi.middleware),
  });
}

let store;
beforeEach(() => {
  store = makeStore();
});

// =====================================================================
// GET /admin/rms
// =====================================================================
describe('getAllRMs', () => {
  it('GETs /admin/rms with limit/offset', async () => {
    let url = null;
    server.use(
      http.get(`${BASE}/rms`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json([{ id: 'rm1', performance_score: 100 }]);
      })
    );

    const res = await store.dispatch(userApi.endpoints.getAllRMs.initiate({ limit: 50, offset: 0 }));
    expect(url.pathname).toBe('/api/v1/admin/rms');
    expect(url.searchParams.get('limit')).toBe('50');
    expect(res.data).toHaveLength(1);
  });
});

// =====================================================================
// PUT /admin/rms/{id}
// =====================================================================
describe('updateRMProfile', () => {
  it('PUTs /admin/rms/{id} with the body', async () => {
    let seenPath = null, body = null;
    server.use(
      http.put(`${BASE}/rms/:id`, async ({ request }) => {
        seenPath = new URL(request.url).pathname;
        body = await request.json();
        return HttpResponse.json({ id: 'rm1', performance_score: 100 });
      })
    );

    const res = await store.dispatch(
      userApi.endpoints.updateRMProfile.initiate({ rmId: 'rm1', data: { full_name: 'New', manager_notes: 'note' } })
    );
    expect(seenPath).toBe('/api/v1/admin/rms/rm1');
    expect(body).toEqual({ full_name: 'New', manager_notes: 'note' });
    expect(res.data.id).toBe('rm1');
  });
});

describe('exports', () => {
  it('exposes the admin RM hooks', () => {
    expect(userApiModule.useGetAllRMsQuery).toBeTypeOf('function');
    expect(userApiModule.useUpdateRMProfileMutation).toBeTypeOf('function');
  });
});
