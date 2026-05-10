import React, { useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useAppDispatch } from '../../../app/hooks';
import { ErrorBoundary } from '../../../common/components';
import { clearSelectedOffer } from '../searchSlice';
import { useFlightSearch } from '../hooks/useFlightSearch';
import { SearchForm } from '../components/SearchForm';
import { FlightResults } from '../components/FlightResults';

export function SearchPage(): React.ReactElement {
  const dispatch = useAppDispatch();
  const { trigger, retry, offers, isLoading, isError } = useFlightSearch();

  // Clear any previously selected offer when this page mounts
  useEffect(() => {
    dispatch(clearSelectedOffer());
  }, [dispatch]);

  return (
    <Box data-testid="search-page" p={3}>
      <Typography variant="h4" gutterBottom>
        Search Flights
      </Typography>
      <SearchForm onSearch={trigger} />
      <Box mt={3}>
        <ErrorBoundary>
          <FlightResults
            offers={offers}
            isLoading={isLoading}
            isError={isError}
            onRetry={retry}
          />
        </ErrorBoundary>
      </Box>
    </Box>
  );
}
