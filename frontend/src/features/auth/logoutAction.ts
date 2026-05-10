import type { AppDispatch } from '../../app/store';
import { baseApi } from '../../api/baseApi';
import { logout } from './authSlice';

/**
 * Thunk that clears auth state AND evicts the entire RTK Query cache.
 *
 * Cache Invalidation pattern: ensures no previous user's data lingers
 * in the RTK Query cache after logout (multi-user terminal scenario).
 *
 * Use this instead of dispatching `logout()` directly from components.
 */
export const logoutAction = () => (dispatch: AppDispatch) => {
  dispatch(logout());
  dispatch(baseApi.util.resetApiState());
};
