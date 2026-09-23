/**
 * Normalize API error payloads for user-facing toasts.
 *
 * Every error the app shows passes through here: `axiosBaseQuery` calls this
 * and writes the result into `error.data.detail`, which is what the pages read.
 * So this file is the single place that decides whether a failure is legible.
 *
 * Backend error shapes this must cope with:
 *   1. FastAPI HTTPException      { detail: "Invalid credentials" }
 *   2. FastAPI request validation { detail: [{ loc: ["body","email"], msg }] }
 *   3. App ValidationErrorResponse{ message, errors: [{ field, message }] }
 *   4. App ErrorResponse          { message, errors: ["..."] }
 *   5. SlowAPI rate limiting      { detail: "5 per 1 minute" }  (or a bare string)
 *
 * Shape 3 is why edit forms used to fail silently. A 422's top-level `message`
 * names the fields now, but older deployments still send a flat "Validation
 * failed" there while the useful per-field detail sits in `errors[]` — which
 * nothing read. Reading `errors[]` first means this keeps working against both.
 */

const RATE_LIMIT_DETAIL_PATTERN =
  /too many requests|rate.?limit|rate_limit_exceeded|\d+\s+per\s+\d+/i;

const DEFAULT_RATE_LIMIT_MESSAGE =
  'Too many requests. Please wait a moment and try again.';

/** Wrapper segments in a Pydantic error location; the field name is what's left. */
const LOC_WRAPPERS = new Set(['body', 'query', 'path', 'header', 'cookie']);

/** Enough fields to be actionable without an unreadable toast. */
const MAX_FIELDS = 3;

/** "body.items.0.price" -> "price" — the name shown next to the input. */
function leafFieldName(path) {
  const parts = String(path ?? '')
    .split('.')
    .filter((part) => part && !LOC_WRAPPERS.has(part) && !/^\d+$/.test(part));
  return parts.join('.');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Per-field messages from shapes 2, 3 and 4.
 * @returns {Array<{ field: string, message: string }>}
 */
export function extractFieldErrors(data) {
  if (!isRecord(data)) return [];
  const out = [];
  const seen = new Set();

  const push = (field, message) => {
    const text = String(message ?? '').trim();
    if (!text) return;
    const key = `${field}|${text}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ field, message: text });
  };

  // Shapes 3 and 4: { errors: [{ field, message }] } or { errors: ["..."] }
  if (Array.isArray(data.errors)) {
    for (const entry of data.errors) {
      if (typeof entry === 'string') push('', entry);
      else if (isRecord(entry)) push(leafFieldName(entry.field), entry.message);
    }
  }

  // Shape 2: FastAPI's own validator — { detail: [{ loc: [...], msg }] }
  if (Array.isArray(data.detail)) {
    for (const entry of data.detail) {
      if (!isRecord(entry)) continue;
      const loc = Array.isArray(entry.loc) ? entry.loc.join('.') : '';
      push(leafFieldName(loc), entry.msg);
    }
  }

  return out;
}

/** "price: must be greater than 0; sku: too long (and 2 more fields)" */
function summarizeFieldErrors(fieldErrors) {
  if (!fieldErrors.length) return '';

  const shown = fieldErrors.slice(0, MAX_FIELDS);
  const summary = shown
    .map(({ field, message }) => (field ? `${field}: ${message}` : message))
    .join('; ');

  const remaining = fieldErrors.length - shown.length;
  return remaining
    ? `${summary} (and ${remaining} more field${remaining > 1 ? 's' : ''})`
    : summary;
}

/**
 * @param {unknown} error - RTK Query / axios error shape
 * @param {string} fallback - Message when nothing usable is found
 * @returns {string}
 */
export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  const status = error.status ?? error.response?.status;
  const data = error.data ?? error.response?.data;

  if (status === 429 || data?.error === 'rate_limit_exceeded') {
    const explicit = data?.message || data?.detail;
    return typeof explicit === 'string' && explicit.trim() && !RATE_LIMIT_DETAIL_PATTERN.test(explicit)
      ? explicit.trim()
      : DEFAULT_RATE_LIMIT_MESSAGE;
  }

  if (typeof data === 'string') {
    if (RATE_LIMIT_DETAIL_PATTERN.test(data)) {
      return DEFAULT_RATE_LIMIT_MESSAGE;
    }
    return data;
  }

  if (data && typeof data === 'object') {
    // Prefer the per-field breakdown: a 422's top-level message can be generic,
    // and "Validation failed" tells the user nothing about which input to fix.
    const summary = summarizeFieldErrors(extractFieldErrors(data));
    if (summary) return summary;

    for (const candidate of [data.message, data.detail]) {
      if (typeof candidate === 'string' && candidate.trim()) {
        if (RATE_LIMIT_DETAIL_PATTERN.test(candidate)) {
          return DEFAULT_RATE_LIMIT_MESSAGE;
        }
        return candidate.trim();
      }
    }
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    if (RATE_LIMIT_DETAIL_PATTERN.test(error.message)) {
      return DEFAULT_RATE_LIMIT_MESSAGE;
    }
    return error.message;
  }

  return fallback;
}
