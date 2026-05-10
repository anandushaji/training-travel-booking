import React from 'react';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  CircularProgress,
  Tooltip,
  IconButton as MuiIconButton,
  IconButtonProps as MuiIconButtonProps,
  SvgIconProps,
} from '@mui/material';
import { LoadingButton as MuiLoadingButton, LoadingButtonProps } from '@mui/lab';

// ─── Button ──────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'color'> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: React.ReactNode;
}

function variantToMui(v: ButtonVariant): {
  variant: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'error';
} {
  switch (v) {
    case 'primary':
      return { variant: 'contained', color: 'primary' };
    case 'secondary':
      return { variant: 'outlined', color: 'primary' };
    case 'danger':
      return { variant: 'contained', color: 'error' };
    case 'ghost':
      return { variant: 'text' };
  }
}

export function Button({
  variant = 'primary',
  loading,
  icon,
  children,
  ...rest
}: ButtonProps): React.ReactElement {
  const { variant: muiVariant, color } = variantToMui(variant);
  const isDisabled = rest.disabled ?? loading;
  return (
    <MuiButton
      {...rest}
      variant={muiVariant}
      {...(color !== undefined ? { color } : {})}
      {...(isDisabled !== undefined ? { disabled: isDisabled } : {})}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : icon}
    >
      {children}
    </MuiButton>
  );
}

// ─── IconButton ──────────────────────────────────────────────────────────────

export interface IconButtonProps extends MuiIconButtonProps {
  icon: React.ComponentType<SvgIconProps>;
  tooltip: string;
}

export function IconButton({ icon: Icon, tooltip, ...rest }: IconButtonProps): React.ReactElement {
  return (
    <Tooltip title={tooltip}>
      <span>
        <MuiIconButton {...rest}>
          <Icon />
        </MuiIconButton>
      </span>
    </Tooltip>
  );
}

// ─── LoadingButton ────────────────────────────────────────────────────────────

export interface LoadingButtonComponentProps extends LoadingButtonProps {
  loading: boolean;
}

export function LoadingButton({
  loading,
  children,
  ...rest
}: LoadingButtonComponentProps): React.ReactElement {
  return (
    <MuiLoadingButton loading={loading} {...rest}>
      {children}
    </MuiLoadingButton>
  );
}
