import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { store, persistor } from './store/store';
import { setUser, setLoading, logout as logoutAction } from './store/slices/authSlice';

import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Lazy load all page components for code splitting
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Users = lazy(() => import('./pages/Users').then(module => ({ default: module.Users })));
const Appointments = lazy(() => import('./pages/Appointments').then(module => ({ default: module.Appointments })));
const Salons = lazy(() => import('./pages/Salons'));
const Staff = lazy(() => import('./pages/Staff').then(module => ({ default: module.Staff })));
const Services = lazy(() => import('./pages/Services').then(module => ({ default: module.Services })));
const PendingSalons = lazy(() => import('./pages/PendingSalons'));
const RMManagement = lazy(() => import('./pages/RMManagement').then(module => ({ default: module.RMManagement })));
const CareerApplications = lazy(() => import('./pages/CareerApplications'));
const SystemConfig = lazy(() => import('./pages/SystemConfig').then(module => ({ default: module.SystemConfig })));

function AppContent() {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Check for existing JWT token
    const checkSession = () => {
      try {
        const token = localStorage.getItem('access_token');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
          const user = JSON.parse(userStr);
          dispatch(setUser(user));
        } else {
          dispatch(setLoading(false));
        }
      } catch (error) {
        dispatch(setLoading(false));
      }
    };

    checkSession();

    // Listen for auth logout events from axios interceptor
    const handleAuthLogout = (event) => {
      dispatch(logoutAction());
      toast.error(event.detail || 'Session expired. Please login again.');
      // Navigation will happen via ProtectedRoute redirect
    };

    window.addEventListener('auth:logout', handleAuthLogout);

    // Security: Auto-logout after 30 minutes of inactivity (for shared computers)
    let inactivityTimer;
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
          dispatch(logoutAction());
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          toast.warning('Session expired due to inactivity. Please login again.');
        }
      }, INACTIVITY_TIMEOUT);
    };

    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });

    // Start the timer
    resetInactivityTimer();

    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
      clearTimeout(inactivityTimer);
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/salons" element={<Salons />} />
              <Route path="/pending-salons" element={<PendingSalons />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/services" element={<Services />} />
              <Route path="/rm-management" element={<RMManagement />} />
              <Route path="/career-applications" element={<CareerApplications />} />
              <Route path="/system-config" element={<SystemConfig />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ToastContainer position="top-right" autoClose={3000} />
    </Router>
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
