import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getBookings, updateBookingStatus } from '../../services/backendApi';

export const fetchAppointments = createAsyncThunk(
  'appointments/fetchAppointments',
  async ({ page = 1, limit = 20, status = '', dateFrom = '', dateTo = '' }, { rejectWithValue }) => {
    try {
      const response = await getBookings({ page, limit, status, dateFrom, dateTo });
      return { data: response.data || [], count: response.total || 0, page: response.page || page };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateAppointment = createAsyncThunk(
  'appointments/updateAppointment',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await updateBookingStatus(id, updates.status);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  appointments: [],
  totalCount: 0,
  currentPage: 1,
  isLoading: false,
  error: null,
};

const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppointments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.appointments = action.payload.data;
        state.totalCount = action.payload.count;
        state.currentPage = action.payload.page;
        state.isLoading = false;
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(updateAppointment.fulfilled, (state, action) => {
        const index = state.appointments.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
      });
  },
});

export const { clearError } = appointmentsSlice.actions;
export default appointmentsSlice.reducer;
