import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { baseApi } from '../../../api/baseApi';
import { authReducer } from '../../auth/authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { searchReducer } from '../searchSlice';
import { SearchForm } from './SearchForm';
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

interface RenderOptions {
  onSearch?: ReturnType<typeof vi.fn>;
  defaultValues?: Record<string, unknown>;
}

function renderSearchForm({ onSearch = vi.fn(), defaultValues }: RenderOptions = {}) {
  const store = makeStore();
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <SearchForm onSearch={onSearch} defaultValues={defaultValues as never} />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
  return { store, onSearch };
}

function clickSubmit() {
  fireEvent.click(screen.getByRole('button', { name: /search flights/i }));
}

describe('SearchForm', () => {
  it('REQ-SEARCH-FORM-S01: shows errors on empty submit', async () => {
    renderSearchForm();
    clickSubmit();
    await waitFor(() => {
      expect(screen.getByText('Origin is required')).toBeDefined();
      expect(screen.getByText('Destination is required')).toBeDefined();
      expect(screen.getByText('Departure date is required')).toBeDefined();
    });
  });

  it('REQ-SEARCH-FORM-S02: rejects adults below minimum (0)', async () => {
    renderSearchForm({ defaultValues: { adults: 0 } });
    clickSubmit();
    await waitFor(() => {
      expect(screen.getByText('At least 1 adult required')).toBeDefined();
    });
  });

  it('REQ-SEARCH-FORM-S03: rejects adults above maximum (10)', async () => {
    renderSearchForm({ defaultValues: { adults: 10 } });
    clickSubmit();
    await waitFor(() => {
      expect(screen.getByText('Maximum 9 adults')).toBeDefined();
    });
  });

  it('REQ-SEARCH-FORM-S04: rejects return date before departure date', async () => {
    renderSearchForm({
      defaultValues: {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2026-12-10',
        returnDate: '2026-12-05',
        adults: 1,
      },
    });
    clickSubmit();
    await waitFor(() => {
      expect(screen.getByText('Return date must be after departure date')).toBeDefined();
    });
  });

  it('REQ-SEARCH-FORM-S05: rejects past departure date', async () => {
    renderSearchForm({
      defaultValues: {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2020-01-01', // past
        adults: 1,
      },
    });
    clickSubmit();
    await waitFor(() => {
      expect(screen.getByText('Departure date cannot be in the past')).toBeDefined();
    });
  });

  it('REQ-SEARCH-FORM-S06: calls onSearch with correct params on valid input', async () => {
    const mockOnSearch = vi.fn();
    renderSearchForm({
      onSearch: mockOnSearch,
      defaultValues: {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2026-12-01',
        adults: 2,
        cabinClass: 'BUSINESS',
        nonStop: false,
      },
    });
    clickSubmit();
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
      const args = mockOnSearch.mock.calls[0][0];
      expect(args.origin).toBe('JFK');
      expect(args.destination).toBe('LAX');
      expect(args.departureDate).toBe('2026-12-01');
      expect(args.adults).toBe(2);
    });
  });

  it('REQ-SEARCH-FORM-S07: does not include returnDate when not set', async () => {
    const mockOnSearch = vi.fn();
    renderSearchForm({
      onSearch: mockOnSearch,
      defaultValues: {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2026-12-01',
        adults: 1,
      },
    });
    clickSubmit();
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
      const args = mockOnSearch.mock.calls[0][0];
      expect(args.returnDate).toBeUndefined();
    });
  });
});
