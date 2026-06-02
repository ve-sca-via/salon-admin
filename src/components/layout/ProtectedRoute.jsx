import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PageLoader } from '../common/LoadingSpinner';
import { hasStoredAuth } from '../../utils/session';

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useSelector((state) => state.auth);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!hasStoredAuth() && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
