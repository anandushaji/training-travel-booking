import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { ROUTES } from './routes.config';
import { LoginPage } from '../features/auth';
import { SearchPage } from '../features/search';
import {
  BookingPage,
  BookingConfirmationPage,
  BookingListPage,
  BookingDetailsPage,
} from '../features/booking';
import { ProfilePage, AdminTravelersPage } from '../features/profile';
import { ExpenseListPage, ReceiptPage } from '../features/expenses';
import { RoleGuard } from '../features/auth/components/RoleGuard';
import { AppShell } from '../common/components/Layout/AppShell';
import { DashboardPage } from '../features/dashboard/DashboardPage';

export function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      {/* Public */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />

      {/* Protected — wrapped in AppShell (Header + Sidebar) */}
      <Route element={<PrivateRoute />}>
        <Route element={<AppShell />}>
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.SEARCH} element={<SearchPage />} />
          <Route path={ROUTES.BOOKINGS_NEW} element={<BookingPage />} />
          <Route path={ROUTES.BOOKING_CONFIRMATION} element={<BookingConfirmationPage />} />
          <Route path={ROUTES.BOOKINGS_LIST} element={<BookingListPage />} />
          <Route path={ROUTES.BOOKING_DETAIL} element={<BookingDetailsPage />} />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          <Route
            path={ROUTES.ADMIN_TRAVELERS}
            element={
              <RoleGuard requiredRole="ADMIN">
                <AdminTravelersPage />
              </RoleGuard>
            }
          />
          <Route path={ROUTES.EXPENSES} element={<ExpenseListPage />} />
          <Route path={ROUTES.RECEIPT_DETAIL} element={<ReceiptPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
