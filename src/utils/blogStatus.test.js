/**
 * Unit tests for describeStatus.
 *
 * This helper encodes the one piece of blog state that is derived rather than
 * stored: there is no `scheduled` status in the database, so "Scheduled" has to
 * be inferred from a published post whose published_at is still in the future.
 * Getting it wrong would show a post as live when the public API is hiding it.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { describeStatus } from './blogStatus';

const HOUR = 60 * 60 * 1000;

afterEach(() => {
  vi.useRealTimers();
});

describe('describeStatus', () => {
  it('labels a draft', () => {
    expect(describeStatus({ status: 'draft' })).toEqual({ label: 'Draft', variant: 'default' });
  });

  it('labels an archived post', () => {
    expect(describeStatus({ status: 'archived', published_at: '2020-01-01T00:00:00Z' })).toEqual({
      label: 'Archived',
      variant: 'danger',
    });
  });

  it('labels a published post with a past date as Live', () => {
    const past = new Date(Date.now() - HOUR).toISOString();
    expect(describeStatus({ status: 'published', published_at: past })).toEqual({
      label: 'Live',
      variant: 'success',
    });
  });

  it('labels a published post with a future date as Scheduled', () => {
    const future = new Date(Date.now() + HOUR).toISOString();
    expect(describeStatus({ status: 'published', published_at: future })).toEqual({
      label: 'Scheduled',
      variant: 'warning',
    });
  });

  it('flips Scheduled to Live once the publish time passes', () => {
    const publishAt = '2026-08-20T12:00:00.000Z';

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-20T11:59:00.000Z'));
    expect(describeStatus({ status: 'published', published_at: publishAt }).label).toBe('Scheduled');

    vi.setSystemTime(new Date('2026-08-20T12:01:00.000Z'));
    expect(describeStatus({ status: 'published', published_at: publishAt }).label).toBe('Live');
  });

  it('treats a published post with no date as Live', () => {
    expect(describeStatus({ status: 'published', published_at: null }).label).toBe('Live');
  });

  it('defaults to Draft for a missing post', () => {
    expect(describeStatus(undefined).label).toBe('Draft');
  });
});
