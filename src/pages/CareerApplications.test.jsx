/**
 * Integration tests for the admin Career Applications page.
 *
 * Renders the real <CareerApplications/> page wired to the real careerApi RTK
 * Query slice (axios base query), with the backend mocked at the network layer
 * by MSW. Exercises the three flows the admin actually uses against the
 * career_service endpoints:
 *   - GET   /api/v1/careers/applications              (list + render)
 *   - PATCH /api/v1/careers/applications/{id}         (status update + refetch)
 *   - GET   /api/v1/careers/applications/{id}/download/{type}  (document download)
 *
 * Also asserts the cleanup contract: the panel never calls the removed
 * by-number endpoint and resolves aadhaar via the aadhaar_url column.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';

import { server } from '../test/mswServer';
import { careerApi } from '../services/api/careerApi';
import CareerApplications from './CareerApplications';

const BASE = 'http://localhost:8000';
const LIST = `${BASE}/api/v1/careers/applications`;

// --- in-memory backend state, seeded fresh per test ---
let apps;
const seededApp = () => ({
  id: 'app-1',
  application_number: 'CA-20260112-APP00001',
  full_name: 'Priya Sharma',
  email: 'priya@example.com',
  phone: '9876543210',
  age: 28,
  highest_qualification: "Bachelor's Degree",
  permanent_address: '1 Test Street',
  current_address: '2 Test Avenue',
  cover_letter: 'Excited to apply.',
  status: 'pending',
  resume_url: 'https://res.cloudinary.com/demo/image/private/applications/app-1/resume.pdf',
  aadhaar_url: 'https://res.cloudinary.com/demo/image/private/applications/app-1/aadhaar.jpg',
  created_at: '2026-06-01T10:00:00Z',
});

// Records the exact requests MSW saw, so we can assert the contract.
let requestLog;

function registerHandlers() {
  server.use(
    http.get(LIST, () =>
      HttpResponse.json({
        applications: apps,
        count: apps.length,
        total: apps.length,
      }),
    ),
    http.patch(`${LIST}/:id`, async ({ params, request }) => {
      const body = await request.json();
      requestLog.push({ method: 'PATCH', url: `${LIST}/${params.id}`, body });
      const idx = apps.findIndex((a) => a.id === params.id);
      if (idx === -1) return new HttpResponse(null, { status: 404 });
      apps[idx] = { ...apps[idx], ...body };
      return HttpResponse.json({ message: 'Application updated successfully', application: apps[idx] });
    }),
    http.get(`${LIST}/:id/download/:type`, ({ params }) => {
      requestLog.push({ method: 'GET', url: `${LIST}/${params.id}/download/${params.type}` });
      return HttpResponse.json({
        download_url: `https://res.cloudinary.com/demo/signed/${params.type}.pdf?sig=xyz`,
      });
    }),
  );
}

function renderPage() {
  const store = configureStore({
    reducer: { [careerApi.reducerPath]: careerApi.reducer },
    middleware: (gdm) => gdm().concat(careerApi.middleware),
  });
  return render(
    <Provider store={store}>
      <CareerApplications />
    </Provider>,
  );
}

beforeEach(() => {
  apps = [seededApp()];
  requestLog = [];
  registerHandlers();
});

describe('CareerApplications (admin)', () => {
  it('lists applications from GET /careers/applications', async () => {
    renderPage();
    const name = await screen.findByText('Priya Sharma');
    expect(screen.getByText('priya@example.com')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    // status badge — scoped to the row (the label also appears in the filter
    // dropdown and the stats cards).
    const row = name.closest('tr');
    expect(within(row).getByText('Pending')).toBeInTheDocument();
  });

  it('updates status via PATCH and reflects it after refetch', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Priya Sharma');

    await user.click(screen.getByRole('button', { name: 'Update' }));

    const dialog = await screen.findByText('Update Application Status');
    const modal = dialog.closest('div[role="dialog"]') || document.body;
    // The modal status <select> (distinct from the page's filter select).
    const selects = within(modal).getAllByRole('combobox');
    await user.selectOptions(selects[selects.length - 1], 'shortlisted');

    await user.click(screen.getByRole('button', { name: 'Update Status' }));

    // PATCH hit with the new status...
    await waitFor(() => {
      const patch = requestLog.find((r) => r.method === 'PATCH');
      expect(patch).toBeTruthy();
      expect(patch.url).toBe(`${LIST}/app-1`);
      expect(patch.body.status).toBe('shortlisted');
    });

    // ...and after the component refetches, the row's badge shows the new
    // status (scoped to the row; the label also lives in the filter + stats).
    await waitFor(() => {
      const row = screen.getByText('Priya Sharma').closest('tr');
      expect(within(row).getByText('Shortlisted')).toBeInTheDocument();
    });
  });

  it('downloads a document via the download endpoint and opens the signed URL', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderPage();
    await screen.findByText('Priya Sharma');

    await user.click(screen.getByRole('button', { name: 'View' }));
    await screen.findByText('Application Details');

    // Resume has a URL on the seeded row -> the button is enabled.
    await user.click(screen.getByTitle('Download Resume'));

    await waitFor(() => {
      const dl = requestLog.find((r) => r.url.includes('/download/'));
      expect(dl).toBeTruthy();
      expect(dl.url).toBe(`${LIST}/app-1/download/resume`);
    });
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining('res.cloudinary.com/demo/signed/resume.pdf'),
        '_blank',
      ),
    );
    openSpy.mockRestore();
  });

  it('resolves the aadhaar document through the aadhaar_url column', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'open').mockImplementation(() => null);
    renderPage();
    await screen.findByText('Priya Sharma');

    await user.click(screen.getByRole('button', { name: 'View' }));
    await screen.findByText('Application Details');

    // The Aadhaar button is only enabled because the row has aadhaar_url set,
    // proving the panel maps aadhaar_card -> aadhaar_url (not aadhaar_card_url).
    const aadhaarBtn = screen.getByTitle('Download Aadhaar');
    expect(aadhaarBtn).toBeEnabled();
    await user.click(aadhaarBtn);

    await waitFor(() => {
      const dl = requestLog.find((r) => r.url.includes('/download/aadhaar_card'));
      expect(dl).toBeTruthy();
    });
  });

  it('never calls the removed by-number endpoint', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'open').mockImplementation(() => null);
    renderPage();
    await screen.findByText('Priya Sharma');

    await user.click(screen.getByRole('button', { name: 'View' }));
    await screen.findByText('Application Details');
    await user.click(screen.getByTitle('Download Resume'));
    await waitFor(() => expect(requestLog.length).toBeGreaterThan(0));

    expect(requestLog.every((r) => !r.url.includes('/by-number/'))).toBe(true);
  });

  it('shows an empty state when there are no applications', async () => {
    apps = [];
    renderPage();
    expect(await screen.findByText('No applications found')).toBeInTheDocument();
  });
});
