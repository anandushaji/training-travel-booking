import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Tabs, Tab, Link } from '@mui/material';
import { selectUser, logout } from '../../auth/authSlice';
import { useGetTravelerByIdQuery, useGetTravelerPreferencesQuery, useDeleteTravelerMutation } from '../travelerApi';
import { ProfileForm } from '../components/ProfileForm';
import { PreferencesForm } from '../components/PreferencesForm';
import { Button, ConfirmDialog, Skeleton } from '../../../common/components';
import { ROUTES } from '../../../routes/routes.config';
import type { AppDispatch } from '../../../app/store';

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, index, value }: TabPanelProps): React.ReactElement {
  return (
    <Box role="tabpanel" hidden={value !== index}>
      {value === index && children}
    </Box>
  );
}

export function ProfilePage(): React.ReactElement {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector(selectUser);

  const travelerId = user?.id ?? '';

  const { data: profile, isLoading: profileLoading } = useGetTravelerByIdQuery(travelerId, {
    skip: !travelerId,
  });
  const { data: preferences, isLoading: prefsLoading } = useGetTravelerPreferencesQuery(travelerId, {
    skip: !travelerId,
  });

  const [deleteTraveler, { isLoading: isDeleting }] = useDeleteTravelerMutation();

  const [tabIndex, setTabIndex] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleDeleteConfirm = async () => {
    setDeleted(true);
    setDeleteDialogOpen(false);
    await deleteTraveler(travelerId);
    dispatch(logout());
    void navigate(ROUTES.LOGIN);
  };

  if (profileLoading || prefsLoading) {
    return (
      <Box data-testid="profile-page" sx={{ p: 3 }}>
        <Skeleton height={40} />
        <Skeleton height={200} />
      </Box>
    );
  }

  return (
    <Box data-testid="profile-page" sx={{ maxWidth: 720, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>My Profile</Typography>

      <Tabs
        value={tabIndex}
        onChange={(_, v: number) => setTabIndex(v)}
        sx={{ mb: 2 }}
      >
        <Tab label="Profile" data-testid="tab-profile" />
        <Tab label="Preferences" data-testid="tab-preferences" />
      </Tabs>

      <TabPanel value={tabIndex} index={0}>
        {profile && <ProfileForm profile={profile} />}
      </TabPanel>

      <TabPanel value={tabIndex} index={1}>
        {preferences && (
          <PreferencesForm travelerId={travelerId} preferences={preferences} />
        )}
      </TabPanel>

      {/* GDPR controls */}
      <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" gutterBottom>Data &amp; Privacy</Typography>
        <Link
          href={`/api/travelers/${travelerId}/export`}
          download
          data-testid="gdpr-export-link"
          sx={{ display: 'block', mb: 2 }}
        >
          Download my data (GDPR export)
        </Link>
        <Button
          variant="danger"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={isDeleting || deleted}
          data-testid="delete-account-button"
        >
          Delete My Account
        </Button>
      </Box>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? This action cannot be undone."
        confirmLabel="Yes, Delete My Account"
        cancelLabel="Cancel"
        confirmColor="error"
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => { void handleDeleteConfirm(); }}
      />
    </Box>
  );
}
