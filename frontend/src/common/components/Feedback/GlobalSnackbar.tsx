import React, { useEffect, useState } from 'react';
import { Snackbar, Fade } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../app/rootReducer';
import { removeNotification } from '../../../features/notifications/notificationSlice';
import { Alert } from './Alert';

const AUTO_HIDE_DURATION = 4000;

export function GlobalSnackbar(): React.ReactElement {
  const dispatch = useDispatch();
  const queue = useSelector((state: RootState) => state.notifications.queue);
  const current = queue[0];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (current) {
      setOpen(true);
    }
  }, [current?.id]);

  const handleClose = (_: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  const handleExited = () => {
    if (current) {
      dispatch(removeNotification(current.id));
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={AUTO_HIDE_DURATION}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      // Use Fade instead of default Grow to avoid reflow(null) crash in jsdom
      TransitionComponent={Fade as React.ComponentType<{ children?: React.ReactElement<unknown> }>}
      TransitionProps={{ onExited: handleExited }}
    >
      {current ? (
        <Alert
          message={current.message}
          severity={current.severity}
          onClose={handleClose}
        />
      ) : (
        <span />
      )}
    </Snackbar>
  );
}
