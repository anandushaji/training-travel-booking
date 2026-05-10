import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { baseApi } from '../../../api/baseApi';
import { authReducer } from '../../auth/authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { searchReducer } from '../searchSlice';
import { AirportInput } from './AirportInput';
import { theme } from '../../../theme/theme';

function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      notifications: notificationsReducer,
      auth: authReducer,
      search: searchReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

function renderAirportInput(onChange = vi.fn(), value = '') {
  const store = makeStore();
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <AirportInput
          name="origin"
          label="Origin"
          aria-label="Origin airport"
          value={value}
          onChange={onChange}
        />
      </ThemeProvider>
    </Provider>,
  );
  return { store, onChange };
}

describe('AirportInput', () => {
  it('REQ-SEARCH-05-S01: no airport API request for 1-character input', async () => {
    let requestMade = false;
    server.use(
      http.get('http://localhost/api/inventory/airports/search', () => {
        requestMade = true;
        return HttpResponse.json([]);
      }),
    );

    renderAirportInput();
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'J');

    // Wait a tick to confirm no request fires
    await new Promise((r) => setTimeout(r, 100));
    expect(requestMade).toBe(false);
  });

  it('REQ-SEARCH-05-S02: shows options after 2-character input', async () => {
    renderAirportInput();
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'JF');

    await waitFor(
      () => {
        const option = screen.queryByRole('option');
        expect(option).not.toBeNull();
        expect(option!.textContent).toMatch(/JFK/);
      },
      { timeout: 5000 },
    );
  });

  it('REQ-SEARCH-05-S03: calls onChange with IATA code on option selection', async () => {
    const mockOnChange = vi.fn();
    renderAirportInput(mockOnChange);
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'JF');

    await waitFor(
      () => {
        expect(screen.queryByRole('option')).not.toBeNull();
      },
      { timeout: 5000 },
    );

    await userEvent.click(screen.getAllByRole('option')[0]);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('JFK');
    });
  });

  it('REQ-SEARCH-05-S04: silently shows no options on 503 (no crash)', async () => {
    server.use(
      http.get('http://localhost/api/inventory/airports/search', () =>
        HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 }),
      ),
    );

    renderAirportInput();
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'JF');

    // Should not throw; dropdown either empty or shows "No options"
    await new Promise((r) => setTimeout(r, 500));
    const listbox = screen.queryByRole('listbox');
    if (listbox) {
      expect(listbox.querySelectorAll('[role="option"]').length).toBe(0);
    }
  });
});
