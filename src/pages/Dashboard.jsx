import { useGetDashboardStatsQuery, useGetRecentActivityQuery } from '../services/api/adminApi';
import { StatCard } from '../components/common/Card';
import { Card } from '../components/common/Card';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ActivityFeed } from '../components/common/ActivityFeed';

export const Dashboard = () => {
  // RTK Query hook - use isFetching for background loading, isLoading only for initial load
  const { data: statsData, isLoading, isFetching, error } = useGetDashboardStatsQuery();
  const { data: activityData, isLoading: isLoadingActivity, error: activityError } = useGetRecentActivityQuery({ limit: 10 });
  
  // Extract stats - backend returns direct object, axiosBaseQuery wraps it in { data: {...} }
  const stats = statsData || {};
  const activities = activityData?.data || [];

  // Only show full-page loader on INITIAL load (no cached data)
  // If we have cached data, show it while refetching in background
  if (isLoading && !statsData) {
    return <LoadingSpinner size="xl" className="min-h-screen" />;
  }
  
  if (error) {
    console.error('Dashboard Stats Error:', error);
  }

  const userGrowth = (stats.new_users_this_month || 0) - (stats.new_users_last_month || 0);
  const userTrend = userGrowth >= 0 ? 'up' : 'down';

  return (
    <div className="space-y-6">
      {/* Background refresh indicator */}
      {isFetching && statsData && (
        <div className="fixed top-16 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">Updating...</span>
        </div>
      )}
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Pending Requests"
          value={stats.pending_requests || 0}
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="orange"
        />

        <StatCard
          title="Total Salons"
          value={stats.total_salons || 0}
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          color="blue"
        />

        <StatCard
          title="Active Salons"
          value={stats.active_salons || 0}
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="green"
        />

        <StatCard
          title="Pending Payment"
          value={stats.pending_payment_salons || 0}
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="orange"
        />

        <StatCard
          title="Total Revenue"
          value={`₹${stats.total_revenue?.toLocaleString('en-IN') || '0'}`}
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="purple"
        />

        <StatCard
          title="This Month's Revenue"
          value={`₹${stats.this_month_revenue?.toLocaleString('en-IN') || '0'}`}
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="emerald"
        />

        <StatCard
          title="Total RMs"
          value={stats.total_rms || 0}
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="indigo"
        />

        <StatCard
          title="Today's Bookings"
          value={stats.today_bookings || 0}
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          color="pink"
        />

        <StatCard
          title="Total Bookings"
          value={stats.total_bookings || 0}
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          color="cyan"
        />
      </div>

      {/* Recent Activity Feed */}
      <Card title="Recent Activity" subtitle="Latest system actions and events">
        <ActivityFeed 
          activities={activities}
          isLoading={isLoadingActivity}
          error={activityError}
        />
      </Card>
    </div>
  );
};
