/**
 * Indian mobile numbers, the one rule.
 *
 * The create-user form used to accept "at least 10 digits", so an RM could be
 * created with 11, 15 or a typo'd letter - `profiles.valid_phone_format` allows
 * up to 15 digits, and the backend schema checked nothing at all. All three now
 * agree on exactly ten digits starting 6-9 (app/utils/phone.py server-side).
 *
 * The API accepts and returns E.164 (+919876543210); these inputs work in local
 * digits, so `toLocalMobile` is what a stored value is edited as, and the backend
 * normalises what comes back.
 */

export const MOBILE_LENGTH = 10;

export const MOBILE_RULE_MESSAGE = 'Enter a 10-digit mobile number starting with 6-9';

const MOBILE_PATTERN = /^[6-9]\d{9}$/;

/**
 * Every digit in the value, with a full-length country code removed:
 * "+91 98765 43210" and "91-9876543210" -> "9876543210". Does NOT truncate, so a
 * too-long number stays too long and fails validation rather than being silently
 * trimmed into a different number.
 */
export function mobileDigits(value) {
  const digits = String(value ?? '').replace(/\D/g, '');

  // Strip the country code only at full length: a valid local number can itself
  // start with "91" (9123456789), and stripping that would corrupt it.
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

/**
 * What a phone input should hold as the user types - `mobileDigits` capped at ten,
 * so the field cannot grow past the rule in the first place.
 */
export function toLocalMobile(value) {
  return mobileDigits(value).slice(0, MOBILE_LENGTH);
}

/** True for exactly ten digits starting 6-9. Blank is not valid - callers decide
 * whether blank is allowed, since the phone is optional on most forms. */
export function isValidMobile(value) {
  return MOBILE_PATTERN.test(mobileDigits(value));
}

/**
 * Validation message for an optional phone field, or '' when it's fine.
 * @param {string} value raw input value
 * @param {{ required?: boolean }} [options]
 */
export function mobileError(value, { required = false } = {}) {
  const digits = mobileDigits(value);

  if (!digits) return required ? 'Phone number is required' : '';
  return MOBILE_PATTERN.test(digits) ? '' : MOBILE_RULE_MESSAGE;
}
