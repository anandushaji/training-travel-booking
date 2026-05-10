import { combineReducers } from '@reduxjs/toolkit';
import { baseApi } from '../api/baseApi';
import notificationsReducer from '../features/notifications/notificationSlice';
import { authReducer } from '../features/auth/authSlice';
import { searchReducer } from '../features/search/searchSlice';
import { bookingReducer } from '../features/booking/bookingSlice';
import { profileReducer } from '../features/profile/profileSlice';

export const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  notifications: notificationsReducer,
  auth: authReducer,
  search: searchReducer,
  booking: bookingReducer,
  profile: profileReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
