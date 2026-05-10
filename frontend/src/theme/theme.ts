import { createTheme } from '@mui/material/styles';
import { overrides } from './overrides';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1E3A5F',
      light: '#2C5282',
      dark: '#132940',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2D6A9F',
      light: '#4A90C4',
      dark: '#1A4F7A',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#D32F2F',
    },
    warning: {
      main: '#F57C00',
    },
    success: {
      main: '#388E3C',
    },
    info: {
      main: '#0288D1',
    },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2rem', fontWeight: 700 },
    h2: { fontSize: '1.75rem', fontWeight: 600 },
    h3: { fontSize: '1.5rem', fontWeight: 600 },
    h4: { fontSize: '1.25rem', fontWeight: 600 },
    h5: { fontSize: '1.1rem', fontWeight: 600 },
    h6: { fontSize: '1rem', fontWeight: 600 },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.8125rem' },
  },
  spacing: 8,
  shape: {
    borderRadius: 4,
  },
  components: overrides,
});
