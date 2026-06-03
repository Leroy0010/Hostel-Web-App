package com.leroy.hostelbackend.module.booking.service;

import com.leroy.hostelbackend.module.booking.dto.*;
import com.leroy.hostelbackend.module.booking.mapper.BookingMapper;
import com.leroy.hostelbackend.module.booking.model.Booking;
import com.leroy.hostelbackend.module.booking.model.BookingStatus;
import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.complaint.model.Complaint;
import com.leroy.hostelbackend.module.notification.service.NotificationService;
import com.leroy.hostelbackend.module.room.model.Room;
import com.leroy.hostelbackend.module.room.model.RoomStatus;
import com.leroy.hostelbackend.module.room.repository.RoomRepository;
import com.leroy.hostelbackend.module.room.service.RoomService;
import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.module.waitlist.service.WaitlistService;
import com.leroy.hostelbackend.shared.exception.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Core booking engine.
 *
 * <p><strong>Policy change — multiple active bookings per student:</strong>
 * Students may hold multiple PENDING, APPROVED, or CHECKED_IN bookings
 * simultaneously for different rooms. The only hard guard remaining is that
 * a student cannot book the <em>same room</em> twice in the same academic period.
 * When a student checks in, a soft reminder is sent listing their other active
 * bookings so they can cancel the ones they no longer need.
 *
 * <p><strong>State machine:</strong>
 * <pre>
 *   PENDING  → APPROVED     (manager approves + sets grace period)
 *   PENDING  → REJECTED     (manager rejects — reason required)
 *   PENDING  → CANCELLED    (student cancels)
 *   APPROVED → CHECKED_IN   (manager checks in — paymentRef required)
 *   APPROVED → CANCELLED    (student cancels an approved booking)
 *   APPROVED → EXPIRED      (sweeper: paymentExpiresAt elapsed, no paymentRef)
 *   CHECKED_IN → CHECKED_OUT (manager checks student out)
 * </pre>
 *
 * <p><strong>Capacity locking at APPROVED:</strong> Beds are reserved the moment
 * the manager clicks Approve, not at check-in. This prevents the race condition
 * where multiple students are approved for a room that only has one bed left.
 *
 * <p><strong>Expiry:</strong> If the student does not submit a payment reference
 * before {@code paymentExpiresAt}, the {@link com.leroy.hostelbackend.shared.scheduler.BookingExpiredSweeper} auto-cancels
 * the booking, frees the bed, and triggers the waitlist.
 *
 * <p><strong>Concurrency guard:</strong> Pessimistic write lock on Room during
 * approval + {@code @Version} optimistic lock as a second layer.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private final BookingRepository   bookingRepository;
    private final RoomRepository      roomRepository;
    private final UserRepository      userRepository;
    private final BookingMapper       bookingMapper;
    private final RoomService         roomService;
    private final WaitlistService     waitlistService;
    private final NotificationService notificationService;

    // -------------------------------------------------------------------------
    // Student actions
    // -------------------------------------------------------------------------

    /**
     * Submits a new booking request in PENDING status.
     *
     * <p>The only guard is a per-room duplicate check: a student cannot book the
     * same room twice in the same semester while that booking is still active.
     * Multiple bookings for <em>different</em> rooms are fully allowed.
     *
     * @param studentId the requesting student's UUID
     * @param request   validated booking payload
     * @throws RoomFullyOccupiedException    if the room has no available beds
     * @throws BookingAlreadyExistsException if the student already has an active
     *                                        booking for this specific room and period
     */
    @Transactional
    public BookingDto createBooking(UUID studentId, CreateBookingRequest request) {
        var room = roomRepository.findByIdWithHostel(request.roomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + request.roomId()));

        // Guard: room must be available for booking requests
        if (room.getStatus() != RoomStatus.AVAILABLE) {
            throw new RoomFullyOccupiedException(room.getRoomNumber());
        }

        // Guard: prevent booking the same room twice in the same period
        if (bookingRepository.hasActiveBookingForRoom(
                studentId, request.roomId(), request.academicYear(), request.semester())) {
            throw new BookingAlreadyExistsException(
                    "You already have an active booking for room "
                            + room.getRoomNumber() + " in " + request.semester() + " semester, "
                            + request.academicYear() + ".");
        }

        var student = requireUser(studentId);
        var booking = Booking.createBooking(request, student, room);
        var saved   = bookingRepository.save(booking);

        log.info("Booking created: id={}, student={}, room={}, hostel={}",
                saved.getId(), studentId, room.getId(), room.getHostel().getName());
        return bookingMapper.toDto(saved);
    }

    /**
     * Student cancels their own PENDING or APPROVED booking.
     * If the booking was APPROVED, the bed is released and the waitlist is triggered.
     */
    @Transactional
    public BookingDto cancelBooking(UUID bookingId, UUID studentId) {
        var booking = requireBooking(bookingId);

        if (!booking.getStudent().getId().equals(studentId)) {
            throw new HostelAccessDeniedException();
        }

        var current = booking.getStatus();
        if (current != BookingStatus.PENDING && current != BookingStatus.APPROVED) {
            throw new InvalidBookingTransitionException(current.name(), BookingStatus.CANCELLED.name());
        }

        booking.setStatus(BookingStatus.CANCELLED);
        var saved = bookingRepository.save(booking);

        if (current == BookingStatus.APPROVED) {
            // Bed was locked on approval — release it now
            releaseRoomBed(booking.getRoom());
        }

        notificationService.notifyBookingCancelled(booking.getStudent(), bookingId);
        log.info("Booking cancelled by student: id={}", bookingId);
        return bookingMapper.toDto(saved);
    }

    /**
     * Student submits their external payment reference after approval.
     * No payment gateway is involved — the manager verifies this offline
     * before allowing check-in.
     *
     * <p>Submitting a payment reference does NOT check the student in.
     * The manager must still explicitly call {@link #checkIn}.
     *
     * @throws InvalidBookingTransitionException if the booking is not APPROVED
     * @throws IllegalStateException             if the payment deadline has already elapsed
     */
    @Transactional
    public BookingDto submitPayment(UUID bookingId, UUID studentId, SubmitPaymentRequest request) {
        var booking = requireBooking(bookingId);

        if (!booking.getStudent().getId().equals(studentId)) {
            throw new HostelAccessDeniedException();
        }

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new InvalidBookingTransitionException(booking.getStatus().name(), "PAYMENT_SUBMISSION");
        }

        // Safety: reject if the deadline has already passed (sweeper may not have run yet)
        if (booking.getPaymentExpiresAt() != null
                && LocalDateTime.now().isAfter(booking.getPaymentExpiresAt())) {
            throw new IllegalStateException(
                    "Your payment deadline has passed. This booking will be expired shortly.");
        }

        booking.setPaymentRef(request.paymentRef());
        booking.setAmountPaid(request.amountPaid());

        log.info("Payment reference submitted for booking {}: ref={}", bookingId, request.paymentRef());
        return bookingMapper.toDto(bookingRepository.save(booking));
    }

    // -------------------------------------------------------------------------
    // Manager actions
    // -------------------------------------------------------------------------

    /**
     * Manager approves or rejects a PENDING booking.
     *
     * <p><strong>On approval:</strong>
     * <ol>
     *   <li>Room is loaded with a PESSIMISTIC_WRITE lock — concurrent approvals queue here.</li>
     *   <li>Bed availability is re-checked after lock acquisition.</li>
     *   <li>{@code room.currentOccupancy} is incremented and status is recalculated.</li>
     *   <li>Payment expiry deadline is set: {@code now + gracePeriodHours}.</li>
     *   <li>Student is notified with their deadline.</li>
     * </ol>
     *
     * <p><strong>On rejection:</strong> Beds are not touched. Waitlist is notified.
     *
     * @throws InvalidBookingTransitionException if the booking is not PENDING
     * @throws RoomFullyOccupiedException        if another approval just filled the last bed
     */
    @Transactional
    public BookingDto actionBooking(UUID bookingId, UUID managerId, ActionBookingRequest request) {
        var booking = requireBooking(bookingId);

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new InvalidBookingTransitionException(
                    booking.getStatus().name(),
                    Boolean.TRUE.equals(request.approved())
                            ? BookingStatus.APPROVED.name()
                            : BookingStatus.REJECTED.name());
        }

        booking.setApprovedBy(requireUser(managerId));

        if (Boolean.TRUE.equals(request.approved())) {
            approveBooking(booking, request.effectiveGracePeriodHours());
        } else {
            rejectBooking(booking, request.rejectedReason());
        }

        var saved = bookingRepository.save(booking);
        log.info("Booking {} by manager {}: id={}",
                request.approved() ? "approved" : "rejected", managerId, bookingId);
        return bookingMapper.toDto(saved);
    }

    /**
     * Manager checks a student in.
     *
     * <p>Requirements:
     * <ol>
     *   <li>Booking must be in APPROVED status.</li>
     *   <li>Student must have submitted a payment reference.</li>
     * </ol>
     *
     * <p><strong>Soft reminder:</strong> After check-in, the student is notified
     * about any other active bookings (PENDING or APPROVED) they might want to cancel.
     * This is informational only — the system does not auto-cancel them.
     */
    @Transactional
    public BookingDto checkIn(UUID bookingId, UUID managerId) {
        var booking = requireBooking(bookingId);

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new InvalidBookingTransitionException(
                    booking.getStatus().name(), BookingStatus.CHECKED_IN.name());
        }

        if (booking.getPaymentRef() == null || booking.getPaymentRef().isBlank()) {
            throw new IllegalStateException(
                    "Cannot check in: the student has not submitted a payment reference yet.");
        }

        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setCheckedInAt(LocalDateTime.now());
        var saved = bookingMapper.toDto(bookingRepository.save(booking));

        notificationService.notifyCheckedIn(booking.getStudent(), bookingId);

        // Soft reminder: list any other active bookings so the student can clean them up
        sendOtherActiveBookingsReminder(booking.getStudent().getId(), bookingId);

        log.info("Check-in: bookingId={}, managerId={}", bookingId, managerId);
        return saved;
    }

    /**
     * Manager checks a student out. Frees the bed and triggers waitlist.
     */
    @Transactional
    public BookingDto checkOut(UUID bookingId, UUID managerId) {
        var booking = requireBooking(bookingId);

        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new InvalidBookingTransitionException(
                    booking.getStatus().name(), BookingStatus.CHECKED_OUT.name());
        }

        booking.setStatus(BookingStatus.CHECKED_OUT);
        booking.setCheckedOutAt(LocalDateTime.now());
        bookingRepository.save(booking);

        releaseRoomBed(booking.getRoom());
        notificationService.notifyCheckedOut(booking.getStudent(), bookingId);

        log.info("Check-out: bookingId={}, managerId={}", bookingId, managerId);
        return bookingMapper.toDto(bookingRepository.findByIdWithDetails(bookingId).orElseThrow());
    }

    // -------------------------------------------------------------------------
    // Read operations
    // -------------------------------------------------------------------------

    /** Student's full booking history — all statuses, newest first. */
    @Transactional(readOnly = true)
    public Page<BookingSummaryDto> myBookings(UUID studentId, Pageable pageable) {
        return bookingRepository.findByStudentId(studentId, pageable)
                .map(bookingMapper::toSummaryDto);
    }

    /** Full booking detail — students see only their own; managers/admins see any. */
    @Transactional(readOnly = true)
    public BookingDto getBookingById(UUID bookingId, UUID requesterId, boolean isManagerOrAdmin) {
        var booking = requireBooking(bookingId);
        if (!isManagerOrAdmin && !booking.getStudent().getId().equals(requesterId)) {
            throw new HostelAccessDeniedException();
        }
        return bookingMapper.toDto(booking);
    }

    /** Manager: pending bookings for their hostels, oldest first (FIFO). */
    @Transactional(readOnly = true)
    public Page<BookingSummaryDto> pendingBookingsForManager(UUID managerId, Pageable pageable) {
        return bookingRepository.findPendingByManagerId(managerId, pageable)
                .map(bookingMapper::toSummaryDto);
    }

    /** Admin/Manager: all bookings for a hostel with optional status filter. */
    @Transactional(readOnly = true)
    public Page<BookingSummaryDto> bookingsByHostel(UUID hostelId, String status, Pageable pageable) {
        return bookingRepository.findByHostelId(hostelId, status, pageable)
                .map(bookingMapper::toSummaryDto);
    }

    /**
     * Used by {@code ComplaintService} to gate room-level complaint creation.
     * A student may only complain about a room they are currently checked into.
     */
    public boolean isCurrentResident(UUID userId, Complaint complaint) {
        return bookingRepository.existsByStudentIdAndStatusAndRoom_Hostel_Id(
                userId, BookingStatus.CHECKED_IN, complaint.getHostel().getId());
    }

    // -------------------------------------------------------------------------
    // Package-visible — called by BookingExpiredSweeper
    // -------------------------------------------------------------------------

    /**
     * Expires a single APPROVED booking whose payment deadline has elapsed.
     * Called by {@link com.leroy.hostelbackend.shared.scheduler.BookingExpiredSweeper} for each booking in the expired set.
     *
     * <p>Runs in its own transaction ({@code REQUIRES_NEW} is on the sweeper's caller)
     * so a failure on one booking does not roll back the others.
     */
    @Transactional
    public void expireBooking(Booking booking) {
        // Re-fetch inside this transaction for safe modification
        var fresh = bookingRepository.findByIdWithDetails(booking.getId()).orElse(null);
        if (fresh == null || fresh.getStatus() != BookingStatus.APPROVED) {
            // Already actioned between the sweeper's query and now — skip
            return;
        }

        fresh.setStatus(BookingStatus.EXPIRED);
        bookingRepository.save(fresh);

        // Free the bed that was locked on approval
        releaseRoomBed(fresh.getRoom());

        notificationService.notifyBookingExpired(fresh.getStudent(), fresh.getId());

        log.info("[SWEEPER] Booking expired: id={}, student={}, room={}",
                fresh.getId(), fresh.getStudent().getId(), fresh.getRoom().getRoomNumber());
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Approves the booking, locks the bed, and sets the payment expiry deadline.
     * Uses PESSIMISTIC_WRITE lock on Room to serialise concurrent approvals.
     */
    private void approveBooking(Booking booking, int gracePeriodHours) {
        var room = roomRepository.findByIdForUpdate(booking.getRoom().getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Room not found: " + booking.getRoom().getId()));

        // Re-check after acquiring lock — another approval may have just filled the last bed
        if (room.getStatus() != RoomStatus.AVAILABLE) {
            throw new RoomFullyOccupiedException(room.getRoomNumber());
        }

        // Lock the bed immediately
        room.setCurrentOccupancy((short) (room.getCurrentOccupancy() + 1));
        roomService.recalculateRoomStatus(room);
        roomRepository.save(room);

        booking.setStatus(BookingStatus.APPROVED);
        booking.setApprovedAt(LocalDateTime.now());
        booking.setPaymentExpiresAt(LocalDateTime.now().plusHours(gracePeriodHours));

        notificationService.notifyBookingApproved(
                booking.getStudent(), booking.getId(), gracePeriodHours);
    }

    /**
     * Rejects the booking. Beds are not touched (capacity was never incremented
     * for PENDING bookings). Waitlist is notified.
     */
    private void rejectBooking(Booking booking, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("A rejection reason is required.");
        }
        booking.setStatus(BookingStatus.REJECTED);
        booking.setRejectedAt(LocalDateTime.now());
        booking.setRejectedReason(reason.trim());

        notificationService.notifyBookingRejected(
                booking.getStudent(), booking.getId(), reason);

        // Rejection signals that this hostel may have capacity — notify waitlist
        waitlistService.notifyNextInLine(booking.getRoom().getHostel().getId());
    }

    /**
     * Decrements room occupancy and recalculates status after a bed is freed.
     * Triggers the waitlist in the same transaction.
     */
    private void releaseRoomBed(Room room) {
        var locked = roomRepository.findByIdForUpdate(room.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Room not found: " + room.getId()));

        short newOccupancy = (short) Math.max(0, locked.getCurrentOccupancy() - 1);
        locked.setCurrentOccupancy(newOccupancy);
        roomService.recalculateRoomStatus(locked);
        roomRepository.save(locked);

        waitlistService.notifyNextInLine(locked.getHostel().getId());
    }

    /**
     * Sends a soft reminder to the student listing their other active bookings
     * (excluding the one they just checked into). This is informational — the
     * system does not cancel anything automatically.
     */
    private void sendOtherActiveBookingsReminder(UUID studentId, UUID checkedInBookingId) {
        List<Booking> otherActive = bookingRepository.findActiveByStudentId(studentId)
                .stream()
                .filter(b -> !b.getId().equals(checkedInBookingId))
                .toList();

        if (!otherActive.isEmpty()) {
            notificationService.notifyOtherActiveBookingsReminder(studentId, otherActive.size());
            log.info("[REMINDER] Student {} has {} other active booking(s) after check-in",
                    studentId, otherActive.size());
        }
    }

    private Booking requireBooking(UUID id) {
        return bookingRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));
    }

    private User requireUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }
}