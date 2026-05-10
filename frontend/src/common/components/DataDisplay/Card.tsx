import React from 'react';
import {
  Card as MuiCard,
  CardContent,
  CardProps as MuiCardProps,
} from '@mui/material';

export interface CardProps extends MuiCardProps {
  children: React.ReactNode;
  padding?: number;
}

export function Card({ children, padding = 2, ...rest }: CardProps): React.ReactElement {
  return (
    <MuiCard elevation={1} {...rest}>
      <CardContent sx={{ p: padding, '&:last-child': { pb: padding } }}>
        {children}
      </CardContent>
    </MuiCard>
  );
}
