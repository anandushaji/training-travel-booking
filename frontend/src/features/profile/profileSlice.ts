import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/rootReducer';
import type { ProfileState } from './profile.types';

const initialState: ProfileState = {
  viewingTravelerId: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setViewingTravelerId(state, action: PayloadAction<string | null>) {
      state.viewingTravelerId = action.payload;
    },
  },
});

export const { setViewingTravelerId } = profileSlice.actions;
export const profileReducer = profileSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectViewingTravelerId = (state: RootState) =>
  state.profile.viewingTravelerId;
