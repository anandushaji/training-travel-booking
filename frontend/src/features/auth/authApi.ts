import { baseApi } from '../../api/baseApi';
import type { LoginRequest, RefreshRequest, LogoutRequest, TokenPairResponse } from './auth.types';

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<TokenPairResponse, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
    }),
    refresh: build.mutation<TokenPairResponse, RefreshRequest>({
      query: (body) => ({
        url: '/auth/refresh',
        method: 'POST',
        body,
      }),
    }),
    logoutApi: build.mutation<void, LogoutRequest>({
      query: (body) => ({
        url: '/auth/logout',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useLoginMutation, useRefreshMutation, useLogoutApiMutation } = authApi;
