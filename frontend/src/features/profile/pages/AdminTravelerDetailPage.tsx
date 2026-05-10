import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  Divider,
  Grid,
  Typography,
} from '@mui/material';
import { useGetTravelerByIdQuery, useGetTravelerPreferencesQuery } from '../travelerApi';
import { Skeleton, Alert, Button } from '../../../common/components';
import { ROUTES } from '../../../routes/routes.config';

function LabeledValue({ label, value }: { label: string; value: string | boolean | null | undefined }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
      </Typography>
    </Box>
  );
}

export function AdminTravelerDetailPage(): React.ReactElement {
  const { travelerId } = useParams<{ travelerId: string }>();
  const navigate = useNavigate();

  const id = travelerId ?? '';

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useGetTravelerByIdQuery(id, { skip: !id });

  const {
    data: preferences,
    isLoading: prefsLoading,
  } = useGetTravelerPreferencesQuery(id, { skip: !id });

  if (profileLoading || prefsLoading) {
    return (
      <Box data-testid="admin-traveler-detail-loading" sx={{ maxWidth: 800, mx: 'auto' }}>
        <Skeleton height={40} />
        <Skeleton height={200} />
      </Box>
    );
  }

  if (profileError || !profile) {
    return (
      <Box data-testid="admin-traveler-detail-error" sx={{ maxWidth: 800, mx: 'auto' }}>
        <Alert severity="error" message="Could not load traveler details." />
        <Button
          variant="secondary"
          onClick={() => navigate(ROUTES.ADMIN_TRAVELERS)}
          sx={{ mt: 2 }}
        >
          Back to Travelers
        </Button>
      </Box>
    );
  }

  return (
    <Box data-testid="admin-traveler-detail" sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          variant="secondary"
          onClick={() => navigate(ROUTES.ADMIN_TRAVELERS)}
        >
          ← Back
        </Button>
        <Typography variant="h5" fontWeight={700}>{profile.fullName}</Typography>
        <Chip
          label={profile.active ? 'Active' : 'Inactive'}
          color={profile.active ? 'success' : 'default'}
          size="small"
        />
      </Box>

      {/* Profile details */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Profile
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <LabeledValue label="Employee ID" value={profile.employeeId} />
          <LabeledValue label="Email" value={profile.email} />
          <LabeledValue label="Department" value={profile.department} />
          <LabeledValue label="Job Title" value={profile.jobTitle} />
          <LabeledValue label="Level" value={profile.level} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <LabeledValue label="Cost Center" value={profile.costCenter} />
          <LabeledValue label="Manager" value={profile.manager?.name} />
          <LabeledValue label="Approval Required" value={profile.approvalRequired} />
          <LabeledValue label="Hire Date" value={profile.hireDate} />
          <LabeledValue label="Last HR Sync" value={profile.lastSyncedAt} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Preferences */}
      {preferences && (
        <>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Travel Preferences
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <LabeledValue label="Seat Preference" value={preferences.seatPreference as string | undefined} />
              <LabeledValue label="Meal Preference" value={preferences.mealPreference as string | undefined} />
              <LabeledValue label="Special Requests" value={preferences.specialRequests} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LabeledValue
                label="Email Notifications"
                value={preferences.notifications?.email}
              />
              <LabeledValue
                label="SMS Notifications"
                value={preferences.notifications?.sms}
              />
            </Grid>
          </Grid>

          {preferences.frequentFlyerNumbers && preferences.frequentFlyerNumbers.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Frequent Flyer Numbers
              </Typography>
              {preferences.frequentFlyerNumbers.map((ffn) => (
                <Chip
                  key={ffn.airline}
                  label={`${ffn.airline}: ${ffn.number}`}
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
