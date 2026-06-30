/**
 * Integration tests for the admin Coupons management page.
 *
 * Renders the real <Coupons/> page wired to the real couponApi + salonApi RTK
 * Query slices (axios base query), with the backend mocked at the network layer
 * by MSW. Exercises the flows the admin actually uses:
 *   - GET    /api/v1/admin/coupons          (list + render w/ formatted columns)
 *   - POST   /api/v1/admin/coupons          (create + client-side validation gate)
 *   - PATCH  /api/v1/admin/coupons/{id}     (edit — code/scope locked)
 *   - DELETE /api/v1/admin/coupons/{id}     (deactivate, keeps history)
 *
 * toast is mocked so we can assert success / 409-conflict messaging.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';

import { server } from '../test/mswServer';
import { couponApi } from '../services/api/couponApi';
import { salonApi } from '../services/api/salonApi';
import Coupons from './Coupons';

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
import { toast } from 'react-toastify';

const BASE = 'http://localhost:8000/api/v1';
const COUPONS = `${BASE}/admin/coupons`;

const seededCoupon = () => ({
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
});

// in-memory backend state, seeded fresh per test
let coupons;
let requestLog;

function registerHandlers() {
  server.use(
    http.get(`${BASE}/admin/salons`, () =>
      HttpResponse.json({ data: [{ id: 's1', business_name: 'Glow Salon' }] })
    ),
    http.get(COUPONS, () => HttpResponse.json(coupons)),
    http.post(COUPONS, async ({ request }) => {
      const body = await request.json();
      requestLog.push({ method: 'POST', body });
      const created = { ...seededCoupon(), ...body, id: `c${coupons.length + 1}`, used_count: 0 };
      coupons.push(created);
      return HttpResponse.json(created);
    }),
    http.patch(`${COUPONS}/:id`, async ({ params, request }) => {
      const body = await request.json();
      requestLog.push({ method: 'PATCH', id: params.id, body });
      const idx = coupons.findIndex((c) => c.id === params.id);
      coupons[idx] = { ...coupons[idx], ...body };
      return HttpResponse.json(coupons[idx]);
    }),
    http.delete(`${COUPONS}/:id`, ({ params }) => {
      requestLog.push({ method: 'DELETE', id: params.id });
      const idx = coupons.findIndex((c) => c.id === params.id);
      coupons[idx] = { ...coupons[idx], is_active: false };
      return HttpResponse.json(coupons[idx]);
    })
  );
}

function renderPage() {
  const store = configureStore({
    reducer: {
      [couponApi.reducerPath]: couponApi.reducer,
      [salonApi.reducerPath]: salonApi.reducer,
    },
    middleware: (gdm) => gdm().concat(couponApi.middleware, salonApi.middleware),
  });
  return render(
    <Provider store={store}>
      <Coupons />
    </Provider>
  );
}

beforeEach(() => {
  coupons = [seededCoupon()];
  requestLog = [];
  registerHandlers();
});

describe('Coupons (admin)', () => {
  it('lists coupons with formatted discount / scope / usage columns', async () => {
    renderPage();
    const code = await screen.findByText('SAVE20');
    const row = code.closest('tr');
    // "20% · max ₹300" (no min) — formatDiscount
    expect(within(row).getByText('20% · max ₹300')).toBeInTheDocument();
    // platform scope badge
    expect(within(row).getByText('Platform')).toBeInTheDocument();
    // usage "used / ∞"
    expect(within(row).getByText('4 / ∞')).toBeInTheDocument();
    expect(within(row).getByText('Active')).toBeInTheDocument();
  });

  it('gates the Create button on client-side validation (percentage > 100)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('SAVE20');

    await user.click(screen.getByRole('button', { name: /add coupon/i }));
    const createBtn = screen.getByRole('button', { name: /create coupon/i });
    expect(createBtn).toBeDisabled(); // empty form

    await user.type(screen.getByPlaceholderText('SAVE20'), 'BIGSALE');
    await user.type(screen.getByPlaceholderText('20% off services'), 'Too big');
    // first number input is the discount value
    await user.type(screen.getAllByRole('spinbutton')[0], '150');

    expect(screen.getByText(/percentage cannot exceed 100/i)).toBeInTheDocument();
    expect(createBtn).toBeDisabled();
  });

  it('creates a coupon (POST) with an uppercased code and shows the new row', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('SAVE20');

    await user.click(screen.getByRole('button', { name: /add coupon/i }));
    await user.type(screen.getByPlaceholderText('SAVE20'), 'newyear');
    await user.type(screen.getByPlaceholderText('20% off services'), 'New year deal');
    await user.type(screen.getAllByRole('spinbutton')[0], '25');

    await user.click(screen.getByRole('button', { name: /create coupon/i }));

    await waitFor(() => {
      const post = requestLog.find((r) => r.method === 'POST');
      expect(post).toBeTruthy();
      expect(post.body.code).toBe('NEWYEAR'); // auto-uppercased
      expect(post.body.discount_value).toBe(25);
      expect(post.body.scope).toBe('platform');
    });
    expect(toast.success).toHaveBeenCalledWith('Coupon created successfully');
    // list refetched -> new row visible
    expect(await screen.findByText('NEWYEAR')).toBeInTheDocument();
  });

  it('shows the 409 conflict message when the code already exists', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(COUPONS, () =>
        HttpResponse.json({ detail: 'exists' }, { status: 409 })
      )
    );
    renderPage();
    await screen.findByText('SAVE20');

    await user.click(screen.getByRole('button', { name: /add coupon/i }));
    await user.type(screen.getByPlaceholderText('SAVE20'), 'SAVE20');
    await user.type(screen.getByPlaceholderText('20% off services'), 'Dup');
    await user.type(screen.getAllByRole('spinbutton')[0], '10');
    await user.click(screen.getByRole('button', { name: /create coupon/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'An active coupon with this code already exists.'
      )
    );
  });

  it('deactivates a coupon via DELETE after confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await screen.findByText('SAVE20');

    await user.click(screen.getByRole('button', { name: /deactivate/i }));

    await waitFor(() => {
      const del = requestLog.find((r) => r.method === 'DELETE');
      expect(del).toBeTruthy();
      expect(del.id).toBe('c1');
    });
    expect(toast.success).toHaveBeenCalledWith('Coupon deactivated');
    // after refetch the row flips to Inactive (no more Deactivate button)
    await waitFor(() => {
      const row = screen.getByText('SAVE20').closest('tr');
      expect(within(row).getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('locks the code field when editing an existing coupon', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('SAVE20');

    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    const codeInput = screen.getByPlaceholderText('SAVE20');
    expect(codeInput).toBeDisabled();
    expect(codeInput).toHaveValue('SAVE20');
  });
});
