import React from 'react';
import { Box, Typography, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Divider } from '@mui/material';
import { useSelector } from 'react-redux';
import { Button, Alert, Spinner } from '../../../common/components';
import { selectSelectedOffer, selectLastCabinClass } from '../../search/searchSlice';
import { selectUser } from '../../auth/authSlice';
import { useBooking } from '../hooks/useBooking';
import type { PaymentMethod } from '../booking.types';
import { Controller, useForm } from 'react-hook-form';

interface BookingFormValues {
  paymentMethod: PaymentMethod;
}

export function BookingForm(): React.ReactElement {
  const selectedOffer = useSelector(selectSelectedOffer);
  const cabinClass = useSelector(selectLastCabinClass);
  const user = useSelector(selectUser);
  const { submit, isSubmitting, error } = useBooking();

  const { control, handleSubmit } = useForm<BookingFormValues>({
    defaultValues: { paymentMethod: 'CORPORATE_CARD' },
  });

  const onSubmit = async (values: BookingFormValues) => {
    if (!selectedOffer || !user) return;
    await submit({
      travelerId: user.id,
      flightOfferId: selectedOffer.id,
      itinerary: {
        origin: selectedOffer.origin,
        destination: selectedOffer.destination,
        departureDate: selectedOffer.departureTime.split('T')[0],
        cabinClass: cabinClass,
        passengers: 1,
      },
      paymentMethod: values.paymentMethod,
    });
  };

  return (
    <Box
      component="form"
      data-testid="booking-form"
      onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
      sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
    >
      {/* Offer summary */}
      {selectedOffer && (
        <Box data-testid="offer-summary">
          <Typography variant="h6" gutterBottom>Flight Details</Typography>
          <Typography variant="body2">
            {selectedOffer.airline} · {selectedOffer.origin} → {selectedOffer.destination}
          </Typography>
          <Typography variant="body2">
            Departure: {selectedOffer.departureTime}
          </Typography>
          <Typography variant="body2">
            Price: {selectedOffer.price.currency} {selectedOffer.price.amount}
          </Typography>
        </Box>
      )}

      <Divider />

      {/* Traveler info (read-only) */}
      {user && (
        <Box data-testid="traveler-info">
          <Typography variant="subtitle2" gutterBottom>Traveler</Typography>
          <Typography variant="body2">Email: {user.email}</Typography>
        </Box>
      )}

      <Divider />

      {/* Payment method */}
      <FormControl component="fieldset">
        <FormLabel component="legend">Payment Method</FormLabel>
        <Controller
          name="paymentMethod"
          control={control}
          render={({ field }) => (
            <RadioGroup
              {...field}
              data-testid="payment-method-group"
              aria-label="payment method"
            >
              <FormControlLabel value="CORPORATE_CARD" control={<Radio />} label="Corporate Card" />
              <FormControlLabel value="PERSONAL_CARD" control={<Radio />} label="Personal Card" />
              <FormControlLabel value="INVOICE" control={<Radio />} label="Invoice" />
            </RadioGroup>
          )}
        />
      </FormControl>

      {error && <Alert severity="error" message={error} data-testid="booking-error" />}

      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting || !selectedOffer}
        data-testid="confirm-booking-button"
      >
        {isSubmitting ? <Spinner size={20} /> : 'Confirm Booking'}
      </Button>
    </Box>
  );
}
