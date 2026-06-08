package com.leroy.hostelbackend.module.booking.controller;

import com.leroy.hostelbackend.module.booking.dto.ActionBookingRequest;
import com.leroy.hostelbackend.module.booking.dto.BookingDto;
import com.leroy.hostelbackend.module.booking.dto.BookingSummaryDto;
import com.leroy.hostelbackend.module.booking.dto.CreateBookingRequest;
import com.leroy.hostelbackend.module.booking.dto.SubmitPaymentRequest;
import com.leroy.hostelbackend.module.booking.service.BookingService;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.user.model.UserRole;
import com.leroy.hostelbackend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for booking operations.
 *
 * <p>Endpoint summary:
 * <pre>
 * POST   /bookings                          STUDENT: submit booking request
 * DELETE /bookings/{id}/cancel              STUDENT: cancel own booking
 * POST   /bookings/{id}/payment             STUDENT: submit payment reference
 * GET    /bookings/my                       STUDENT: own booking history
 * GET    /bookings/{id}                     STUDENT/MANAGER booking detail
 *
 * GET    /manager/bookings/pending          MANAGER: PENDING bookings for their hostels
 * POST   /manager/bookings/{id}/action      MANAGER: approve or reject
 * POST   /manager/bookings/{id}/checkin     MANAGER: check student in
 * POST   /manager/bookings/{id}/checkout    MANAGER: check student out
 *
 * GET    /manager/hostels/{hostelId}/bookings MANAGER: all bookings for a hostel
 * </pre>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
@Tag(name = "Bookings")
public class BookingController {

    private final BookingService bookingService;

    // =========================================================================
    // Student endpoints
    // =========================================================================

    /**
     * Submit a new booking request for a bed in a room.
     */
    @PostMapping("/bookings")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<BookingDto>> createBooking(
            @Valid @RequestBody CreateBookingRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var studentId = customUserDetails.getUserId();
        var booking   = bookingService.createBooking(studentId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Booking request submitted successfully.", booking));
    }

    /**
     * Cancel a PENDING or APPROVED booking.
     */
    @DeleteMapping("/bookings/{id}/cancel")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<BookingDto>> cancelBooking(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        var studentId = customUserDetails.getUserId();
        return ResponseEntity.ok(ApiResponse.success("Booking cancelled.",
                bookingService.cancelBooking(id, studentId)));
    }

    /**
     * Submit a payment reference after the booking has been APPROVED.
     *
     * <p>No payment is processed. The student provides their external transaction
     * reference (e.g. Mobile Money ID). The manager verifies it before check-in.
     */
    @PostMapping("/bookings/{id}/payment")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<BookingDto>> submitPayment(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitPaymentRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var studentId = customUserDetails.getUserId();
        return ResponseEntity.ok(ApiResponse.success("Payment reference submitted.",
                bookingService.submitPayment(id, studentId, request)));
    }

    /**
     * The authenticated student's full booking history, most recent first.
     */
    @GetMapping("/bookings/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Page<BookingSummaryDto>>> myBookings(
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var studentId = customUserDetails.getUserId();
        return ResponseEntity.ok(ApiResponse.success("Bookings fetched.",
                bookingService.myBookings(studentId, pageable)));
    }

    /**
     * Full booking detail. Students can only see their own; managers and admins see any.
     */
    @GetMapping("/bookings/{id}")
    public ResponseEntity<ApiResponse<BookingDto>> getBooking(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        boolean privileged  = customUserDetails.getRole().equals(UserRole.MANAGER)
                        || customUserDetails.getRole().equals(UserRole.ADMIN);
        return ResponseEntity.ok(ApiResponse.success("Booking fetched.",
                bookingService.getBookingById(id, customUserDetails.getUserId(), privileged)));
    }

    // =========================================================================
    // Manager endpoints
    // =========================================================================

    /**
     * All PENDING bookings for the manager's assigned hostels — oldest first (FIFO queue).
     */
    @GetMapping("/manager/bookings/pending")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Page<BookingSummaryDto>>> pendingBookings(
            @PageableDefault(size = 20, sort = "requestedAt", direction = Sort.Direction.ASC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var managerId = customUserDetails.getUserId();
        return ResponseEntity.ok(ApiResponse.success("Pending bookings fetched.",
                bookingService.pendingBookingsForManager(managerId, pageable)));
    }

    /**
     * Approve or reject a PENDING booking.
     * A rejection reason is required when {@code approved = false}.
     */
    @PostMapping("/manager/bookings/{id}/action")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<BookingDto>> actionBooking(
            @PathVariable UUID id,
            @Valid @RequestBody ActionBookingRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var managerId = customUserDetails.getUserId();
        var result    = bookingService.actionBooking(id, managerId, request);
        var msg       = Boolean.TRUE.equals(request.approved()) ? "Booking approved." : "Booking rejected.";
        return ResponseEntity.ok(ApiResponse.success(msg, result));
    }

    /**
     * Check a student in. Booking must be APPROVED and payment reference submitted.
     */
    @PostMapping("/manager/bookings/{id}/checkin")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<BookingDto>> checkIn(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        var managerId = customUserDetails.getUserId();
        return ResponseEntity.ok(ApiResponse.success("Student checked in.",
                bookingService.checkIn(id, managerId)));
    }

    /**
     * Check a student out. Booking must be CHECKED_IN.
     * Frees the bed and triggers waitlist notification.
     */
    @PostMapping("/manager/bookings/{id}/checkout")
    @PreAuthorize("hasAnyRole('MANAGER')")
    public ResponseEntity<ApiResponse<BookingDto>> checkOut(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        var managerId = customUserDetails.getUserId();
        return ResponseEntity.ok(ApiResponse.success("Student checked out.",
                bookingService.checkOut(id, managerId)));
    }

    // =========================================================================
    // Admin endpoints
    // =========================================================================

    /**
     * All bookings for a hostel with optional status filter.
     */
    @GetMapping("/admin/hostels/{hostelId}/bookings")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Page<BookingSummaryDto>>> hostelBookings(
            @PathVariable UUID hostelId,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "requestedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success("Bookings fetched.",
                bookingService.bookingsByHostel(hostelId, status, pageable)));
    }
}