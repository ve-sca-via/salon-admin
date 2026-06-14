import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { store, persistor } from './store/store';
import { setUser, setLoading, logout as logoutAction } from './store/slices/authSlice';
import { validateSession, refreshToken } from './services/api/authApi';
import {
  hasStoredAuth,
  isInactivityExpired,
  isJwtExpired,
  touchActivity,
  clearAuthStorage,
  INACTIVITY_TIMEOUT_MS,
} from './utils/session';

import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { SkeletonStatCard } from './components/common/Skeleton';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load all page components for code splitting
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Users = lazy(() => import('./pages/Users').then(module => ({ default: module.Users })));
const Appointments = lazy(() => import('./pages/Appointments').then(module => ({ default: module.Appointments })));
const Salons = lazy(() => import('./pages/Salons'));
const Services = lazy(() => import('./pages/Services').then(module => ({ default: module.Services })));
const PendingSalons = lazy(() => import('./pages/PendingSalons'));
const RMManagement = lazy(() => import('./pages/RMManagement').then(module => ({ default: module.RMManagement })));
const CareerApplications = lazy(() => import('./pages/CareerApplications'));
const SystemConfig = lazy(() => import('./pages/SystemConfig').then(module => ({ default: module.SystemConfig })));
const Products = lazy(() => import('./pages/Products'));
const ProductOrders = lazy(() => import('./pages/ProductOrders').then(module => ({ default: module.ProductOrders })));
const Coupons = lazy(() => import('./pages/Coupons'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function AppContent() {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    let cancelled = false;

    const initSession = async () => {
      dispatch(setLoading(true));

      if (!hasStoredAuth()) {
        dispatch(logoutAction());
        dispatch(setLoading(false));
        return;
      }

      const result = await validateSession();
      if (cancelled) return;

      if (result.valid) {
        dispatch(setUser(result.user));
      } else {
        dispatch(logoutAction());
        dispatch(setLoading(false));
        if (result.reason === 'inactivity') {
          toast.warning('Session expired due to inactivity. Please login again.');
        }
      }
    };

    initSession();

    const handleAuthLogout = (event) => {
      clearAuthStorage();
      dispatch(logoutAction());
      dispatch(setLoading(false));
      toast.error(event.detail || 'Session expired. Please login again.');
    };

    window.addEventListener('auth:logout', handleAuthLogout);

    const logoutInactivity = (message) => {
      if (!hasStoredAuth()) return;
      clearAuthStorage();
      dispatch(logoutAction());
      dispatch(setLoading(false));
      toast.warning(message);
    };

    let inactivityTimer;

    const resetInactivityTimer = () => {
      if (!hasStoredAuth()) return;
      touchActivity();
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        logoutInactivity('Session expired due to inactivity. Please login again.');
      }, INACTIVITY_TIMEOUT_MS);
    };

    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible' || !hasStoredAuth()) return;

      if (isInactivityExpired()) {
        logoutInactivity('Session expired due to inactivity. Please login again.');
        return;
      }

      const access = localStorage.getItem('access_token');
      if (access && isJwtExpired(access)) {
        try {
          await refreshToken();
        } catch {
          clearAuthStorage();
          dispatch(logoutAction());
          dispatch(setLoading(false));
          toast.error('Session expired. Please login again.');
        }
      }
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => {
      document.addEventListener(event, resetInactivityTimer);
    });
    document.addEventListener('visibilitychange', handleVisibility);

    resetInactivityTimer();

    return () => {
      cancelled = true;
      window.removeEventListener('auth:logout', handleAuthLogout);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(inactivityTimer);
      activityEvents.forEach((event) => {
        document.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Skeleton header */}
          <div className="h-16 bg-white rounded-lg shadow animate-pulse"></div>
          
          {/* Skeleton stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback="app">
      <Router>
        <Suspense fallback={
          <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="h-16 bg-white rounded-lg shadow animate-pulse"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonStatCard key={i} />
                ))}
              </div>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/login" element={
              <ErrorBoundary fallback="page">
                <Login />
              </ErrorBoundary>
            } />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={
                  <ErrorBoundary fallback="page">
                    <Dashboard />
                  </ErrorBoundary>
                } />
                <Route path="/users" element={
                  <ErrorBoundary fallback="page">
                    <Users />
                  </ErrorBoundary>
                } />
                <Route path="/appointments" element={
                  <ErrorBoundary fallback="page">
                    <Appointments />
                  </ErrorBoundary>
                } />
                <Route path="/salons" element={
                  <ErrorBoundary fallback="page">
                    <Salons />
                  </ErrorBoundary>
                } />
                <Route path="/pending-salons" element={
                  <ErrorBoundary fallback="page">
                    <PendingSalons />
                  </ErrorBoundary>
                } />
                <Route path="/services" element={
                  <ErrorBoundary fallback="page">
                    <Services />
                  </ErrorBoundary>
                } />
                <Route path="/rm-management" element={
                  <ErrorBoundary fallback="page">
                    <RMManagement />
                  </ErrorBoundary>
                } />
                <Route path="/career-applications" element={
                  <ErrorBoundary fallback="page">
                    <CareerApplications />
                  </ErrorBoundary>
                } />
                <Route path="/system-config" element={
                  <ErrorBoundary fallback="page">
                    <SystemConfig />
                  </ErrorBoundary>
                } />
                <Route path="/products" element={
                  <ErrorBoundary fallback="page">
                    <Products />
                  </ErrorBoundary>
                } />
                <Route path="/product-orders" element={
                  <ErrorBoundary fallback="page">
                    <ProductOrders />
                  </ErrorBoundary>
                } />
                <Route path="/coupons" element={
                  <ErrorBoundary fallback="page">
                    <Coupons />
                  </ErrorBoundary>
                } />
              </Route>
            </Route>
            
            <Route path="*" element={
              <ErrorBoundary fallback="page">
                <NotFoundPage />
              </ErrorBoundary>
            } />
          </Routes>
        </Suspense>
        <ToastContainer position="top-right" autoClose={3000} />
      </Router>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}

export default App;
