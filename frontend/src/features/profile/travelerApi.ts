import { baseApi } from '../../api/baseApi';
import type {
  TravelerProfile,
  TravelerPreferences,
  UpdateTravelerRequest,
  TravelerListResponse,
} from './profile.types';

export const travelerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTravelerById: build.query<TravelerProfile, string>({
      query: (id) => ({ url: `/travelers/${id}` }),
      keepUnusedDataFor: 3600,
      providesTags: (_result, _error, id) => [{ type: 'TRAVELER', id }],
    }),

    updateTraveler: build.mutation<
      TravelerProfile,
      { id: string } & UpdateTravelerRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/travelers/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'TRAVELER', id }],
    }),

    deleteTraveler: build.mutation<void, string>({
      query: (id) => ({
        url: `/travelers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'TRAVELER', id }],
    }),

    getTravelerPreferences: build.query<TravelerPreferences, string>({
      query: (id) => ({ url: `/travelers/${id}/preferences` }),
      keepUnusedDataFor: 3600,
      providesTags: (_result, _error, id) => [{ type: 'TRAVELER', id }],
    }),

    updateTravelerPreferences: build.mutation<
      TravelerPreferences,
      { id: string } & TravelerPreferences
    >({
      query: ({ id, ...body }) => ({
        url: `/travelers/${id}/preferences`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'TRAVELER', id }],
    }),

    listTravelers: build.query<
      TravelerListResponse,
      { page?: number | undefined; limit?: number | undefined; q?: string | undefined } | void
    >({
      query: (params) => ({
        url: '/travelers',
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
          ...(params?.q ? { q: params.q } : {}),
        },
      }),
      keepUnusedDataFor: 60,
      providesTags: ['TRAVELER'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetTravelerByIdQuery,
  useUpdateTravelerMutation,
  useDeleteTravelerMutation,
  useGetTravelerPreferencesQuery,
  useUpdateTravelerPreferencesMutation,
  useListTravelersQuery,
} = travelerApi;
