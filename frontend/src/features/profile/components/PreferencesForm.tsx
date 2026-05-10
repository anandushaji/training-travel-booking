import React from 'react';
import { Box, Typography, Checkbox, FormControlLabel, List, ListItem, ListItemText } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { TextInput, SelectInput, Button, Alert } from '../../../common/components';
import { useUpdateTravelerPreferencesMutation } from '../travelerApi';
import type { TravelerPreferences, SeatPreference, MealPreference } from '../profile.types';

const SEAT_OPTIONS = [
  { value: 'WINDOW', label: 'Window' },
  { value: 'AISLE', label: 'Aisle' },
  { value: 'NO_PREFERENCE', label: 'No Preference' },
];

const MEAL_OPTIONS = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'KOSHER', label: 'Kosher' },
  { value: 'HALAL', label: 'Halal' },
  { value: 'GLUTEN_FREE', label: 'Gluten Free' },
];

interface PreferencesFormValues {
  seatPreference: SeatPreference | '';
  mealPreference: MealPreference | '';
  specialRequests: string;
  notifEmail: boolean;
  notifSms: boolean;
}

interface PreferencesFormProps {
  travelerId: string;
  preferences: TravelerPreferences;
}

export function PreferencesForm({
  travelerId,
  preferences,
}: PreferencesFormProps): React.ReactElement {
  const [updatePrefs, { isLoading, isSuccess, isError, error }] =
    useUpdateTravelerPreferencesMutation();

  const { register, control, handleSubmit } = useForm<PreferencesFormValues>({
    defaultValues: {
      seatPreference: preferences.seatPreference ?? '',
      mealPreference: preferences.mealPreference ?? '',
      specialRequests: preferences.specialRequests ?? '',
      notifEmail: preferences.notifications?.email ?? true,
      notifSms: preferences.notifications?.sms ?? false,
    },
  });

  const onSubmit = async (values: PreferencesFormValues) => {
    await updatePrefs({
      id: travelerId,
      seatPreference: (values.seatPreference as SeatPreference) || undefined,
      mealPreference: (values.mealPreference as MealPreference) || undefined,
      specialRequests: values.specialRequests || undefined,
      notifications: {
        email: values.notifEmail,
        sms: values.notifSms,
      },
    });
  };

  return (
    <Box
      component="form"
      data-testid="preferences-form"
      onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}
    >
      <Controller
        name="seatPreference"
        control={control}
        render={({ field }) => (
          <SelectInput
            name={field.name}
            label="Seat Preference"
            options={SEAT_OPTIONS}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            data-testid="field-seatPreference"
          />
        )}
      />

      <Controller
        name="mealPreference"
        control={control}
        render={({ field }) => (
          <SelectInput
            name={field.name}
            label="Meal Preference"
            options={MEAL_OPTIONS}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            data-testid="field-mealPreference"
          />
        )}
      />

      <TextInput
        label="Special Requests"
        multiline
        rows={3}
        data-testid="field-specialRequests"
        {...register('specialRequests')}
      />

      {/* Frequent flyer — read-only */}
      {preferences.frequentFlyerNumbers && preferences.frequentFlyerNumbers.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>Frequent Flyer Numbers</Typography>
          <List dense>
            {preferences.frequentFlyerNumbers.map((ff, i) => (
              <ListItem key={i} disableGutters>
                <ListItemText primary={`${ff.airline}: ${ff.number}`} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Notification toggles */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>Notifications</Typography>
        <Controller
          name="notifEmail"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  {...field}
                  checked={field.value}
                  data-testid="field-notifEmail"
                />
              }
              label="Email notifications"
            />
          )}
        />
        <Controller
          name="notifSms"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  {...field}
                  checked={field.value}
                  data-testid="field-notifSms"
                />
              }
              label="SMS notifications"
            />
          )}
        />
      </Box>

      {isSuccess && (
        <Alert severity="success" message="Preferences updated successfully." data-testid="prefs-success" />
      )}
      {isError && (
        <Alert
          severity="error"
          message={
            (error as { data?: { message?: string } })?.data?.message ??
            'Failed to update preferences. Please try again.'
          }
          data-testid="prefs-error"
        />
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={isLoading}
        data-testid="prefs-submit"
      >
        {isLoading ? 'Saving…' : 'Save Preferences'}
      </Button>
    </Box>
  );
}
