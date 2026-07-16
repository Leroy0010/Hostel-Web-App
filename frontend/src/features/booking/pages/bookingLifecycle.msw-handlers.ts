import { http, HttpResponse } from 'msw';
import { apiClient } from '@/lib/axios';
import type { BookingDto } from '@/features/booking/types/booking.types';

// Read the actual configured base URL rather than hardcoding it, since a
// local .env (VITE_API_BASE_URL) can point apiClient somewhere other than
// the localhost default — MSW must intercept whatever apiClient really
// requests or every call falls through as an unhandled request.
const API_BASE = apiClient.defaults.baseURL ?? 'http://localhost:8080/api';

/**
 * Builds a fresh in-memory booking record plus a set of MSW handlers that
 * read/mutate it, so a single test can drive a booking through its full
 * lifecycle (request → approve → pay → check in) against real HTTP calls
 * intercepted at the network boundary — exercising the real API functions,
 * React Query hooks, and cache-invalidation wiring exactly as production
 * does, rather than mocking any of those layers individually.
 *
 * @param overrides - Partial fields to seed the initial booking state with.
 */
export function createBookingLifecycleHandlers(
    overrides: Partial<BookingDto> = {}
) {
    const booking: BookingDto = {
        id: 'booking-1',
        student: {
            id: 'student-1',
            firstName: 'Lexa',
            lastName: 'Doe',
            email: 'lexa.doe@ucc.edu.gh',
            phone: '0594000000',
        },
        room: {
            id: 'room-1',
            roomNumber: 'A12',
            roomType: 'DOUBLE',
            price: 3500.0,
            capacity: 2,
            currentOccupancy: 1,
            hostelId: 'hostel-1',
            hostelName: 'Leroy Hostel',
        },
        status: 'PENDING',
        managerPhone: '0540000000',
        academicYear: '2025/2026',
        semester: 'FIRST',
        isWaitlistDraft: false,
        requestedAt: '2025-06-01T08:00:00.000Z',
        approvedAt: null,
        approvedBy: null,
        paymentExpiresAt: null,
        pendingExpiresAt: null,
        rejectedAt: null,
        rejectedReason: null,
        checkedInAt: null,
        checkedOutAt: null,
        amountPaid: null,
        paymentRef: null,
        createdAt: '2025-06-01T08:00:00.000Z',
        updatedAt: '2025-06-01T08:00:00.000Z',
        ...overrides,
    };

    const handlers = [
        // GET /bookings/:id — always returns the current in-memory state.
        http.get(`${API_BASE}/bookings/:id`, () => {
            return HttpResponse.json({
                timestamp: new Date().toISOString(),
                success: true,
                message: 'OK',
                data: booking,
            });
        }),

        // POST /manager/bookings/:id/action — approve or reject.
        http.post(
            `${API_BASE}/manager/bookings/:id/action`,
            async ({ request }) => {
                const body = (await request.json()) as {
                    approved: boolean;
                    rejectedReason?: string;
                    gracePeriodHours?: number;
                };
                const now = new Date().toISOString();
                if (body.approved) {
                    booking.status = 'APPROVED';
                    booking.approvedAt = now;
                    booking.approvedBy = {
                        id: 'manager-1',
                        firstName: 'Kwame',
                        lastName: 'Mensah',
                    };
                    const deadline = new Date(
                        Date.now() + (body.gracePeriodHours ?? 48) * 3600 * 1000
                    );
                    booking.paymentExpiresAt = deadline.toISOString();
                } else {
                    booking.status = 'REJECTED';
                    booking.rejectedAt = now;
                    booking.rejectedReason = body.rejectedReason ?? null;
                }
                return HttpResponse.json({
                    timestamp: now,
                    success: true,
                    message: 'OK',
                    data: booking,
                });
            }
        ),

        // POST /bookings/:id/payment — student submits a payment reference.
        http.post(`${API_BASE}/bookings/:id/payment`, async ({ request }) => {
            const body = (await request.json()) as {
                paymentRef: string;
                amountPaid: string;
            };
            booking.paymentRef = body.paymentRef;
            booking.amountPaid = body.amountPaid;
            return HttpResponse.json({
                timestamp: new Date().toISOString(),
                success: true,
                message: 'OK',
                data: booking,
            });
        }),

        // POST /manager/bookings/:id/checkin
        http.post(`${API_BASE}/manager/bookings/:id/checkin`, () => {
            booking.status = 'CHECKED_IN';
            booking.checkedInAt = new Date().toISOString();
            return HttpResponse.json({
                timestamp: new Date().toISOString(),
                success: true,
                message: 'OK',
                data: booking,
            });
        }),

        // POST /manager/bookings/:id/checkout
        http.post(`${API_BASE}/manager/bookings/:id/checkout`, () => {
            booking.status = 'CHECKED_OUT';
            booking.checkedOutAt = new Date().toISOString();
            return HttpResponse.json({
                timestamp: new Date().toISOString(),
                success: true,
                message: 'OK',
                data: booking,
            });
        }),

        // DELETE /bookings/:id/cancel
        http.delete(`${API_BASE}/bookings/:id/cancel`, () => {
            booking.status = 'CANCELLED';
            return HttpResponse.json({
                timestamp: new Date().toISOString(),
                success: true,
                message: 'OK',
                data: booking,
            });
        }),
    ];

    return { booking, handlers };
}
