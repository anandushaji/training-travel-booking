import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCreateBookingMutation, useGetBookingByIdQuery } from '../bookingApi';
import { setActiveBooking, clearActiveBooking, setPolling, selectActiveBooking, selectIsPolling } from '../bookingSlice';
import type { BookingRequest } from '../booking.types';
import type { AppDispatch } from '../../../app/store';

const MAX_ATTEMPTS = 10;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

export interface UseBookingResult {
  submit: (request: BookingRequest) => Promise<void>;
  activeBooking: ReturnType<typeof selectActiveBooking>;
  isPolling: boolean;
  isSubmitting: boolean;
  error: string | null;
}

export function useBooking(): UseBookingResult {
  const dispatch = useDispatch<AppDispatch>();
  const activeBooking = useSelector(selectActiveBooking);
  const isPolling = useSelector(selectIsPolling);

  const [createBooking, { isLoading: isSubmitting, error: createError }] =
    useCreateBookingMutation();

  // getBookingById with skip — we drive polling manually
  const pollingId = activeBooking?.id ?? '';
  const { refetch } = useGetBookingByIdQuery(pollingId, { skip: !pollingId });

  // Mutable ref to always have the latest poll function (avoids stale closure)
  const pollRef = useRef<() => void>(() => {
    /* noop */
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  // Re-assign poll function on every render so it always closes over latest state
  pollRef.current = () => {
    if (attemptRef.current >= MAX_ATTEMPTS) {
      dispatch(setPolling(false));
      return;
    }

    void (async () => {
      try {
        const result = await refetch();
        const booking = result.data;
        if (booking) {
          dispatch(setActiveBooking(booking));
          if (booking.status === 'CONFIRMED' || booking.status === 'FAILED') {
            dispatch(setPolling(false));
            return;
          }
        }
      } catch {
        // Swallow polling errors — will retry up to MAX_ATTEMPTS
      }

      attemptRef.current += 1;
      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attemptRef.current - 1), MAX_DELAY_MS);
      timerRef.current = setTimeout(() => pollRef.current(), delay);
    })();
  };

  // Start or stop polling loop when isPolling changes
  useEffect(() => {
    if (!isPolling || !pollingId) return;

    attemptRef.current = 0;
    // First poll immediately (0ms delay)
    timerRef.current = setTimeout(() => pollRef.current(), 0);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPolling, pollingId]);

  const submit = useCallback(
    async (request: BookingRequest) => {
      dispatch(clearActiveBooking());
      const result = await createBooking(request).unwrap();
      dispatch(setActiveBooking(result));
      dispatch(setPolling(true));
    },
    [createBooking, dispatch],
  );

  const error =
    createError
      ? 'status' in createError
        ? `Booking failed (${String(createError.status)})`
        : 'Booking failed'
      : null;

  return {
    submit,
    activeBooking,
    isPolling,
    isSubmitting,
    error,
  };
}
