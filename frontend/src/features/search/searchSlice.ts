import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/rootReducer';
import type { SearchState, SearchFilters, FlightOffer, CabinClass } from './search.types';

const initialState: SearchState = {
  filters: {
    sortBy: 'price',
    maxPrice: null,
  },
  selectedOffer: null,
  lastCabinClass: 'ECONOMY',
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
    setCabinClass(state, action: PayloadAction<CabinClass>) {
      state.lastCabinClass = action.payload;
    },
  },
});

export const { setFilters, setSelectedOffer, clearSelectedOffer, setCabinClass } = searchSlice.actions;
export const searchReducer = searchSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectFilters = (state: RootState) => state.search.filters;
export const selectSelectedOffer = (state: RootState) => state.search.selectedOffer;
export const selectLastCabinClass = (state: RootState) => state.search.lastCabinClass;
