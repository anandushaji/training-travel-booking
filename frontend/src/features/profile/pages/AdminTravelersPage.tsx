import React from 'react';
import { Box, Typography } from '@mui/material';
import { TravelerTable } from '../components/TravelerTable';

export function AdminTravelersPage(): React.ReactElement {
  return (
    <Box data-testid="admin-travelers-page" sx={{ maxWidth: 960, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>Traveler Administration</Typography>
      <TravelerTable />
    </Box>
  );
}
