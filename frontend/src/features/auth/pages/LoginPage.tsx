import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Paper, Typography } from '@mui/material';
import { LoginForm } from '../components/LoginForm';

export function LoginPage(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const handleSuccess = (): void => {
    navigate(from, { replace: true });
  };

  return (
    <Box
      data-testid="login-page"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, sm: 5 },
          width: '100%',
          maxWidth: 440,
        }}
      >
        {/* Logo / branding */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h5" component="h1" fontWeight={700} color="primary">
            Corporate Travel Portal
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Sign in to manage your travel
          </Typography>
        </Box>

        <LoginForm onSuccess={handleSuccess} />
      </Paper>
    </Box>
  );
}
