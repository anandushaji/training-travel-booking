import React from 'react';
import { Alert as MuiAlert, AlertProps as MuiAlertProps } from '@mui/material';

export interface AlertProps extends Omit<MuiAlertProps, 'children'> {
  message: string;
}

// forwardRef so MUI's Fade/Snackbar transition can obtain a ref to the DOM node
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { message, ...rest },
  ref,
) {
  return (
    <MuiAlert ref={ref} {...rest}>
      {message}
    </MuiAlert>
  );
});
