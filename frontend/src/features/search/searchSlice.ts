import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/rootReducer';
import type { SearchState, SearchFilters, FlightOffer } from './search.types';

const initialState: SearchState = {
  filters: {
    sortBy: 'price',
    maxPrice: null,
  },
  selectedOffer: null,
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<SearchFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSelectedOffer(state, action: PayloadAction<FlightOffer>) {
      state.selectedOffer = action.payload;
    },
    clearSelectedOffer(state) {
      state.selectedOffer = null;
    },
  },
});

export const { setFilters, setSelectedOffer, clearSelectedOffer } = searchSlice.actions;
export const searchReducer = searchSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectFilters = (state: RootState) => state.search.filters;
export const selectSelectedOffer = (state: RootState) => state.search.selectedOffer;
