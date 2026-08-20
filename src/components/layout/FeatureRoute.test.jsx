/**
 * Tests for the feature entitlement route guard.
 *
 * Renders the real <FeatureRoute/> against the real featureApi slice with
 * GET /api/v1/features mocked by MSW.
 *
 * These assert the behaviours that matter commercially: a feature the client
 * is not entitled to must look like a URL that does not exist, and the
 * internal-only flags screen must never render for them. The backend enforces
 * the same rules and returns 404, so a failure here is a UX leak rather than
 * an access-control hole — but a leak is exactly what this feature exists to
 * prevent.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse, delay } from 'msw';

import { server } from '../../test/mswServer';
import { featureApi } from '../../services/api/featureApi';
import { FeatureRoute } from './FeatureRoute';

const BASE = 'http://localhost:8000/api/v1';

/**
 * Mock GET /features.
 *
 * `features` mirrors the real contract: the backend omits features the caller
 * is not allowed to know about, so a hidden feature is an ABSENT key, never a
 * key with a falsy value.
 */
function mockFeatures({ features = {}, isInternal = false, delayMs = 0 } = {}) {
  server.use(
    http.get(`${BASE}/features`, async () => {
      if (delayMs) await delay(delayMs);
      return HttpResponse.json({
        success: true,
        features,
        is_internal: isInternal,
      });
    })
  );
}

function renderGuard(props) {
  const store = configureStore({
    reducer: { [featureApi.reducerPath]: featureApi.reducer },
    middleware: (getDefault) => getDefault().concat(featureApi.middleware),
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <FeatureRoute {...props}>
          <div>SECRET FEATURE</div>
        </FeatureRoute>
      </MemoryRouter>
    </Provider>
  );
}

const secret = () => screen.queryByText('SECRET FEATURE');
const notFound = () => screen.queryByText('404');

beforeEach(() => {
  vi.clearAllMocks();
});

// =====================================================================
// Feature gating
// =====================================================================
describe('feature gating', () => {
  it('renders the screen when the client is entitled to the feature', async () => {
    mockFeatures({ features: { blog: 'enabled' } });

    renderGuard({ feature: 'blog' });

    await waitFor(() => expect(secret()).toBeInTheDocument());
    expect(notFound()).not.toBeInTheDocument();
  });

  it('renders 404 - not an upgrade prompt - when the feature is hidden', async () => {
    // The key is absent, which is what a client admin actually receives.
    mockFeatures({ features: { banners: 'enabled' } });

    renderGuard({ feature: 'blog' });

    await waitFor(() => expect(notFound()).toBeInTheDocument());
    expect(secret()).not.toBeInTheDocument();
    // An "unlock this feature" CTA would advertise the feature to the exact
    // person it is being hidden from.
    expect(screen.queryByText(/upgrade|unlock|purchase/i)).not.toBeInTheDocument();
  });

  it('renders the screen for staff while the feature is still internal', async () => {
    mockFeatures({ features: { blog: 'internal' }, isInternal: true });

    renderGuard({ feature: 'blog' });

    await waitFor(() => expect(secret()).toBeInTheDocument());
  });

  it('does not flash 404 before the feature map has loaded', async () => {
    // Rendering 404 during the first fetch would make every hard refresh of a
    // valid screen blink "not found".
    mockFeatures({ features: { blog: 'enabled' }, delayMs: 50 });

    renderGuard({ feature: 'blog' });

    expect(notFound()).not.toBeInTheDocument();
    expect(secret()).not.toBeInTheDocument();

    await waitFor(() => expect(secret()).toBeInTheDocument());
  });

  it('renders 404 when the feature map cannot be loaded', async () => {
    server.use(
      http.get(`${BASE}/features`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 })
      )
    );

    renderGuard({ feature: 'blog' });

    // Fails closed: an unreachable entitlement check must not open the door.
    await waitFor(() => expect(notFound()).toBeInTheDocument());
    expect(secret()).not.toBeInTheDocument();
  });
});

// =====================================================================
// Internal-only screens
// =====================================================================
describe('internalOnly', () => {
  it('renders for internal staff', async () => {
    mockFeatures({ features: { blog: 'internal' }, isInternal: true });

    renderGuard({ internalOnly: true });

    await waitFor(() => expect(secret()).toBeInTheDocument());
  });

  it('renders 404 for a client admin', async () => {
    // Even a fully entitled client admin must not reach the flags screen —
    // it would list every feature built but not yet sold.
    mockFeatures({ features: { blog: 'enabled' }, isInternal: false });

    renderGuard({ internalOnly: true });

    await waitFor(() => expect(notFound()).toBeInTheDocument());
    expect(secret()).not.toBeInTheDocument();
  });

  it('ignores feature entitlements entirely', async () => {
    // internalOnly must not be satisfiable by enabling some feature.
    mockFeatures({ features: { 'feature-flags': 'enabled' }, isInternal: false });

    renderGuard({ internalOnly: true, feature: 'feature-flags' });

    await waitFor(() => expect(notFound()).toBeInTheDocument());
  });
});
