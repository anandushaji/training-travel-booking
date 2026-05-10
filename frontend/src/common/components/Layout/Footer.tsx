import React from 'react';
import { Box, Typography } from '@mui/material';

export function Footer(): React.ReactElement {
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 3,
        mt: 'auto',
        backgroundColor: (t) => t.palette.background.paper,
        borderTop: '1px solid',
        borderColor: 'divider',
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {new Date().getFullYear()} Corporate Travel Portal. All rights reserved.
      </Typography>
    </Box>
  );
}
