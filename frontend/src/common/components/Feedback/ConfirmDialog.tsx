import React from 'react';
import { Button, DialogContentText } from '@mui/material';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'error' | 'warning';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'primary',
}: ConfirmDialogProps): React.ReactElement {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="xs"
      actions={
        <>
          <Button onClick={onClose} variant="outlined">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} variant="contained" color={confirmColor}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <DialogContentText>{message}</DialogContentText>
    </Modal>
  );
}
