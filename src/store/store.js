import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

// RTK Query APIs
import { adminApi } from '../services/api/adminApi';
import { salonApi } from '../services/api/salonApi';
import { userApi } from '../services/api/userApi';
import { appointmentApi } from '../services/api/appointmentApi';
import { careerApi } from '../services/api/careerApi';
import { serviceApi } from '../services/api/serviceApi';
import { staffApi } from '../services/api/staffApi';
import { configApi } from '../services/api/configApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // RTK Query reducers
    [adminApi.reducerPath]: adminApi.reducer,
    [salonApi.reducerPath]: salonApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [appointmentApi.reducerPath]: appointmentApi.reducer,
    [careerApi.reducerPath]: careerApi.reducer,
    [serviceApi.reducerPath]: serviceApi.reducer,
    [staffApi.reducerPath]: staffApi.reducer,
    [configApi.reducerPath]: configApi.reducer,
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
      .concat(careerApi.middleware)
      .concat(serviceApi.middleware)
      .concat(staffApi.middleware)
      .concat(configApi.middleware),
});
