import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import usersReducer from './slices/usersSlice';
import appointmentsReducer from './slices/appointmentsSlice';
import salonsReducer from './slices/salonsSlice';
import staffReducer from './slices/staffSlice';
import dashboardReducer from './slices/dashboardSlice';

// RTK Query APIs
import { adminApi } from '../services/api/adminApi';
import { salonApi } from '../services/api/salonApi';
import { userApi } from '../services/api/userApi';
import { appointmentApi } from '../services/api/appointmentApi';
import { careerApi } from '../services/api/careerApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    appointments: appointmentsReducer,
    salons: salonsReducer,
    staff: staffReducer,
    dashboard: dashboardReducer,
    // RTK Query reducers
    [adminApi.reducerPath]: adminApi.reducer,
    [salonApi.reducerPath]: salonApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [appointmentApi.reducerPath]: appointmentApi.reducer,
    [careerApi.reducerPath]: careerApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/setUser'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.user'],
      },
    })
      .concat(adminApi.middleware)
      .concat(salonApi.middleware)
      .concat(userApi.middleware)
      .concat(appointmentApi.middleware)
      .concat(careerApi.middleware),
});
