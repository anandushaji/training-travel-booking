import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useAppSelector } from '../../../app/hooks';
import { Button, Alert } from '../../../common/components';
import { selectFilters } from '../searchSlice';
import { FlightCard } from './FlightCard';
import { FlightCardSkeleton } from './FlightCardSkeleton';
import type { FlightOffer } from '../search.types';

export interface FlightResultsProps {
  offers: FlightOffer[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

const SKELETON_COUNT = 3;

function parseDurationMinutes(duration: string): number {
  const hoursMatch = duration.match(/(\d+)h/);
  const minsMatch = duration.match(/(\d+)m/);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
  return hours * 60 + mins;
}

export function FlightResults({
  offers,
  isLoading,
  isError,
  onRetry,
}: FlightResultsProps): React.ReactElement {
  const filters = useAppSelector(selectFilters);

  // Apply filter then sort
  const filteredAndSorted = [...offers]
    .filter(
      (offer) =>
        filters.maxPrice === null || offer.price.amount <= filters.maxPrice,
    )
    .sort((a, b) => {
      if (filters.sortBy === 'price') {
        return a.price.amount - b.price.amount;
      }
      return parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration);
    });

  return (
    <Box aria-live="polite">
      {/* Loading state */}
      {isLoading && (
        <Box>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <FlightCardSkeleton key={i} />
          ))}
        </Box>
      )}

      {/* Error state */}
      {!isLoading && isError && (
        <Box>
      <Alert severity="error" message="Failed to load flights. Please try again." />
          {onRetry && (
            <Box mt={1}>
              <Button variant="secondary" onClick={onRetry}>
                Try Again
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filteredAndSorted.length === 0 && (
        <Typography variant="body1" color="text.secondary" mt={2}>
          No flights found
        </Typography>
      )}

      {/* Results */}
      {!isLoading && !isError && filteredAndSorted.length > 0 && (
        <Box>
          {filteredAndSorted.map((offer) => (
            <FlightCard key={offer.id} offer={offer} />
          ))}
        </Box>
      )}
    </Box>
  );
}
