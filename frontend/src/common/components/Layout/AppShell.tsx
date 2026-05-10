import React, { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import FlightIcon from '@mui/icons-material/Flight';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useSelector } from 'react-redux';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import type { NavItem } from './Sidebar';
import { selectUser } from '../../../features/auth/authSlice';
import { ROUTES } from '../../../routes/routes.config';

const BASE_NAV: NavItem[] = [
  { label: 'Dashboard',      path: ROUTES.DASHBOARD,    icon: DashboardIcon },
  { label: 'Search Flights', path: ROUTES.SEARCH,        icon: FlightIcon },
  { label: 'My Bookings',    path: ROUTES.BOOKINGS_LIST, icon: BookOnlineIcon },
  { label: 'My Expenses',    path: ROUTES.EXPENSES,      icon: ReceiptLongIcon },
  { label: 'My Profile',     path: ROUTES.PROFILE,       icon: PersonIcon },
];

const ADMIN_NAV: NavItem[] = [
  ...BASE_NAV,
  { label: 'Admin Panel', path: ROUTES.ADMIN_TRAVELERS, icon: AdminPanelSettingsIcon },
];

export function AppShell(): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useSelector(selectUser);
  const navItems = user?.role === 'ADMIN' ? ADMIN_NAV : BASE_NAV;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header onMenuToggle={() => setSidebarOpen(true)} />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navItems={navItems}
      />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {/* Spacer that matches the fixed AppBar height */}
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
