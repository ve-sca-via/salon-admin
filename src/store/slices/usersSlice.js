import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getUsers, createUser as createUserAPI, updateUser as updateUserAPI, deleteUser as deleteUserAPI } from '../../services/backendApi';

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async ({ page = 1, limit = 20, search = '', role = '' }, { rejectWithValue }) => {
    try {
      const response = await getUsers({ page, limit, search, role });
      return { data: response.data || [], count: response.total || 0, page: response.page || page };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async ({ email, password, full_name, phone, role }, { rejectWithValue }) => {
    try {
      const response = await createUserAPI({ email, password, full_name, phone, role });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create user');
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await updateUserAPI(id, updates);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id, { rejectWithValue }) => {
    try {
      await deleteUserAPI(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = { users: [], totalCount: 0, currentPage: 1, isLoading: false, isCreating: false, isUpdating: false, error: null };

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: { clearError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchUsers.fulfilled, (state, action) => { state.users = action.payload.data; state.totalCount = action.payload.count; state.currentPage = action.payload.page; state.isLoading = false; })
      .addCase(fetchUsers.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      .addCase(createUser.pending, (state) => { state.isCreating = true; state.error = null; })
      .addCase(createUser.fulfilled, (state, action) => { state.users.unshift(action.payload); state.totalCount += 1; state.isCreating = false; })
      .addCase(createUser.rejected, (state, action) => { state.isCreating = false; state.error = action.payload; })
      .addCase(updateUser.pending, (state) => { state.isUpdating = true; state.error = null; })
      .addCase(updateUser.fulfilled, (state, action) => { const index = state.users.findIndex(u => u.id === action.payload.id); if (index !== -1) { state.users[index] = action.payload; } state.isUpdating = false; })
      .addCase(updateUser.rejected, (state, action) => { state.isUpdating = false; state.error = action.payload; })
      .addCase(deleteUser.fulfilled, (state, action) => { state.users = state.users.filter(u => u.id !== action.payload); state.totalCount -= 1; });
  },
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;
