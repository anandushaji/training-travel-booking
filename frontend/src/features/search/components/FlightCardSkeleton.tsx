import React from 'react';
import Box from '@mui/material/Box';
import MuiSkeleton from '@mui/material/Skeleton';

export function FlightCardSkeleton(): React.ReactElement {
  return (
    <Box
      data-testid="flight-card-skeleton"
      sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}
    >
      <Box display="flex" justifyContent="space-between">
        <Box flex={1}>
          <MuiSkeleton variant="text" width="40%" height={24} />
          <MuiSkeleton variant="text" width="60%" height={20} />
          <MuiSkeleton variant="text" width="50%" height={20} />
          <MuiSkeleton variant="text" width="45%" height={20} />
        </Box>
        <Box width={120} ml={2}>
          <MuiSkeleton variant="text" width="100%" height={32} />
          <MuiSkeleton variant="rectangular" width="100%" height={24} />
          <MuiSkeleton variant="rectangular" width="100%" height={32} sx={{ mt: 1 }} />
        </Box>
      </Box>
    </Box>
  );
}
