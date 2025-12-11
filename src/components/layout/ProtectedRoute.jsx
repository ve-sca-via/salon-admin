import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PageLoader } from '../common/LoadingSpinner';
import { useEffect } from 'react';
import { getCurrentUser } from '../../services/api/authApi';
import { useDispatch } from 'react-redux';
import { setUser, setError } from '../../store/slices/authSlice';

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    // Check if we have a token but no user data
    const token = localStorage.getItem('access_token');
    if (token && !user) {
      getCurrentUser()
        .then(response => {
          dispatch(setUser(response.user));
        })
        .catch(error => {
          dispatch(setError(error.message));
          // Only clear auth-related items, not all localStorage
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
        });
    }
  }, [user, dispatch]);

  if (isLoading) {
    return <PageLoader />;
  }

  // Check token first, then fallback to isAuthenticated
  const token = localStorage.getItem('access_token');
  if (!token && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
