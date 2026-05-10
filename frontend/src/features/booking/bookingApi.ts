import { baseApi } from '../../api/baseApi';
import type {
  Booking,
  BookingRequest,
  BookingListResponse,
} from './booking.types';

export const bookingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createBooking: build.mutation<Booking, BookingRequest>({
      query: (body) => ({
        url: '/bookings',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BOOKING'],
    }),

    getBookings: build.query<BookingListResponse, { page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/bookings',
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
        },
      }),
      keepUnusedDataFor: 300,
      providesTags: ['BOOKING'],
    }),

    getBookingById: build.query<Booking, string>({
      query: (id) => ({ url: `/bookings/${id}` }),
      keepUnusedDataFor: 0,
    }),

    cancelBooking: build.mutation<Booking, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/bookings/${id}/cancel`,
        method: 'POST',
        body: { reason: reason ?? '' },
      }),
      invalidatesTags: ['BOOKING'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateBookingMutation,
  useGetBookingsQuery,
  useGetBookingByIdQuery,
  useCancelBookingMutation,
} = bookingApi;
