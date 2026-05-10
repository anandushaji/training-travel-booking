import React from 'react';
import { Chip, ChipProps } from '@mui/material';

export type StatusColor = ChipProps['color'];

export interface StatusBadgeProps {
  status: string;
  statusColorMap: Record<string, StatusColor>;
  label?: string;
}

export function StatusBadge({ status, statusColorMap, label }: StatusBadgeProps): React.ReactElement {
  const color = statusColorMap[status] ?? 'default';
  return <Chip label={label ?? status} color={color} size="small" />;
}
