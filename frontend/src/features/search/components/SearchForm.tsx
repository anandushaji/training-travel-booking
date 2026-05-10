import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import dayjs from 'dayjs';
import {
  Button,
  DatePickerInput,
  SelectInput,
  NumberInput,
  type SelectOption,
} from '../../../common/components';
import { AirportInput } from './AirportInput';
import type { SearchParams, CabinClass } from '../search.types';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const cabinClassOptions: SelectOption[] = [
  { value: 'ECONOMY', label: 'Economy' },
  { value: 'PREMIUM_ECONOMY', label: 'Premium Economy' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'FIRST', label: 'First' },
];

const searchSchema = z
  .object({
    origin: z.string().min(1, 'Origin is required'),
    destination: z.string().min(1, 'Destination is required'),
    departureDate: z
      .string()
      .min(1, 'Departure date is required')
      .refine(
        (v) => !dayjs(v).startOf('day').isBefore(dayjs().startOf('day')),
        'Departure date cannot be in the past',
      ),
    returnDate: z.string().nullable().optional(),
    adults: z.coerce
      .number({ invalid_type_error: 'Adults must be a number' })
      .int()
      .min(1, 'At least 1 adult required')
      .max(9, 'Maximum 9 adults'),
    cabinClass: z
      .enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'])
      .optional(),
    nonStop: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (!data.returnDate) return true;
      return dayjs(data.returnDate).isAfter(dayjs(data.departureDate));
    },
    { message: 'Return date must be after departure date', path: ['returnDate'] },
  );

type SearchFormValues = z.infer<typeof searchSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  defaultValues?: Partial<SearchFormValues>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SearchForm({ onSearch, defaultValues }: SearchFormProps): React.ReactElement {
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      origin: '',
      destination: '',
      departureDate: '',
      returnDate: null,
      adults: 1,
      cabinClass: 'ECONOMY',
      nonStop: false,
      ...defaultValues,
    },
  });

  function onSubmit(values: SearchFormValues) {
    const params: SearchParams = {
      origin: values.origin,
      destination: values.destination,
      departureDate: values.departureDate,
      adults: values.adults,
    };
    if (values.returnDate) params.returnDate = values.returnDate;
    if (values.cabinClass) params.cabinClass = values.cabinClass as CabinClass;
    if (values.nonStop !== undefined) params.nonStop = values.nonStop;
    onSearch(params);
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Grid container spacing={2}>
        {/* Origin */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="origin"
            control={control}
            render={({ field }) => (
              <AirportInput
                name="origin"
                label="Origin"
                aria-label="Origin airport"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.origin?.message}
              />
            )}
          />
        </Grid>

        {/* Destination */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="destination"
            control={control}
            render={({ field }) => (
              <AirportInput
                name="destination"
                label="Destination"
                aria-label="Destination airport"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.destination?.message}
              />
            )}
          />
        </Grid>

        {/* Departure date */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="departureDate"
            control={control}
            render={({ field }) => (
              <DatePickerInput
                name="departureDate"
                label="Departure Date"
                value={field.value ?? null}
                onChange={field.onChange}
                error={errors.departureDate?.message}
              />
            )}
          />
        </Grid>

        {/* Return date */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="returnDate"
            control={control}
            render={({ field }) => (
              <DatePickerInput
                name="returnDate"
                label="Return Date (optional)"
                value={field.value ?? null}
                onChange={field.onChange}
                error={errors.returnDate?.message}
              />
            )}
          />
        </Grid>

        {/* Adults */}
        <Grid item xs={12} sm={4}>
          <Controller
            name="adults"
            control={control}
            render={({ field }) => (
              <NumberInput
                name={field.name}
                onChange={field.onChange}
                onBlur={field.onBlur}
                value={String(field.value ?? 1)}
                label="Adults"
                min={1}
                max={9}
                error={!!errors.adults}
                {...(errors.adults?.message ? { helperText: errors.adults.message } : {})}
              />
            )}
          />
        </Grid>

        {/* Cabin class */}
        <Grid item xs={12} sm={4}>
          <Controller
            name="cabinClass"
            control={control}
            render={({ field }) => (
              <SelectInput
                name="cabinClass"
                label="Cabin Class"
                options={cabinClassOptions}
                value={field.value ?? 'ECONOMY'}
                onChange={field.onChange}
                error={errors.cabinClass?.message}
              />
            )}
          />
        </Grid>

        {/* Non-stop */}
        <Grid item xs={12} sm={4}>
          <Controller
            name="nonStop"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                label="Non-stop only"
                control={
                  <Switch
                    checked={field.value ?? false}
                    onChange={(e) => field.onChange(e.target.checked)}
                    inputProps={{ 'aria-label': 'Non-stop only' }}
                  />
                }
              />
            )}
          />
        </Grid>

        {/* Submit */}
        <Grid item xs={12}>
          <Button type="submit" variant="primary">
            Search Flights
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
