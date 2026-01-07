import { formatDistanceToNow } from 'date-fns';

/**
 * Activity icon based on action type
 */
const ActivityIcon = ({ action }) => {
  const iconMap = {
    salon_approved: (
      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    salon_rejected: (
      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    vendor_request_submitted: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    vendor_request_draft_saved: (
      <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
      </svg>
    ),
    vendor_request_submitted_for_approval: (
      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    vendor_request_draft_updated: (
      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    user_created: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    config_updated: (
      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    payment_confirmed: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    rm_assigned: (
      <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    career_application_submitted: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    career_application_status_updated: (
      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    email_sent: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    default: (
      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return iconMap[action] || iconMap.default;
};

/**
 * Format activity description
 */
const getActivityDescription = (activity) => {
  const { action, details } = activity;
  
  switch (action) {
    case 'salon_approved':
      return `Approved salon "${details?.salon_name || 'Unknown'}"`;
    
    case 'salon_rejected':
      return `Rejected salon "${details?.salon_name || 'Unknown'}"`;
    
    case 'vendor_request_submitted':
      return `Submitted vendor request for "${details?.business_name || 'Unknown'}" (${details?.business_type || 'salon'}) in ${details?.city || 'Unknown'}, ${details?.state || ''}`;
    
    case 'vendor_request_draft_saved':
      return `Saved draft for "${details?.business_name || 'Unknown'}" (${details?.business_type || 'salon'})`;
    
    case 'vendor_request_submitted_for_approval':
      return `Submitted "${details?.business_name || 'Unknown'}" (${details?.business_type || 'salon'}) for approval - ${details?.city || 'Unknown'}, ${details?.state || ''}`;
    
    case 'vendor_request_draft_updated':
      return `Updated draft "${details?.business_name || 'Unknown'}"`;
    
    case 'user_created':
      return `Created ${details?.role?.replace('_', ' ') || 'user'} account for ${details?.email || 'user'}`;
    
    case 'config_updated':
      return `Updated system config: ${activity.entity_id || 'setting'}`;
    
    case 'payment_confirmed':
      return `Payment confirmed: ₹${details?.amount || 0}`;
    
    case 'rm_assigned':
      return `Assigned RM ${details?.rm_name || 'Unknown'} to ${details?.salon_name || 'salon'}`;
    
    case 'career_application_submitted':
      return `New career application from ${details?.applicant_name || 'Unknown'} for ${details?.position || 'position'} (${details?.application_number || ''})`;
    
    case 'career_application_status_updated':
      return `Updated career application for ${details?.applicant_name || 'Unknown'} to "${details?.new_status?.replace(/_/g, ' ') || 'unknown status'}"`;
    
    case 'email_sent':
      const emailTypeMap = {
        vendor_approval: 'Vendor Approval',
        vendor_rejection: 'Vendor Rejection', 
        rm_notification: 'RM Notification',
        booking_confirmation: 'Booking Confirmation',
        booking_confirmation_customer: 'Booking Confirmation',
        booking_notification_vendor: 'Booking Notification',
        booking_cancellation: 'Booking Cancellation',
        payment_receipt: 'Payment Receipt',
        welcome_vendor: 'Welcome Email',
        career_application_confirmation: 'Application Confirmation'
      };
      const emailType = emailTypeMap[details?.email_type] || details?.email_type?.replace(/_/g, ' ');
      return `Sent ${emailType} email to ${details?.recipient || 'recipient'}`;
    
    default:
      return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

/**
 * Activity Feed Item Component
 */
export const ActivityItem = ({ activity }) => {
  const userName = activity.profiles?.full_name || activity.profiles?.email || 'System';
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });
  const description = getActivityDescription(activity);

  return (
    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex-shrink-0 mt-1">
        <ActivityIcon action={activity.action} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {description}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {userName} • {timeAgo}
        </p>
      </div>
    </div>
  );
};

/**
 * Activity Feed Component
 */
export const ActivityFeed = ({ activities, isLoading, error }) => {
  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Failed to load activity logs</p>
      </div>
    );
  }

  if (isLoading && !activities?.length) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg animate-pulse">
            <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="mx-auto w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
};
