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
          console.error('Failed to get user:', error);
          dispatch(setError(error.message));
          localStorage.clear();
        });
    }
  }, [user, dispatch]);

  if (isLoading) {
    return <PageLoader />;
  }

  const token = localStorage.getItem('access_token');
  if (!token && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
