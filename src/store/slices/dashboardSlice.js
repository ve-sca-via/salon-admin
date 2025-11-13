import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDashboardStats } from '../../services/backendApi';

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      // Fetch from backend API
      const stats = await getDashboardStats();
      
      return {
        totalUsers: stats.total_salons || 0,
        totalAppointments: stats.total_bookings || 0,
        todayAppointments: stats.today_bookings || 0,
        totalRevenue: stats.total_revenue || 0,
        thisMonthRevenue: stats.this_month_revenue || 0,
        pendingRequests: stats.pending_requests || 0,
        activeSalons: stats.active_salons || 0,
        pendingPaymentSalons: stats.pending_payment_salons || 0,
        totalRMs: stats.total_rms || 0,
        newUsersThisMonth: 0, // Not yet in backend
        newUsersLastMonth: 0, // Not yet in backend
      };
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  stats: {
    totalUsers: 0,
    newUsersThisMonth: 0,
    newUsersLastMonth: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    totalRevenue: 0,
    thisMonthRevenue: 0,
    pendingPaymentSalons: 0,
    recentAppointments: [],
  },
  isLoading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.stats = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
