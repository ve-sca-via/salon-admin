import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';
import { 
  useGetPendingSalonsQuery,
  salonApi 
} from '../../services/api/salonApi';
import { adminApi } from '../../services/api/adminApi';
import { userApi } from '../../services/api/userApi';
import { appointmentApi } from '../../services/api/appointmentApi';
import { careerApi } from '../../services/api/careerApi';
import { serviceCategoryApi } from '../../services/api/serviceCategoryApi';
import { configApi } from '../../services/api/configApi';
import { useDispatch } from 'react-redux';

export const Sidebar = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  
  // Use RTK Query to fetch pending salons
  const { data: pendingSalonsData } = useGetPendingSalonsQuery({ limit: 100 });
  const pendingCount = pendingSalonsData?.data?.length || 0;
  
  const [hasNewNotification, setHasNewNotification] = useState(false);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    // Subscribe to real-time changes
    const channel = supabase
      .channel('sidebar-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vendor_join_requests',
          filter: 'status=eq.pending',
        },
        (payload) => {
          setHasNewNotification(true);
          
          // Remove animation after 3 seconds
          setTimeout(() => setHasNewNotification(false), 3000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vendor_join_requests',
        },
        () => {
          // RTK Query will automatically refetch when cache is invalidated
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Prefetch handlers for instant navigation
  const handlePrefetch = (path) => {
    // Prefetch data based on the route
    switch (path) {
      case '/':
        dispatch(adminApi.util.prefetch('getDashboardStats', undefined, { force: false }));
        break;
      case '/pending-salons':
        dispatch(salonApi.util.prefetch('getPendingSalons', {}, { force: false }));
        break;
      case '/salons':
        dispatch(salonApi.util.prefetch('getAllSalons', {}, { force: false }));
        break;
      case '/users':
        dispatch(userApi.util.prefetch('getAllUsers', {}, { force: false }));
        break;
      case '/appointments':
        dispatch(appointmentApi.util.prefetch('getAllAppointments', {}, { force: false }));
        break;
      case '/career-applications':
        dispatch(careerApi.util.prefetch('getCareerApplications', {}, { force: false }));
        break;
      case '/services':
        dispatch(serviceCategoryApi.util.prefetch('getAllServiceCategories', {}, { force: false }));
        break;
      case '/rm-management':
        dispatch(userApi.util.prefetch('getAllRMs', {}, { force: false }));
        break;
      case '/system-config':
        dispatch(configApi.util.prefetch('getSystemConfigs', undefined, { force: false }));
        break;
      default:
        break;
    }
  };

  const menuItems = [
    {
      path: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      label: 'Dashboard',
    },
    {
      path: '/pending-salons',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Pending Salons',
      badge: pendingCount,
      badgeColor: 'bg-accent-orange',
    },
    {
      path: '/salons',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      label: 'Salons',
    },
    {
      path: '/users',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      label: 'Users',
    },
    {
      path: '/rm-management',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      label: 'RM Management',
    },
    {
      path: '/appointments',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      label: 'Appointments',
    },
    {
      path: '/career-applications',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      label: 'Career Applications',
    },
    {
      path: '/services',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      label: 'Services',
    },
    {
      path: '/system-config',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: 'Settings',
    },
  ];

  return (
    <div className="flex flex-col w-64 bg-white h-screen border-r border-gray-200 shadow-sm">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-orange-600">
        <h1 className="text-xl font-display font-bold text-white">Lubist</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onMouseEnter={() => handlePrefetch(item.path)}
            onFocus={() => handlePrefetch(item.path)}
            className={`flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all ${
              isActive(item.path)
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-orange-50 hover:text-[#f89c02]'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={isActive(item.path) ? 'text-white' : 'text-gray-600'}>
                {item.icon}
              </div>
              <span className={isActive(item.path) ? 'text-white' : 'text-gray-700'}>
                {item.label}
              </span>
            </div>
            {item.badge > 0 && (
              <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full transition-all ${
                hasNewNotification && item.path === '/pending-salons'
                  ? 'bg-red-600 animate-pulse'
                  : item.badgeColor || 'bg-red-500'
              }`}>
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center font-body">
          © 2025 Lubist Admin
        </div>
      </div>
    </div>
  );
};
