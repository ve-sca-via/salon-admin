import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getSalons, updateSalon as updateSalonAPI, deleteSalon as deleteSalonAPI } from '../../services/backendApi';

export const fetchSalons = createAsyncThunk(
  'salons/fetchSalons',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getSalons();
      return response.data || [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateSalon = createAsyncThunk(
  'salons/updateSalon',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await updateSalonAPI(id, updates);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteSalon = createAsyncThunk(
  'salons/deleteSalon',
  async (id, { rejectWithValue }) => {
    try {
      await deleteSalonAPI(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const salonsSlice = createSlice({
  name: 'salons',
  initialState: {
    salons: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalons.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSalons.fulfilled, (state, action) => {
        state.isLoading = false;
        state.salons = action.payload;
      })
      .addCase(fetchSalons.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(updateSalon.fulfilled, (state, action) => {
        const index = state.salons.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.salons[index] = action.payload;
        }
      })
      .addCase(deleteSalon.fulfilled, (state, action) => {
        state.salons = state.salons.filter(s => s.id !== action.payload);
      });
  },
});

export default salonsSlice.reducer;
