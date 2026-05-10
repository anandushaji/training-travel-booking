import React from 'react';
import { Typography, TypographyProps } from '@mui/material';

export interface CurrencyDisplayProps extends Omit<TypographyProps, 'children'> {
  amount: number;
  currency: string;
  locale?: string;
}

export function CurrencyDisplay({
  amount,
  currency,
  locale = 'en-US',
  ...rest
}: CurrencyDisplayProps): React.ReactElement {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <Typography component="span" {...rest}>
      {formatted}
    </Typography>
  );
}
