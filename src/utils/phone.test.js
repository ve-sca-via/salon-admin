import { describe, expect, it } from 'vitest';
import { isValidMobile, mobileError, toLocalMobile } from './phone';

describe('toLocalMobile', () => {
  it('keeps a plain 10-digit number', () => {
    expect(toLocalMobile('9876543210')).toBe('9876543210');
  });

  it('strips whatever formatting was pasted', () => {
    expect(toLocalMobile('+91 98765 43210')).toBe('9876543210');
    expect(toLocalMobile('91-9876543210')).toBe('9876543210');
    expect(toLocalMobile('(98765) 43210')).toBe('9876543210');
  });

  it('truncates past ten digits, so the field cannot grow past the rule', () => {
    expect(toLocalMobile('98765432109999')).toBe('9876543210');
  });

  it('does not eat the country code out of a local number that starts with 91', () => {
    expect(toLocalMobile('9123456789')).toBe('9123456789');
  });

  it('handles blank input', () => {
    expect(toLocalMobile('')).toBe('');
    expect(toLocalMobile(null)).toBe('');
    expect(toLocalMobile(undefined)).toBe('');
  });
});

describe('isValidMobile', () => {
  it.each(['9876543210', '6000000000', '+91 98765 43210'])('accepts %s', (value) => {
    expect(isValidMobile(value)).toBe(true);
  });

  it.each([
    ['98765432101', '11 digits — the reported bug'],
    ['987654321', '9 digits'],
    ['1234567890', 'not a mobile prefix'],
    ['5876543210', 'prefix below 6'],
    ['', 'blank'],
  ])('rejects %s (%s)', (value) => {
    expect(isValidMobile(value)).toBe(false);
  });

  it('does not silently trim an overlong number into a valid one', () => {
    // The input caps at ten as you type, but validation must judge what it was
    // actually given - trimming would save a different number than was entered.
    expect(toLocalMobile('98765432101')).toBe('9876543210');
    expect(isValidMobile('98765432101')).toBe(false);
  });
});

describe('mobileError', () => {
  it('allows a blank optional phone', () => {
    expect(mobileError('')).toBe('');
  });

  it('requires a blank phone when the field is required', () => {
    expect(mobileError('', { required: true })).toMatch(/required/i);
  });

  it('names the rule for a bad number', () => {
    expect(mobileError('12345')).toMatch(/10-digit/);
  });

  it('passes a good number', () => {
    expect(mobileError('9876543210')).toBe('');
  });
});
