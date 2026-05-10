import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/rootReducer';
import { ROUTES } from './routes.config';

export function PrivateRoute(): React.ReactElement {
  const location = useLocation();
  const accessToken = useSelector((state: RootState) => {
    // auth slice is added in SM-FE-02; until then the key doesn't exist.
    // Casting via unknown is intentional — the key will be absent.
    const auth = (state as unknown as { auth?: { accessToken: string | null } }).auth;
    return auth?.accessToken ?? null;
  });

  if (!accessToken) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
