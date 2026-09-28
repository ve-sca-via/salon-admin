import { describe, it, expect } from 'vitest';

import { getApiErrorMessage, extractFieldErrors } from './apiErrorMessage';

/**
 * The bug these cover: an edit form was submitted, the backend answered 422,
 * and the toast said "Validation failed" — or nothing useful at all — because
 * the per-field detail sat in `errors[]` and only `message`/`detail` were read.
 */
describe('getApiErrorMessage — validation failures', () => {
  it('names the field from a ValidationErrorResponse instead of the generic message', () => {
    const message = getApiErrorMessage({
      status: 422,
      data: {
        success: false,
        message: 'Validation failed',
        error_code: 'VALIDATION_ERROR',
        errors: [{ field: 'pincode', message: 'String should match pattern' }],
      },
    });

    expect(message).toContain('pincode');
    expect(message).toContain('String should match pattern');
    expect(message).not.toBe('Validation failed');
  });

  it('strips the body wrapper and array indices from the field path', () => {
    const message = getApiErrorMessage({
      status: 422,
      data: { errors: [{ field: 'body.items.0.price', message: 'must be positive' }] },
    });

    // The remaining path is kept, not just the last segment: "items.price"
    // says which row's price, which is what the admin needs on a nested form.
    expect(message).toBe('items.price: must be positive');
  });

  it("reads FastAPI's own 422 shape, which used to fall through to the fallback", () => {
    const message = getApiErrorMessage({
      status: 422,
      data: { detail: [{ loc: ['body', 'email'], msg: 'value is not a valid email address' }] },
    });

    expect(message).toBe('email: value is not a valid email address');
  });

  it('caps a long field list so the toast stays readable', () => {
    const message = getApiErrorMessage({
      status: 422,
      data: {
        errors: Array.from({ length: 6 }, (_, i) => ({ field: `f${i}`, message: 'bad' })),
      },
    });

    expect(message).toContain('f0');
    expect(message).not.toContain('f5');
    expect(message).toContain('and 3 more fields');
  });

  it('handles a plain-string errors array (ErrorResponse)', () => {
    const message = getApiErrorMessage({
      status: 400,
      data: { message: 'Bad request', errors: ["'full_name' is required and cannot be cleared."] },
    });

    expect(message).toBe("'full_name' is required and cannot be cleared.");
  });
});

describe('getApiErrorMessage — existing behaviour preserved', () => {
  it('passes through a plain HTTPException detail', () => {
    expect(
      getApiErrorMessage({ status: 401, data: { detail: 'Invalid credentials' } }),
    ).toBe('Invalid credentials');
  });

  it('prefers message over detail when both are plain strings', () => {
    expect(
      getApiErrorMessage({ status: 400, data: { message: 'Salon not found', detail: 'nope' } }),
    ).toBe('Salon not found');
  });

  it('replaces a technical SlowAPI detail with a human one', () => {
    expect(getApiErrorMessage({ status: 429, data: { detail: '5 per 1 minute' } })).toBe(
      'Too many requests. Please wait a moment and try again.',
    );
  });

  it('keeps a deliberate rate-limit message when the backend writes one', () => {
    expect(
      getApiErrorMessage({
        status: 429,
        data: { error: 'rate_limit_exceeded', message: 'Try again in 30 seconds.' },
      }),
    ).toBe('Try again in 30 seconds.');
  });

  it('handles a bare string body', () => {
    expect(getApiErrorMessage({ status: 500, data: 'Server exploded' })).toBe('Server exploded');
  });

  it('falls back when there is nothing usable', () => {
    expect(getApiErrorMessage({ status: 500, data: {} }, 'Failed to update product')).toBe(
      'Failed to update product',
    );
  });

  it('returns the fallback for a null error', () => {
    expect(getApiErrorMessage(null, 'fallback')).toBe('fallback');
  });

  it('reads the axios-shaped error too', () => {
    expect(
      getApiErrorMessage({ response: { status: 404, data: { message: 'Not found' } } }),
    ).toBe('Not found');
  });
});

describe('extractFieldErrors', () => {
  it('deduplicates identical field/message pairs across both shapes', () => {
    const errors = extractFieldErrors({
      errors: [{ field: 'body.price', message: 'must be positive' }],
      detail: [{ loc: ['body', 'price'], msg: 'must be positive' }],
    });

    expect(errors).toEqual([{ field: 'price', message: 'must be positive' }]);
  });

  it('returns nothing for a payload with no field detail', () => {
    expect(extractFieldErrors({ detail: 'Invalid credentials' })).toEqual([]);
    expect(extractFieldErrors('a string')).toEqual([]);
  });
});
