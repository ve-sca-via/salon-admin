import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { logout } from '../../store/slices/authSlice';
import { refreshToken } from '../../services/backendApi';

const SessionTimer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // Get token expiry from localStorage
  const getTokenExpiry = () => {
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    if (!tokenExpiry) return null;
    return new Date(tokenExpiry);
  };

  // Calculate time remaining in minutes
  const calculateTimeRemaining = () => {
    const expiry = getTokenExpiry();
    if (!expiry) return null;

    const now = new Date();
    const diff = expiry - now;
    const minutes = Math.floor(diff / 1000 / 60);
    
    return minutes;
  };

  // Refresh the session token
  const handleRefreshSession = async () => {
    setIsRefreshing(true);
    try {
      const refresh_token = localStorage.getItem('refresh_token');
      if (!refresh_token) {
        throw new Error('No refresh token found');
      }

      await refreshToken(refresh_token);
      
      setShowWarning(false);
      toast.success('Session refreshed successfully!');
    } catch (error) {
      console.error('Failed to refresh session:', error);
      toast.error('Session refresh failed. Please login again.');
      
      // Logout and redirect
      dispatch(logout());
      navigate('/login');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh when close to expiry
  useEffect(() => {
    const checkAndRefresh = () => {
      const minutes = calculateTimeRemaining();
      
      if (minutes === null) return;
      
      // Show warning if less than 5 minutes
      if (minutes <= 5 && minutes > 0) {
        setShowWarning(true);
      }
      
      // Auto-refresh if less than 2 minutes
      if (minutes <= 2 && minutes > 0 && !isRefreshing) {
        handleRefreshSession();
      }
      
      // Session expired
      if (minutes <= 0) {
        toast.error('Session expired. Please login again.');
        dispatch(logout());
        navigate('/login');
      }
    };

    // Check immediately
    checkAndRefresh();

    // Check every minute
    const interval = setInterval(() => {
      const minutes = calculateTimeRemaining();
      setTimeRemaining(minutes);
      checkAndRefresh();
    }, 60000); // Every 1 minute

    // Also update every 10 seconds for more accurate display
    const displayInterval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(displayInterval);
    };
  }, [dispatch, navigate, isRefreshing]);

  // Initialize on mount
  useEffect(() => {
    setTimeRemaining(calculateTimeRemaining());
  }, []);

  if (timeRemaining === null) return null;

  // Determine color based on time remaining
  const getColorClass = () => {
    if (timeRemaining <= 5) return 'text-red-600 bg-red-50';
    if (timeRemaining <= 10) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getIconColor = () => {
    if (timeRemaining <= 5) return 'text-red-600';
    if (timeRemaining <= 10) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Session Timer Display */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${getColorClass()} transition-colors duration-300`}>
        <FiClock className={`${getIconColor()}`} />
        <span className="text-sm font-medium">
          {timeRemaining}m
        </span>
      </div>

      {/* Refresh Button */}
      <button
        onClick={handleRefreshSession}
        disabled={isRefreshing}
        className={`
          p-2 rounded-lg transition-all duration-200
          ${isRefreshing 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
          }
        `}
        title="Refresh session"
      >
        <FiRefreshCw className={`${isRefreshing ? 'animate-spin' : ''}`} />
      </button>

      {/* Warning Toast - Shows automatically when < 5 minutes */}
      {showWarning && timeRemaining <= 5 && (
        <div className="fixed bottom-4 right-4 z-50 bg-orange-500 text-white px-4 py-3 rounded-lg shadow-lg animate-bounce">
          <div className="flex items-center gap-3">
            <FiClock className="text-xl" />
            <div>
              <p className="font-semibold">Session expiring soon!</p>
              <p className="text-sm">{timeRemaining} minute(s) remaining</p>
            </div>
            <button
              onClick={() => {
                handleRefreshSession();
                setShowWarning(false);
              }}
              className="ml-4 px-3 py-1 bg-white text-orange-600 rounded font-medium hover:bg-orange-50 transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionTimer;
