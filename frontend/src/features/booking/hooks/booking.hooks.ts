import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { bookingKeys } from '../types/booking.keys';
import { roomKeys } from '@/features/room/types/room.keys';
import {
    actionBooking,
    cancelBooking,
    checkIn,
    checkOut,
    createBooking,
    fetchBookingById,
    fetchHostelBookings,
    fetchMyBookings,
    fetchPendingBookings,
    submitPayment,
} from '../api/booking.api';
import type {
    ActionBookingPayload,
    BookingDto,
    BookingPageParams,
    CreateBookingPayload,
    SubmitPaymentPayload,
} from '../types/booking.types';
import type { ApiError } from '@/types/api';

// =============================================================================
// Query hooks
// =============================================================================

/**
 * Student's own booking history, paginated, newest first.
 *
 * @param params - Pagination params.
 */
export function useMyBookings(params: BookingPageParams = {}) {
    return useQuery({
        queryKey: bookingKeys.myBookings(params),
        queryFn: () => fetchMyBookings(params),
        staleTime: 60 * 1000,
        placeholderData: (prev) => prev,
    });
}

/**
 * Full booking detail by ID.
 * Works for both students (own bookings) and managers (any booking).
 *
 * @param id - Booking UUID. Pass null/undefined to disable.
 */
export function useBookingDetail(id: string | null | undefined) {
    return useQuery({
        queryKey: bookingKeys.detail(id ?? ''),
        queryFn: () => fetchBookingById(id!),
        enabled: Boolean(id),
        staleTime: 3 * 1000, // booking detail is sensitive — keep it fresher
    });
}

/**
 * Manager: PENDING bookings for assigned hostels — FIFO queue (oldest first).
 *
 * @param params - Pagination params.
 */
export function usePendingBookings(params: BookingPageParams = {}) {
    return useQuery({
        queryKey: bookingKeys.pendingBookings(params),
        queryFn: () => fetchPendingBookings(params),
        staleTime: 30 * 1000,
        placeholderData: (prev) => prev,
        refetchInterval: 60 * 1000, // Auto-refresh every minute — queue changes frequently
    });
}

/**
 * Manager/Admin: all bookings for a specific hostel with optional status filter.
 *
 * @param hostelId - UUID of the hostel. Pass null to disable.
 * @param params   - Pagination + optional status filter.
 */
export function useHostelBookings(
    hostelId: string | null | undefined,
    params: BookingPageParams = {}
) {
    return useQuery({
        queryKey: bookingKeys.hostelBookings(hostelId ?? '', params),
        queryFn: () => fetchHostelBookings(hostelId!, params),
        enabled: Boolean(hostelId),
        staleTime: 30 * 1000,
        placeholderData: (prev) => prev,
    });
}

// =============================================================================
// Mutation hooks
// =============================================================================

/**
 * Student: submits a new booking request.
 *
 * On success:
 *  - Invalidates the student's booking history list.
 *  - Invalidates room preview / available-rooms caches for the relevant hostel
 *    so occupancy counts refresh immediately.
 *
 * The caller is responsible for calling onSuccess to navigate or close a dialog.
 */
export function useCreateBooking() {
    const queryClient = useQueryClient();

    return useMutation<BookingDto, ApiError, CreateBookingPayload>({
        mutationFn: createBooking,
        onSuccess: (booking) => {
            // Refresh the student's own history
            queryClient.invalidateQueries({
                queryKey: bookingKeys.myBookings(),
            });
            // Refresh room availability for the hostel this room belongs to
            queryClient.invalidateQueries({
                queryKey: roomKeys.available(booking.room.hostelId, {}),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.preview(booking.room.hostelId),
            });
            toast.success('Booking request submitted successfully.');
        },
        onError: (err) => {
            if (err.code !== 'VALIDATION_FAILED') {
                toast.error(err.message);
            }
        },
    });
}

/**
 * Student: cancels a PENDING or APPROVED booking.
 *
 * On success invalidates the booking detail, the student's list, and room availability.
 */
export function useCancelBooking() {
    const queryClient = useQueryClient();

    return useMutation<BookingDto, ApiError, string>({
        mutationFn: (bookingId) => cancelBooking(bookingId),
        onSuccess: (booking) => {
            queryClient.invalidateQueries({
                queryKey: bookingKeys.detail(booking.id),
            });
            queryClient.invalidateQueries({
                queryKey: bookingKeys.myBookings(),
            });
            // If the booking was APPROVED, cancelling frees the bed — refresh room caches
            queryClient.invalidateQueries({
                queryKey: roomKeys.available(booking.room.hostelId, {}),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.preview(booking.room.hostelId),
            });
            toast.success('Booking cancelled.');
        },
        onError: (err) => {
            if (err.code !== 'VALIDATION_FAILED') {
                toast.error(err.message);
            }
        },
    });
}

