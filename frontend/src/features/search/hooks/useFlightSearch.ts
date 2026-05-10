import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '../../../common/hooks/useDebounce';
import { useLazySearchFlightsQuery } from '../flightApi';
import { useAppDispatch } from '../../../app/hooks';
import { setCabinClass } from '../searchSlice';
import type { SearchParams, FlightOffer } from '../search.types';

export interface UseFlightSearchResult {
  trigger: (params: SearchParams) => void;
  retry: () => void;
  offers: FlightOffer[];
  isLoading: boolean;
  isError: boolean;
  searchId: string | null;
}

export function useFlightSearch(): UseFlightSearchResult {
  const dispatch = useAppDispatch();
  const [pendingParams, setPendingParams] = useState<SearchParams | null>(null);
  const [lastParams, setLastParams] = useState<SearchParams | null>(null);
  const debouncedParams = useDebounce(pendingParams, 400);

  const [triggerSearch, { data, isLoading, isError }] = useLazySearchFlightsQuery();

  useEffect(() => {
    if (debouncedParams !== null) {
      void triggerSearch(debouncedParams);
    }
  }, [debouncedParams, triggerSearch]);

  const trigger = useCallback((params: SearchParams) => {
    // Persist the cabin class so BookingForm can read it after navigation
    dispatch(setCabinClass(params.cabinClass ?? 'ECONOMY'));
    setPendingParams(params);
    setLastParams(params);
  }, [dispatch]);

  const retry = useCallback(() => {
    if (lastParams !== null) {
      // Create a new object reference so the debounce detects a change
      setPendingParams({ ...lastParams });
    }
  }, [lastParams]);

  return {
    trigger,
    retry,
    offers: data?.offers ?? [],
    isLoading,
    isError,
    searchId: data?.meta?.searchId ?? null,
  };
}
