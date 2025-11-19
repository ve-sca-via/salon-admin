import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { store } from './store/store';
import { setUser, setLoading } from './store/slices/authSlice';

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
        console.error('Error checking session:', error);
        dispatch(setLoading(false));
      }
    };

    checkSession();
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
      <AppContent />
    </Provider>
  );
}

export default App;
