import React from 'react';
import {
  Card as MuiCard,
  CardActionArea,
  CardContent,
  CardProps as MuiCardProps,
} from '@mui/material';

export interface ClickableCardProps extends Omit<MuiCardProps, 'onClick'> {
  children: React.ReactNode;
  selected?: boolean;
  onClick: () => void;
  padding?: number;
}

export function ClickableCard({
  children,
  selected = false,
  onClick,
  padding = 2,
  ...rest
}: ClickableCardProps): React.ReactElement {
  return (
    <MuiCard
      elevation={1}
      {...rest}
      sx={{
        border: '2px solid',
        borderColor: selected ? 'primary.main' : 'transparent',
        cursor: 'pointer',
        ...rest.sx,
      }}
    >
      <CardActionArea onClick={onClick}>
        <CardContent sx={{ p: padding, '&:last-child': { pb: padding } }}>
          {children}
        </CardContent>
      </CardActionArea>
    </MuiCard>
  );
}
