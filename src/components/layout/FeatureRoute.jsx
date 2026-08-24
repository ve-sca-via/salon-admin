/**
 * FeatureRoute - route guard for feature-gated screens
 *
 * Renders the 404 page when the current user is not entitled to the feature,
 * so a hidden feature's URL behaves exactly like a URL that does not exist.
 * Deliberately NOT an "upgrade to unlock" screen — that would advertise the
 * feature to the very user it is being hidden from.
 *
 * `internalOnly` guards screens no client should ever see regardless of any
 * entitlement (the Feature Flags page itself).
 *
 * This is UX, not security: the matching backend routes return 404 on their
 * own. Bypassing this component in devtools yields an empty screen.
 */

import { PageLoader } from '../common/LoadingSpinner';
import { useFeatures } from '../../hooks/useFeatures';
import NotFoundPage from '../../pages/NotFoundPage';

export const FeatureRoute = ({ feature, internalOnly = false, children }) => {
  const { isEnabled, isInternal, isLoading } = useFeatures();

  // Hold rather than fail closed here: rendering 404 during the first fetch
  // would flash a "not found" page on every hard refresh of a valid screen.
  if (isLoading) {
    return <PageLoader />;
  }

  if (internalOnly) {
    return isInternal ? children : <NotFoundPage />;
  }

  return isEnabled(feature) ? children : <NotFoundPage />;
};

export default FeatureRoute;
