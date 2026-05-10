import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { store } from './store';
import { theme } from '../theme/theme';
import { GlobalSnackbar } from '../common/components/Feedback/GlobalSnackbar';
import { AppRoutes } from '../routes/AppRoutes';

function App(): React.ReactElement {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AppRoutes />
          <GlobalSnackbar />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
