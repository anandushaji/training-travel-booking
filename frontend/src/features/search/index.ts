// ─── Page ─────────────────────────────────────────────────────────────────────
export { SearchPage } from './pages/SearchPage';

// ─── Redux slice ──────────────────────────────────────────────────────────────
export {
  searchReducer,
  setFilters,
  setSelectedOffer,
  clearSelectedOffer,
  selectFilters,
  selectSelectedOffer,
} from './searchSlice';

// ─── API ──────────────────────────────────────────────────────────────────────
export { flightApi } from './flightApi';

// ─── Hook ─────────────────────────────────────────────────────────────────────
export { useFlightSearch } from './hooks/useFlightSearch';
