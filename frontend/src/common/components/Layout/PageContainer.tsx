import React from 'react';
import { Box, Typography } from '@mui/material';

interface PageContainerProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageContainer({ title, actions, children }: PageContainerProps): React.ReactElement {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        {actions && <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>}
      </Box>
      {children}
    </Box>
  );
}
