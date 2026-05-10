import { createApi } from '@reduxjs/toolkit/query/react';
import { TAG_TYPES } from './tagTypes';
import { baseQueryWithReauth } from './baseQueryWithReauth';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [...TAG_TYPES],
  endpoints: () => ({}),
  keepUnusedDataFor: 60,
});
