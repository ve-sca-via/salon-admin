import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getStaff, updateStaff as updateStaffAPI, deleteStaff as deleteStaffAPI } from '../../services/backendApi';

export const fetchStaff = createAsyncThunk(
  'staff/fetchStaff',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getStaff();
      return response.data || [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createStaff = createAsyncThunk(
  'staff/createStaff',
  async (staffData, { rejectWithValue }) => {
    try {
      throw new Error('Create staff endpoint not yet implemented');
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create staff');
    }
  }
);

export const updateStaff = createAsyncThunk(
  'staff/updateStaff',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await updateStaffAPI(id, updates);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteStaff = createAsyncThunk(
  'staff/deleteStaff',
  async (id, { rejectWithValue }) => {
    try {
      await deleteStaffAPI(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  staff: [],
  isLoading: false,
  error: null,
};

const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaff.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchStaff.fulfilled, (state, action) => {
        state.staff = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchStaff.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createStaff.fulfilled, (state, action) => {
        state.staff.push(action.payload);
      })
      .addCase(updateStaff.fulfilled, (state, action) => {
        const index = state.staff.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.staff[index] = action.payload;
        }
      })
      .addCase(deleteStaff.fulfilled, (state, action) => {
        state.staff = state.staff.filter(s => s.id !== action.payload);
      });
  },
});

export const { clearError } = staffSlice.actions;
export default staffSlice.reducer;
