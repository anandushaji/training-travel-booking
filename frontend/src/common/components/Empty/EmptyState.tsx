import React from 'react';
import { Box, Typography, SvgIconProps } from '@mui/material';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<SvgIconProps>;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps): React.ReactElement {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={4}
      gap={1}
    >
      {Icon && <Icon sx={{ fontSize: 48, color: 'text.disabled' }} />}
      <Typography variant="h6" fontWeight={700} color="text.secondary">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.disabled" textAlign="center">
          {description}
        </Typography>
      )}
      {action && <Box mt={1}>{action}</Box>}
    </Box>
  );
}
