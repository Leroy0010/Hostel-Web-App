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
import java.time.Year;
import java.util.List;
import java.util.UUID;

/**
 * Core booking engine — period-scoped capacity, multi-booking per student,
 * robust state machine, crash-free occupancy tracking.
 *
 * <hr>
 *
 * <h2>Occupancy split — the key architectural fix</h2>
 * <ul>
 *   <li><strong>{@code room.currentOccupancy}</strong> — physical beds occupied
 *       right now. Incremented <strong>only</strong> at {@code CHECKED_IN}.
 *       Decremented <strong>only</strong> at {@code CHECKED_OUT}.
 *       Never touched at APPROVED. Backed by
 *       {@code CHECK (current_occupancy <= capacity)} in the DB.</li>
 *   <li><strong>{@link BookingRepository#countReservedBeds}</strong> —
 *       period-scoped availability. Counts {@code APPROVED} + {@code CHECKED_IN}
 *       rows for a specific {@code (roomId, academicYear, semester)} tuple.
 *       Used for all booking-capacity decisions.</li>
 * </ul>
 *
 * <h2>State machine</h2>
 * <pre>
 *   PENDING    → APPROVED      manager approves + sets grace period
 *   PENDING    → REJECTED      manager rejects  — reason required
 *   PENDING    → CANCELLED     student self-cancels
 *   PENDING    → EXPIRED       sweeper: waitlist draft pendingExpiresAt elapsed
 *   APPROVED   → CHECKED_IN    manager — paymentRef required; increments currentOccupancy
 *   APPROVED   → CANCELLED     student self-cancels
 *   APPROVED   → EXPIRED       sweeper: paymentExpiresAt elapsed, no paymentRef
 *   CHECKED_IN → CHECKED_OUT   manager — decrements currentOccupancy + triggers waitlist
 * </pre>
 *
 * <h2>When the waitlist IS promoted (a locked slot was freed)</h2>
 * <ul>
 *   <li>{@code APPROVED → CANCELLED} — period slot was locked at approval; freeing it
 *       means a real vacancy exists for the waiting queue.</li>
 *   <li>{@code APPROVED → EXPIRED}   — same reasoning; slot locked, now freed.</li>
 *   <li>{@code CHECKED_IN → CHECKED_OUT} — physical bed freed; period slot freed.</li>
 *   <li>Waitlist draft {@code EXPIRED} — next in queue promoted automatically.</li>
 * </ul>
 *
 * <h2>When the waitlist is NOT promoted</h2>
 * <ul>
 *   <li>{@code PENDING → REJECTED} — PENDING never locks a period slot.
 *       Rejecting a PENDING booking releases nothing. Promoting the waitlist here
 *       would auto-draft a student into a room that is still full, creating
 *       redundant noise and competing PENDING bookings for the manager.</li>
 *   <li>{@code PENDING → CANCELLED} — same reason; no slot was ever held.</li>
 * </ul>
 *
 * <h2>Semester linearity rules (per-student, per-room)</h2>
 * <ul>
 *   <li><strong>FIRST</strong>  — no constraint; always bookable (subject to capacity).</li>
 *   <li><strong>SECOND</strong> — room must already have a CHECKED_IN or CHECKED_OUT
 *       booking for FIRST semester of the same year.</li>
 *   <li><strong>FULL</strong>   — blocked only if this student already holds an active
 *       FIRST or SECOND booking for the same room+year. Other students' bookings do
 *       not affect FULL availability — the capacity check handles that.</li>
 * </ul>
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

    // =========================================================================
    // Student actions
    // =========================================================================

    /**
     * Submits a new booking request in {@link BookingStatus#PENDING} status.
     *
     * <p>Validation order (fails fast on first violation):
     * <ol>
     *   <li>Academic year format and range.</li>
     *   <li>Semester linearity — SECOND gate; FULL self-conflict gate.</li>
     *   <li>Room not blocked (UNDER_MAINTENANCE or RESERVED).</li>
     *   <li>Duplicate guard — student cannot hold two active bookings for the
     *       same room in the same period.</li>
     *   <li>Period capacity — countReservedBeds ≥ capacity → full.</li>
     * </ol>
     *
     * @param studentId UUID of the authenticated student
     * @param request   the validated booking request body
     * @return the persisted {@link BookingDto}
     */
    @Transactional
    public BookingDto createBooking(UUID studentId, CreateBookingRequest request) {
        validateAcademicYear(request.academicYear());
        validateSemesterLinearity(studentId, request);

        var room = roomRepository.findByIdWithHostel(request.roomId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Room not found: " + request.roomId()));

        // Rooms taken offline by management are not a capacity issue
        if (room.getStatus() == RoomStatus.UNDER_MAINTENANCE
                || room.getStatus() == RoomStatus.RESERVED) {
            throw new RoomFullyOccupiedException(
                    "Room " + room.getRoomNumber() + " is currently unavailable.");
        }

        // One student cannot hold two active bookings for the same room + period
        if (bookingRepository.hasActiveBookingForRoom(
                studentId, request.roomId(),
                request.academicYear(), request.semester())) {
            throw new BookingAlreadyExistsException(
                    "You already have an active booking for room " + room.getRoomNumber()
                            + " in " + request.semester() + " " + request.academicYear() + ".");
        }

        // Period-scoped capacity: APPROVED + CHECKED_IN only
        long reservedBeds = bookingRepository.countReservedBeds(
                request.roomId(), request.academicYear(), request.semester());
        if (reservedBeds >= room.getCapacity()) {
            throw new RoomFullyOccupiedException(room.getRoomNumber());
        }

        var student = requireUser(studentId);
        var booking = Booking.createBooking(request, student, room);
        var saved   = bookingRepository.save(booking);

        // Alert the hostel manager about the new request
        userRepository.findManagerByHostelId(room.getHostel().getId())
                .ifPresent(manager -> notificationService.notifyManagerNewBookingRequest(
                        manager, student.getName(), room.getRoomNumber(), saved.getId()));

        log.info("Booking created: id={}, student={}, room={} [{} {}]",
                saved.getId(), studentId, room.getRoomNumber(),
                request.academicYear(), request.semester());
        return bookingMapper.toDto(saved);
    }

    /**
     * Student cancels their own PENDING or APPROVED booking.
     *
     * <p><strong>Waitlist promotion rule:</strong>
     * <ul>
     *   <li>PENDING cancelled → no period slot was ever locked → waitlist NOT promoted.
     *       Promoting here would send a student to a room that is still full,
     *       creating a spurious draft booking.</li>
     *   <li>APPROVED cancelled → period slot was locked at approval → waitlist IS
     *       promoted because a genuine vacancy now exists.</li>
     * </ul>
     *
     * @param bookingId the booking to cancel
     * @param studentId must match the booking's student
     */
    @Transactional
    public BookingDto cancelBooking(UUID bookingId, UUID studentId) {
        var booking = requireBooking(bookingId);

        if (!booking.getStudent().getId().equals(studentId)) {
            throw new HostelAccessDeniedException();
        }

        var current = booking.getStatus();
        if (current != BookingStatus.PENDING && current != BookingStatus.APPROVED) {
            throw new InvalidBookingTransitionException(
                    current.name(), BookingStatus.CANCELLED.name());
        }

        booking.setStatus(BookingStatus.CANCELLED);
        var saved = bookingRepository.save(booking);

        if (current == BookingStatus.APPROVED) {
            /*
             * APPROVED → CANCELLED: a period slot was locked at approval time.
             * Freeing it creates a genuine vacancy, so we promote the waitlist.
             * Note: currentOccupancy is NOT decremented here because APPROVED
             * never incremented it — only CHECKED_IN does.
             */
            waitlistService.promoteNextInLine(
                    booking.getRoom().getHostel().getId(),
                    booking.getRoom(),
                    booking.getAcademicYear(),
                    booking.getSemester()
            );
        }
        // PENDING → CANCELLED: no slot was ever locked, nothing to free.

        notificationService.notifyBookingCancelled(booking.getStudent(), bookingId);
        log.info("Booking cancelled by student: id={}, previousStatus={}", bookingId, current);
        return bookingMapper.toDto(saved);
    }

    /**
     * Student submits their external payment reference after a booking is APPROVED.
     *
     * <p>No payment gateway is involved. The student provides a transaction reference
     * (Mobile Money ID, bank slip number, etc.) which the manager verifies offline
     * before allowing check-in. Submitting a reference does <strong>not</strong>
     * trigger check-in.
     *
     * @param bookingId the approved booking
     * @param studentId must match the booking's student
     * @param request   payment reference and declared amount
     * @throws InvalidBookingTransitionException if the booking is not APPROVED
     * @throws IllegalStateException             if the payment deadline has elapsed
     */
    @Transactional
    public BookingDto submitPayment(UUID bookingId, UUID studentId,
                                    SubmitPaymentRequest request) {
        var booking = requireBooking(bookingId);

        if (!booking.getStudent().getId().equals(studentId)) {
            throw new HostelAccessDeniedException();
        }

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new InvalidBookingTransitionException(
                    booking.getStatus().name(), "PAYMENT_SUBMISSION");
        }

        // Safety check: deadline may have elapsed before the sweeper ran
        if (booking.getPaymentExpiresAt() != null
                && LocalDateTime.now().isAfter(booking.getPaymentExpiresAt())) {
            throw new IllegalStateException(
                    "Your payment deadline has passed. This booking will be expired shortly.");
        }

        booking.setPaymentRef(request.paymentRef());
        booking.setAmountPaid(request.amountPaid());
        var saved = bookingRepository.save(booking);

        // Alert the manager that proof of payment is ready for offline verification
        userRepository.findManagerByHostelId(booking.getRoom().getHostel().getId())
                .ifPresent(manager -> notificationService.notifyManagerPaymentSubmitted(
                        manager,
                        booking.getStudent().getName(),
                        booking.getRoom().getRoomNumber(),
                        saved.getId()
                ));

        log.info("Payment reference submitted: bookingId={}", bookingId);
        return bookingMapper.toDto(saved);
    }

    // =========================================================================
    // Manager actions
    // =========================================================================

    /**
     * Manager approves or rejects a PENDING booking.
     *
     * <h3>On approval</h3>
     * <ol>
     *   <li>Acquires PESSIMISTIC_WRITE lock on the room row to serialise
     *       concurrent manager approvals.</li>
     *   <li>Re-runs period-capacity check after the lock — a race may have
     *       filled the last bed between page-load and click.</li>
     *   <li>Sets {@code paymentExpiresAt = now + gracePeriodHours}.</li>
     *   <li>Does <strong>NOT</strong> touch {@code room.currentOccupancy} —
     *       physical occupancy is only tracked at CHECKED_IN.</li>
     *   <li>If this approval fills the last period slot, bulk-rejects all
     *       other PENDING bookings for the same room+period.</li>
     * </ol>
     *
     * <h3>On rejection</h3>
     * <p>No beds or period slots are touched — PENDING never locks capacity.
     * The waitlist is <strong>NOT</strong> promoted because there is no vacancy
     * to fill; the rejected student's PENDING booking held nothing.
     *
     * @param bookingId the booking to action
     * @param managerId the acting manager's UUID
     * @param request   approved/rejectedReason/gracePeriodHours
     */
    @Transactional
    public BookingDto actionBooking(UUID bookingId, UUID managerId,
                                    ActionBookingRequest request) {
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
     * <p>This is the <strong>only place</strong> {@code room.currentOccupancy} is
     * incremented. Physical occupancy tracks who is actually in the room, not who
     * is merely approved.
     *
     * <p>After check-in the student receives a soft reminder about any other
     * still-active bookings they may want to cancel.
     *
     * @param bookingId the booking to check in
     * @param managerId the acting manager's UUID
     * @throws InvalidBookingTransitionException if the booking is not APPROVED
     * @throws IllegalStateException             if no payment reference has been submitted
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

        // Increment physical occupancy — student is now physically in the room
        var room = roomRepository.findByIdForUpdate(booking.getRoom().getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Room not found: " + booking.getRoom().getId()));
        room.setCurrentOccupancy((short) (room.getCurrentOccupancy() + 1));
        roomService.recalculateRoomStatus(room);
        roomRepository.save(room);

        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setCheckedInAt(LocalDateTime.now());
        bookingRepository.save(booking);

        notificationService.notifyCheckedIn(booking.getStudent(), bookingId);
        sendOtherActiveBookingsReminder(booking.getStudent().getId(), bookingId);

        log.info("Check-in: bookingId={}, managerId={}, room={}",
                bookingId, managerId, room.getRoomNumber());
        return bookingMapper.toDto(bookingRepository.findByIdWithDetails(bookingId).orElseThrow());
    }

    /**
     * Manager checks a student out.
     *
     * <p>This is the <strong>only place</strong> {@code room.currentOccupancy} is
     * decremented. After decrement the room-type-scoped waitlist is promoted so
     * the next matching student receives an auto-drafted PENDING booking.
     *
     * @param bookingId the booking to check out
     * @param managerId the acting manager's UUID
     * @throws InvalidBookingTransitionException if the booking is not CHECKED_IN
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

        // Decrement physical occupancy and promote the waitlist atomically
        releasePhysicalBed(
                booking.getRoom(),
                booking.getAcademicYear(),
                booking.getSemester()
        );

        notificationService.notifyCheckedOut(booking.getStudent(), bookingId);
        log.info("Check-out: bookingId={}, managerId={}", bookingId, managerId);
        return bookingMapper.toDto(bookingRepository.findByIdWithDetails(bookingId).orElseThrow());
    }

    // =========================================================================
    // Read operations
    // =========================================================================

    /** Paginated booking history for the authenticated student — all statuses. */
    @Transactional(readOnly = true)
    public Page<BookingSummaryDto> myBookings(UUID studentId, BookingStatus status, Pageable pageable) {
        return bookingRepository.findByStudentId(studentId, status, pageable)
                .map(bookingMapper::toSummaryDto);
    }

    /**
     * Full booking detail. Students may only view their own; managers/admins see any.
     *
     * @param bookingId        the booking UUID
     * @param requesterId      the authenticated user's UUID
     * @param isManagerOrAdmin {@code true} if the caller has MANAGER or ADMIN role
     */
    @Transactional(readOnly = true)
    public BookingDto getBookingById(UUID bookingId, UUID requesterId,
                                     boolean isManagerOrAdmin) {
        var booking = requireBooking(bookingId);
        if (!isManagerOrAdmin && !booking.getStudent().getId().equals(requesterId)) {
            throw new HostelAccessDeniedException();
        }
        return bookingMapper.toDto(booking);
    }

    /** Paginated PENDING bookings for the manager's hostels — waitlist drafts first. */
    @Transactional(readOnly = true)
    public Page<BookingSummaryDto> pendingBookingsForManager(UUID managerId,
                                                             Pageable pageable) {
        return bookingRepository.findPendingByManagerId(managerId, pageable)
                .map(bookingMapper::toSummaryDto);
    }

    /**
     * Paginated bookings for a hostel with optional status filter.
     *
     * @param hostelId the hostel UUID
     * @param status   optional filter; {@code null} returns all statuses
     */
    @Transactional(readOnly = true)
    public Page<BookingSummaryDto> bookingsByHostel(UUID hostelId,
                                                    BookingStatus status,
                                                    Pageable pageable) {
        return bookingRepository.findByHostelId(hostelId, status, pageable)
                .map(bookingMapper::toSummaryDto);
    }

    /**
     * Returns {@code true} if the user is currently CHECKED_IN at the hostel
     * of the given complaint. Gates complaint creation in {@code ComplaintService}.
     */
    public boolean isCurrentResident(UUID userId, Complaint complaint) {
        return bookingRepository.existsByStudentIdAndStatusAndRoom_Hostel_Id(
                userId, BookingStatus.CHECKED_IN, complaint.getHostel().getId());
    }

    // =========================================================================
    // Package-visible — called by BookingExpiredSweeper
    // =========================================================================

    /**
     * Expires a single APPROVED booking whose payment deadline has elapsed.
     *
     * <p>APPROVED bookings never incremented {@code currentOccupancy}, so no
     * physical bed needs releasing. The period slot is freed by the status change.
     * The waitlist is promoted because a real period vacancy now exists.
     *
     * @param staleRef lightweight reference from the sweeper query; re-fetched
     *                 by ID with full associations inside this transaction
     */
    @Transactional
    public void expireApprovedBooking(Booking staleRef) {
        var booking = bookingRepository.findByIdWithDetails(staleRef.getId()).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.APPROVED) {
            return; // already actioned between the sweeper read and this transaction
        }

        booking.setStatus(BookingStatus.EXPIRED);
        bookingRepository.save(booking);

        /*
         * APPROVED → EXPIRED: a period slot that was locked at approval is now freed.
         * This is a real vacancy — promote the waitlist.
         * currentOccupancy does NOT change because APPROVED never incremented it.
         */
        waitlistService.promoteNextInLine(
                booking.getRoom().getHostel().getId(),
                booking.getRoom(),
                booking.getAcademicYear(),
                booking.getSemester()
        );

        notificationService.notifyBookingExpired(booking.getStudent(), booking.getId());
        log.info("[SWEEPER] APPROVED booking expired: id={}, student={}, room={}",
                booking.getId(), booking.getStudent().getId(),
                booking.getRoom().getRoomNumber());
    }

    /**
     * Expires a waitlist-draft PENDING booking whose manager action window elapsed.
     *
     * <p>PENDING bookings never touch physical occupancy or lock period slots.
     * The next student in the room-type queue is promoted to fill the gap.
     *
     * @param staleRef lightweight reference from the sweeper query
     */
    @Transactional
    public void expireWaitlistDraft(Booking staleRef) {
        var booking = bookingRepository.findByIdWithDetails(staleRef.getId()).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.PENDING) {
            return;
        }

        booking.setStatus(BookingStatus.EXPIRED);
        booking.setRejectedReason(
                "Waitlist draft expired — manager did not action within the allowed window.");
        booking.setRejectedAt(LocalDateTime.now());
        bookingRepository.save(booking);

        // Draft expired: the spot is re-opened, promote the next in queue
        waitlistService.promoteNextInLine(
                booking.getRoom().getHostel().getId(),
                booking.getRoom(),
                booking.getAcademicYear(),
                booking.getSemester()
        );

        log.info("[SWEEPER] Waitlist draft expired: id={}, student={}, room={}",
                booking.getId(), booking.getStudent().getId(),
                booking.getRoom().getRoomNumber());
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    /**
     * Core approval logic.
     *
     * <p>Uses PESSIMISTIC_WRITE lock to serialise concurrent manager approvals.
     * Capacity is checked via {@code countReservedBeds} (period-scoped), not via
     * {@code room.currentOccupancy} (physical). This is what enables forward
     * bookings: Room 101 can be approved for SECOND semester while a student is
     * CHECKED_IN for FIRST semester — they are independent period windows.
     *
     * <p>{@code room.currentOccupancy} is <strong>NOT</strong> modified here.
     *
     * @param booking          the PENDING booking to approve
     * @param gracePeriodHours hours until the student's payment deadline
     */
    private void approveBooking(Booking booking, int gracePeriodHours) {
        var room = roomRepository.findByIdForUpdate(booking.getRoom().getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Room not found: " + booking.getRoom().getId()));

        // Re-check period capacity after acquiring the lock (race safety)
        long reservedBeds = bookingRepository.countReservedBeds(
                room.getId(), booking.getAcademicYear(), booking.getSemester());
        if (reservedBeds >= room.getCapacity()) {
            throw new RoomFullyOccupiedException(room.getRoomNumber());
        }

        // Update booking state — physical occupancy is NOT touched here
        booking.setStatus(BookingStatus.APPROVED);
        booking.setApprovedAt(LocalDateTime.now());
        booking.setPaymentExpiresAt(LocalDateTime.now().plusHours(gracePeriodHours));

        // If this approval fills the last period slot, clean up competing PENDING bookings
        long newReservedBeds = reservedBeds + 1;
        if (newReservedBeds >= room.getCapacity()) {
            int rejectedCount = bookingRepository.rejectOtherPendingForRoom(
                    room.getId(),
                    booking.getAcademicYear(),
                    booking.getSemester(),
                    booking.getId(),
                    "Room is now fully booked for this period.",
                    LocalDateTime.now()
            );
            if (rejectedCount > 0) {
                log.info("[AUTO-REJECT] {} stale PENDING booking(s) rejected for room {} [{} {}]",
                        rejectedCount, room.getRoomNumber(),
                        booking.getAcademicYear(), booking.getSemester());
            }
        }

        notificationService.notifyBookingApproved(
                booking.getStudent(), booking.getId(), gracePeriodHours);
    }

    /**
     * Rejects the booking.
     *
     * <p>PENDING never locks a period slot, so rejection frees nothing.
     * The waitlist is <strong>NOT</strong> promoted — there is no vacancy.
     * Promoting on rejection would auto-draft a student into a still-full room,
     * creating a spurious booking that will immediately compete with existing
     * PENDING bookings and confuse both the student and the manager.
     *
     * @param booking the PENDING booking to reject
     * @param reason  non-blank rejection reason
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

        /*
         * Intentionally NOT calling waitlistService.promoteNextInLine() here.
         *
         * Reason: PENDING → REJECTED frees no period slot and no physical bed.
         * The room's countReservedBeds is unchanged. Promoting the waitlist would
         * create an auto-draft booking for a room that is still full — the manager
         * would immediately need to reject that draft too, causing an infinite
         * rejection loop through the queue with zero benefit.
         */
    }

    /**
     * Decrements physical occupancy and recalculates room status.
     * Called <strong>exclusively</strong> from {@link #checkOut}.
     *
     * <p>After decrement the room-type-scoped waitlist is promoted so the next
     * waiting student gets an auto-drafted booking for the freed bed.
     *
     * @param room         the room being vacated
     * @param academicYear the period of the checkout
     * @param semester     the semester of the checkout
     */
    private void releasePhysicalBed(Room room, String academicYear, String semester) {
        var locked = roomRepository.findByIdForUpdate(room.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Room not found: " + room.getId()));

        short newOccupancy = (short) Math.max(0, locked.getCurrentOccupancy() - 1);
        locked.setCurrentOccupancy(newOccupancy);
        roomService.recalculateRoomStatus(locked);
        roomRepository.save(locked);

        // Physical bed freed = real vacancy for the room-type-scoped waitlist
        waitlistService.promoteNextInLine(
                locked.getHostel().getId(), locked, academicYear, semester);
    }

    /**
     * Sends a soft reminder to the student about any other still-active
     * (PENDING or APPROVED) bookings they may want to cancel after check-in.
     * Informational only — nothing is auto-cancelled.
     *
     * @param studentId          the student who just checked in
     * @param checkedInBookingId excluded from the "other bookings" list
     */
    private void sendOtherActiveBookingsReminder(UUID studentId, UUID checkedInBookingId) {
        List<Booking> others = bookingRepository.findActiveByStudentId(studentId)
                .stream()
                .filter(b -> !b.getId().equals(checkedInBookingId))
                .toList();

        if (!others.isEmpty()) {
            notificationService.notifyOtherActiveBookingsReminder(studentId, others.size());
            log.info("[REMINDER] Student {} has {} other active booking(s) after check-in",
                    studentId, others.size());
        }
    }

    // =========================================================================
    // Validation helpers
    // =========================================================================

    /**
     * Validates the academic year string.
     *
     * <p>Rules:
     * <ul>
     *   <li>Must match {@code YYYY/YYYY}.</li>
     *   <li>Second year = first year + 1 (consecutive only).</li>
     *   <li>Start year within ±1 of current calendar year.</li>
     * </ul>
     *
     * @param academicYear the string to validate
     * @throws IllegalArgumentException if any rule is violated
     */
    private void validateAcademicYear(String academicYear) {
        if (academicYear == null || !academicYear.matches("^\\d{4}/\\d{4}$")) {
            throw new IllegalArgumentException(
                    "Academic year must be in the format YYYY/YYYY, e.g. '2025/2026'.");
        }
        String[] parts     = academicYear.split("/");
        int      startYear = Integer.parseInt(parts[0]);
        int      endYear   = Integer.parseInt(parts[1]);

        if (endYear != startYear + 1) {
            throw new IllegalArgumentException(
                    "Invalid academic year: years must be consecutive (e.g. 2025/2026).");
        }
        int currentYear = Year.now().getValue();
        if (startYear < currentYear - 1 || startYear > currentYear + 1) {
            throw new IllegalArgumentException(
                    "Academic year '" + academicYear
                            + "' is outside the permitted booking window.");
        }
    }

    /**
     * Enforces semester ordering rules.
     *
     * <h3>SECOND semester</h3>
     * <p>The room must have a CHECKED_IN or CHECKED_OUT booking for FIRST semester
     * of the same year. Approval-only is not enough — the first semester must
     * have been physically lived in. This prevents skipping the first semester.
     *
     * <h3>FULL semester</h3>
     * <p>This student must not already hold an active FIRST or SECOND booking for
     * the same room in the same year. Other students' bookings do not matter here
     * — the period capacity check handles that. This guard prevents only a single
     * student from holding overlapping semester bookings (FIRST + FULL, etc.)
     *
     * <h3>FIRST semester</h3>
     * <p>No linearity constraint.
     *
     * @param studentId the student attempting the booking
     * @param request   the booking request
     * @throws IllegalArgumentException if a linearity rule is violated
     */
    private void validateSemesterLinearity(UUID studentId, CreateBookingRequest request) {
        String semester    = request.semester();
        UUID   roomId      = request.roomId();
        String academicYear = request.academicYear();

        if ("SECOND".equals(semester)) {
            if (!bookingRepository.hasFirstSemesterOccupancy(roomId, academicYear)) {
                throw new IllegalArgumentException(
                        "Cannot book SECOND semester for " + academicYear
                                + " — this room has no FIRST semester booking that has been "
                                + "checked in or checked out.");
            }
        }

        if ("FULL".equals(semester)) {
            // Block only if THIS student already has a partial booking for this room+year
            if (bookingRepository.studentHasSemesterBookingForYear(
                    studentId, roomId, academicYear)) {
                throw new IllegalArgumentException(
                        "Cannot book a FULL year for " + academicYear
                                + " — you already have an active FIRST or SECOND semester "
                                + "booking for this room in this academic year.");
            }
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