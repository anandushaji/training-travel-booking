import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Typography,
} from '@mui/material';
import FlightIcon from '@mui/icons-material/Flight';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../auth/authSlice';
import { ROUTES } from '../../routes/routes.config';
import type { UserRole } from '../auth/auth.types';

interface QuickAction {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  color: string;
  roles?: UserRole[];
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: 'Search Flights',
    description: 'Find and book flights for your next trip',
    path: ROUTES.SEARCH,
    icon: <FlightIcon sx={{ fontSize: 40 }} />,
    color: '#1976d2',
  },
  {
    title: 'My Bookings',
    description: 'View and manage your travel bookings',
    path: ROUTES.BOOKINGS_LIST,
    icon: <BookOnlineIcon sx={{ fontSize: 40 }} />,
    color: '#388e3c',
  },
  {
    title: 'My Expenses',
    description: 'Track receipts and expense reports',
    path: ROUTES.EXPENSES,
    icon: <ReceiptLongIcon sx={{ fontSize: 40 }} />,
    color: '#f57c00',
  },
  {
    title: 'My Profile',
    description: 'Update your travel preferences and details',
    path: ROUTES.PROFILE,
    icon: <PersonIcon sx={{ fontSize: 40 }} />,
    color: '#7b1fa2',
  },
  {
    title: 'Admin Panel',
    description: 'Manage travelers and system settings',
    path: ROUTES.ADMIN_TRAVELERS,
    icon: <AdminPanelSettingsIcon sx={{ fontSize: 40 }} />,
    color: '#c62828',
    roles: ['ADMIN'],
  },
];

const ROLE_LABEL: Record<UserRole, string> = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  ADMIN: 'Administrator',
};

const ROLE_COLOR: Record<UserRole, 'default' | 'primary' | 'error'> = {
  EMPLOYEE: 'default',
  MANAGER: 'primary',
  ADMIN: 'error',
};

export function DashboardPage(): React.ReactElement {
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  const visibleActions = QUICK_ACTIONS.filter(
    (a) => !a.roles || (user?.role && a.roles.includes(user.role)),
  );

  return (
    <Box data-testid="dashboard-page">
      {/* Welcome banner */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="h4" component="h1" fontWeight={700}>
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
          </Typography>
          {user?.role && (
            <Chip
              label={ROLE_LABEL[user.role]}
              color={ROLE_COLOR[user.role]}
              size="small"
            />
          )}
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          What would you like to do today?
        </Typography>
      </Box>

      {/* Quick-action cards */}
      <Grid container spacing={3}>
        {visibleActions.map((action) => (
          <Grid item xs={12} sm={6} md={4} key={action.path}>
            <Card
              elevation={2}
              sx={{
                height: '100%',
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
              }}
            >
              <CardActionArea
                onClick={() => navigate(action.path)}
                sx={{ height: '100%', p: 1 }}
              >
                <CardContent>
                  <Box
                    sx={{
                      color: action.color,
                      mb: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {action.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
