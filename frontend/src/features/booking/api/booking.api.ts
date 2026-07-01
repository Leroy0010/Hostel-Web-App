import { apiClient } from '@/lib/axios';
import type {
    ActionBookingPayload,
    BookingDto,
    BookingPageParams,
    BookingSummaryDto,
    CreateBookingPayload,
    SubmitPaymentPayload,
} from '../types/booking.types';
import type { PageResponse } from '@/types/pagination';

/**
 * Raw API call functions for the booking domain.
 *
 * All functions are pure async — no React Query coupling.
 * The Axios response interceptor in {@code src/lib/axios.ts} strips the
 * {@code ApiResponse<T>} envelope, so each function receives domain data directly.
 *
 * Endpoint map (matches {@code BookingController} exactly):
 * ┌─────────────────────────────────────────────────┬──────────────┐
 * │ Function                                        │ HTTP         │
 * ├─────────────────────────────────────────────────┼──────────────┤
 * │ createBooking                                   │ POST         │
 * │ cancelBooking                                   │ DELETE       │
 * │ submitPayment                                   │ POST         │
 * │ fetchMyBookings                                 │ GET          │
 * │ fetchBookingById                                │ GET          │
 * │ fetchPendingBookings (manager)                  │ GET          │
 * │ actionBooking (manager)                         │ POST         │
 * │ checkIn (manager)                               │ POST         │
 * │ checkOut (manager)                              │ POST         │
 * │ fetchHostelBookings (manager/admin)             │ GET          │
 * └─────────────────────────────────────────────────┴──────────────┘
 */

// =============================================================================
// Student endpoints
// =============================================================================

/**
 * Submit a new booking request for a bed in a specific room.
 * Maps to: {@code POST /api/bookings}
 */
export function createBooking(
    payload: CreateBookingPayload
): Promise<BookingDto> {
    return apiClient.post('/bookings', payload);
}

/**
 * Cancel a PENDING or APPROVED booking.
 * Maps to: {@code DELETE /api/bookings/{id}/cancel}
 *
 * @param id - UUID of the booking to cancel.
 */
export function cancelBooking(id: string): Promise<BookingDto> {
    return apiClient.delete(`/bookings/${id}/cancel`);
}

/**
 * Submit a payment reference after an APPROVED booking.
 * No actual payment is processed — the student provides an external transaction
 * reference (e.g. Mobile Money ID) for the manager to verify offline.
 *
 * Maps to: {@code POST /api/bookings/{id}/payment}
 *
 * @param id      - UUID of the booking.
 * @param payload - Payment reference and declared amount.
 */
export function submitPayment(
    id: string,
    payload: SubmitPaymentPayload
): Promise<BookingDto> {
    return apiClient.post(`/bookings/${id}/payment`, payload);
}

/**
 * Fetches the authenticated student's full booking history.
 * Maps to: {@code GET /api/bookings/my}
 *
 * @param params - Pagination parameters.
 */
export function fetchMyBookings(
    params: BookingPageParams = {}
): Promise<PageResponse<BookingSummaryDto>> {
    return apiClient.get('/bookings/my', {
        params: {
            page: params.page ?? 0,
            size: params.size ?? 10,
            sort: 'createdAt,desc',
            status: params.status
        },
    });
}

/**
 * Fetches the full detail of a single booking.
 * Students can only fetch their own; managers/admins can fetch any.
 * Maps to: {@code GET /api/bookings/{id}}
 *
 * @param id - UUID of the booking.
 */
export function fetchBookingById(id: string): Promise<BookingDto> {
    return apiClient.get(`/bookings/${id}`);
}

// =============================================================================
// Manager endpoints
// =============================================================================

/**
 * Fetches all PENDING bookings for the manager's assigned hostels — FIFO order.
 * Maps to: {@code GET /api/manager/bookings/pending}
 *
 * @param params - Pagination parameters.
 */
export function fetchPendingBookings(
    params: BookingPageParams = {}
): Promise<PageResponse<BookingSummaryDto>> {
    return apiClient.get('/manager/bookings/pending', {
        params: {
            page: params.page ?? 0,
            size: params.size ?? 20,
            sort: 'requestedAt,asc',
        },
    });
}

/**
 * Approve or reject a PENDING booking.
 * Maps to: {@code POST /api/manager/bookings/{id}/action}
 *
 * @param id      - UUID of the booking.
 * @param payload - Approval decision, optional rejection reason, and grace period.
 */
export function actionBooking(
    id: string,
    payload: ActionBookingPayload
): Promise<BookingDto> {
    return apiClient.post(`/manager/bookings/${id}/action`, payload);
}

/**
 * Check a student in. Booking must be APPROVED and payment reference submitted.
 * Maps to: {@code POST /api/manager/bookings/{id}/checkin}
 *
 * @param id - UUID of the booking.
 */
export function checkIn(id: string): Promise<BookingDto> {
    return apiClient.post(`/manager/bookings/${id}/checkin`, {});
}

/**
 * Check a student out. Booking must be CHECKED_IN.
 * Frees the bed and triggers waitlist notification.
 * Maps to: {@code POST /api/manager/bookings/{id}/checkout}
 *
 * @param id - UUID of the booking.
 */
export function checkOut(id: string): Promise<BookingDto> {
    return apiClient.post(`/manager/bookings/${id}/checkout`, {});
}

/**
 * Fetches all bookings for a hostel with optional status filter.
 * Maps to: {@code GET /api/manager/hostels/{hostelId}/bookings}
 *
 * @param hostelId - UUID of the hostel.
 * @param params   - Pagination and optional status filter.
 */
export function fetchHostelBookings(
    hostelId: string,
    params: BookingPageParams = {}
): Promise<PageResponse<BookingSummaryDto>> {
    return apiClient.get(`/manager/hostels/${hostelId}/bookings`, {
        params: {
            page: params.page ?? 0,
            size: params.size ?? 20,
            sort: 'requestedAt,desc',
            ...(params.status && { status: params.status }),
        },
    });
}
