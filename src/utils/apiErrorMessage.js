/**
 * Normalize API error payloads for user-facing toasts.
 * Handles rate limiting (429) and technical SlowAPI detail strings.
 */

const RATE_LIMIT_DETAIL_PATTERN =
  /too many requests|rate.?limit|rate_limit_exceeded|\d+\s+per\s+\d+/i;

const DEFAULT_RATE_LIMIT_MESSAGE =
  'Too many requests. Please wait a moment and try again.';

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
    return data?.message || data?.detail || DEFAULT_RATE_LIMIT_MESSAGE;
  }

  if (typeof data === 'string') {
    if (RATE_LIMIT_DETAIL_PATTERN.test(data)) {
      return DEFAULT_RATE_LIMIT_MESSAGE;
    }
    return data;
  }

  if (data && typeof data === 'object') {
    const detail = data.detail;
    const message = data.message;

    if (typeof message === 'string' && message.trim()) {
      if (RATE_LIMIT_DETAIL_PATTERN.test(message) && !data.error) {
        return DEFAULT_RATE_LIMIT_MESSAGE;
      }
      return message;
    }

    if (typeof detail === 'string' && detail.trim()) {
      if (RATE_LIMIT_DETAIL_PATTERN.test(detail)) {
        return DEFAULT_RATE_LIMIT_MESSAGE;
      }
      return detail;
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
