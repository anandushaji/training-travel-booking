import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer, {
  addNotification,
} from '../../../features/notifications/notificationSlice';
import { GlobalSnackbar } from './GlobalSnackbar';

function makeStore(preloaded?: { message: string; severity: 'success' | 'error' | 'info' | 'warning' }) {
  const store = configureStore({
    reducer: { notifications: notificationsReducer },
  });
  if (preloaded) {
    store.dispatch(addNotification(preloaded));
  }
  return store;
}

describe('GlobalSnackbar', () => {
  it('should render Snackbar when notification is queued', () => {
    const store = makeStore({ message: 'Saved!', severity: 'success' });
    render(
      <Provider store={store}>
        <GlobalSnackbar />
      </Provider>,
    );
    expect(screen.getByText('Saved!')).toBeDefined();
  });

  it('should not render content when queue is empty', () => {
    const store = makeStore();
    render(
      <Provider store={store}>
        <GlobalSnackbar />
      </Provider>,
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
