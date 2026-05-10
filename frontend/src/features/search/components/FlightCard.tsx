import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../../app/hooks';
import { Button, Card } from '../../../common/components';
import { setSelectedOffer } from '../searchSlice';
import { PolicyBadge } from './PolicyBadge';
import type { FlightOffer } from '../search.types';

export interface FlightCardProps {
  offer: FlightOffer;
}

export function FlightCard({ offer }: FlightCardProps): React.ReactElement {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  function handleSelect() {
    dispatch(setSelectedOffer(offer));
    void navigate('/bookings/new');
  }

  return (
    <Card>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {offer.airline}
          </Typography>
          <Typography variant="body2">
            {offer.origin} &rarr; {offer.destination}
          </Typography>
          <Typography variant="body2">
            {offer.departureTime} &ndash; {offer.arrivalTime}
          </Typography>
          <Typography variant="body2">
            Stops: {offer.stops} &bull; Duration: {offer.duration}
          </Typography>
        </Box>
        <Box textAlign="right">
          <Typography variant="h6">
            {offer.price.currency} {offer.price.amount}
          </Typography>
          <PolicyBadge
            offerId={offer.id}
            amount={offer.price.amount}
            currency={offer.price.currency}
          />
          <Box mt={1}>
            <Button variant="primary" size="small" onClick={handleSelect}>
              Select
            </Button>
          </Box>
        </Box>
      </Box>
    </Card>
  );
}
