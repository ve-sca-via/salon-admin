/**
 * useFeatures - feature entitlement state for the current user
 *
 * Single place the UI asks "should I render this?". Backed by GET /features,
 * which RTK Query caches, so calling this from several components costs one
 * request.
 *
 * IMPORTANT: this is presentation only. The server enforces the same gate on
 * every protected endpoint and answers 404, so a stale or tampered cache
 * cannot actually unlock a feature — it can only make the UI briefly wrong.
 */

import { useGetMyFeaturesQuery } from '../services/api/featureApi';

export const FEATURE_STATUS = {
  INTERNAL: 'internal',
  ENABLED: 'enabled',
  DISABLED: 'disabled',
};

export const useFeatures = () => {
  const { data, isLoading, isError } = useGetMyFeaturesQuery();

  const features = data?.features || {};
  const isInternal = Boolean(data?.is_internal);

  /**
   * Whether the current user may see a feature.
   *
   * The backend has already filtered the map to what this user is allowed to
   * know about, so mere presence of the key is the answer — client admins
   * never receive keys for unsold features in the first place.
   *
   * Fails closed while loading or on error: better a nav item that appears a
   * moment late than one that flashes into view for the client and vanishes.
   */
  const isEnabled = (key) => Boolean(features[key]);

  /** True when the feature is visible to staff only — drives the "Internal" badge. */
  const isInternalOnly = (key) => features[key] === FEATURE_STATUS.INTERNAL;

  return {
    features,
    isInternal,
    isEnabled,
    isInternalOnly,
    isLoading,
    isError,
  };
};

export default useFeatures;
