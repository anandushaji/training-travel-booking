import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/rootReducer';
import type { Booking, BookingState } from './booking.types';

const initialState: BookingState = {
  activeBooking: null,
  isPolling: false,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setActiveBooking(state, action: PayloadAction<Booking>) {
      state.activeBooking = action.payload;
    },
    clearActiveBooking(state) {
      state.activeBooking = null;
    },
    setPolling(state, action: PayloadAction<boolean>) {
      state.isPolling = action.payload;
    },
  },
});

export const { setActiveBooking, clearActiveBooking, setPolling } = bookingSlice.actions;
export const bookingReducer = bookingSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectActiveBooking = (state: RootState) => state.booking.activeBooking;
export const selectIsPolling = (state: RootState) => state.booking.isPolling;
