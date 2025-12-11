import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // localStorage
import { combineReducers } from '@reduxjs/toolkit';
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

// Redux Persist Configuration
const persistConfig = {
  key: 'salon-admin-root',
  version: 1,
  storage,
  // Only persist non-sensitive data
  // DO NOT persist caches containing PII (personal identifiable information)
  whitelist: [
    'auth',                // ✅ Auth state (just user role/name, no token)
    configApi.reducerPath, // ✅ System config (non-sensitive settings)
    // salonApi.reducerPath REMOVED - was causing stale data on refresh
  ],
  // DO NOT PERSIST (contains PII or needs to be fresh):
  blacklist: [
    adminApi.reducerPath,        // Needs to be fresh (dashboard stats)
    userApi.reducerPath,         // 🔴 Contains customer emails/phones
    appointmentApi.reducerPath,  // 🔴 Contains customer booking details
    careerApi.reducerPath,       // 🔴 Contains applicant personal info
    serviceApi.reducerPath,      // Low risk but unnecessary
    staffApi.reducerPath,        // Contains staff personal info
    salonApi.reducerPath,        // 🔴 Contains salon data - MUST be fresh after mutations
  ],
  // Throttle writes to localStorage (better performance)
  throttle: 1000,
};

// Combine all reducers
const rootReducer = combineReducers({
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
});

// Wrap with persistReducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types (including redux-persist actions)
        ignoredActions: ['auth/setUser', FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
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

// Enable refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

// Create persistor
export const persistor = persistStore(store);

// Expose store in development for debugging
if (import.meta.env.DEV) {
  window.store = store;
  window.persistor = persistor;
}

export default store;