/**
 * Student: submits a payment reference after an APPROVED booking.
 *
 * @param bookingId - UUID of the booking being paid.
 */
export function useSubmitPayment(bookingId: string) {
    const queryClient = useQueryClient();

    return useMutation<BookingDto, ApiError, SubmitPaymentPayload>({
        mutationFn: (payload) => submitPayment(bookingId, payload),
        onSuccess: (booking) => {
            queryClient.invalidateQueries({
                queryKey: bookingKeys.detail(booking.id),
            });
            queryClient.invalidateQueries({
                queryKey: bookingKeys.myBookings(),
            });
            toast.success(
                'Payment reference submitted. Awaiting manager verification.'
            );
        },
        onError: (err) => {
            if (err.code !== 'VALIDATION_FAILED') {
                toast.error(err.message ?? 'Failed to submit payment.');
            }
        },
    });
}

/**
 * Manager: approves or rejects a PENDING booking.
 *
 * On success invalidates:
 *  - The specific booking detail.
 *  - The pending bookings queue (item disappears from queue).
 *  - The hostel bookings list.
 *
 * @param bookingId - UUID of the booking being actioned.
 * @param roomId  - UUID of the hostel (used for hostelBookings cache key).
 */
export function useActionBooking(bookingId: string, roomId: string) {
    const queryClient = useQueryClient();

    return useMutation<BookingDto, ApiError, ActionBookingPayload>({
        mutationFn: (payload) => actionBooking(bookingId, payload),
        onSuccess: (booking, variables) => {
            queryClient.invalidateQueries({
                queryKey: bookingKeys.detail(booking.id),
            });
            queryClient.invalidateQueries({
                queryKey: bookingKeys.pendingBookings(),
            });
            queryClient.invalidateQueries({
                queryKey: bookingKeys.hostelBookings(roomId),
            });
            const message = variables.approved
                ? 'Booking approved. Student notified.'
                : 'Booking rejected.';
            toast.success(message);
        },
        onError: (err) => {
            if (err.code !== 'VALIDATION_FAILED') {
                toast.error(err.message);
            }
        },
    });
}

/**
 * Manager: checks a student in.
 * Booking must be APPROVED and have a payment reference on file.
 *
 * On success invalidates booking detail, hostel bookings, and room occupancy.
 *
 * @param bookingId - UUID of the booking.
 * @param hostelId  - UUID of the hostel.
 */
export function useCheckIn(bookingId: string, hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<BookingDto, ApiError, void>({
        mutationFn: () => checkIn(bookingId),
        onSuccess: (booking) => {
            queryClient.invalidateQueries({
                queryKey: bookingKeys.detail(booking.id),
            });
            queryClient.invalidateQueries({
                queryKey: bookingKeys.hostelBookings(hostelId),
            });
            // Room is now occupied — refresh availability caches
            queryClient.invalidateQueries({
                queryKey: roomKeys.available(hostelId, {}),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.preview(hostelId),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.detail(booking.room.id),
            });
            toast.success('Student checked in successfully.');
        },
        onError: (err) => {
            if (err.code !== 'VALIDATION_FAILED') {
                toast.error(err.message);
            }
        },
    });
}

/**
 * Manager: checks a student out.
 * Booking must be CHECKED_IN. Frees the bed and triggers waitlist notification.
 *
 * @param bookingId - UUID of the booking.
 * @param hostelId  - UUID of the hostel.
 */
export function useCheckOut(bookingId: string, hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<BookingDto, ApiError, void>({
        mutationFn: () => checkOut(bookingId),
        onSuccess: (booking) => {
            queryClient.invalidateQueries({
                queryKey: bookingKeys.detail(booking.id),
            });
            queryClient.invalidateQueries({
                queryKey: bookingKeys.hostelBookings(hostelId),
            });
            // Bed freed — refresh room availability so new bookings can be made
            queryClient.invalidateQueries({
                queryKey: roomKeys.available(hostelId, {}),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.preview(hostelId),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.detail(booking.room.id),
            });
            toast.success('Student checked out. Bed is now available.');
        },
        onError: (err) => {
            if (err.code !== 'VALIDATION_FAILED') {
                toast.error(err.message);
            }
        },
    });
}
