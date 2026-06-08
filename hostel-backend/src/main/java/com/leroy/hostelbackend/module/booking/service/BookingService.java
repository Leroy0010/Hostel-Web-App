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
 * Core booking engine — period-scoped, multi-booking, robust state machine.
 *
 * <p><strong>State machine:</strong>
 * <pre>
 *   PENDING  → APPROVED     (manager approves + sets grace period hours)
 *   PENDING  → REJECTED     (manager rejects — reason required)
 *   PENDING  → CANCELLED    (student cancels)
 *   PENDING  → EXPIRED      (sweeper: pendingExpiresAt elapsed on a waitlist draft)
 *   APPROVED → CHECKED_IN   (manager checks in — paymentRef must be present)
 *   APPROVED → CANCELLED    (student cancels an approved booking)
 *   APPROVED → EXPIRED      (sweeper: paymentExpiresAt elapsed, no paymentRef)
 *   CHECKED_IN → CHECKED_OUT (manager checks student out)
 * </pre>
 *
 * <p><strong>Period-scoped capacity:</strong>
 * Room availability for a booking is checked against the specific
 * {@code (roomId, academicYear, semester)} tuple via {@link BookingRepository#countReservedBeds}.
 * This allows future semesters to be booked while the current semester is occupied
 * — the key enabler of end-of-semester forward-booking.
 *
 * <p><strong>Semester linearity rules:</strong>
 * <ul>
 *   <li>SECOND semester booking requires that FIRST semester already has a
 *       CHECKED_IN or CHECKED_OUT booking for the same room and academic year.</li>
 *   <li>FULL semester booking is blocked if any active booking exists for the year.</li>
 *   <li>Academic year must be current year or next year (±1 tolerance).</li>
 *   <li>Year must be consecutive (e.g. 2025/2026, never 2025/2027).</li>
 * </ul>
 *
 * <p><strong>Auto-reject stale PENDING:</strong>
 * When approval fills the last bed for a period,
 * {@link BookingRepository#rejectOtherPendingForRoom} bulk-rejects all remaining
 * PENDING bookings for that room+period so students are not left waiting indefinitely.
 *
 * <p><strong>Auto-draft waitlist promotion:</strong>
 * When a bed is freed, {@link WaitlistService#promoteNextInLine} is called
 * in the same transaction. It creates a PENDING booking for the next student
 * in the period-scoped waitlist and notifies both the student and the manager.
 *
 * <p><strong>Multiple bookings per student:</strong>
 * Students may hold bookings for multiple rooms simultaneously. The only constraint
 * is they cannot have two active bookings for the <em>same room</em> in the same period.
 *
 * <p><strong>Soft reminder on check-in:</strong>
 * After check-in the student is notified of any other still-active (PENDING / APPROVED)
 * bookings so they can cancel the ones they no longer need.
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
     * <p>Validation sequence:
     * <ol>
     *   <li>Academic year format and range.</li>
     *   <li>Semester linearity (SECOND requires FIRST to be occupied; FULL requires year clear).</li>
     *   <li>Room is AVAILABLE (not UNDER_MAINTENANCE / RESERVED).</li>
     *   <li>Duplicate room guard (same room, same period, same student).</li>
     *   <li>Period capacity check (reserved beds vs physical capacity).</li>
     * </ol>
     *
     * @param studentId the requesting student's UUID
     * @param request   validated booking payload
     */
    @Transactional
    public BookingDto createBooking(UUID studentId, CreateBookingRequest request) {
        validateAcademicYear(request.academicYear());
        validateSemesterLinearity(request);

        var room = roomRepository.findByIdWithHostel(request.roomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + request.roomId()));

        // Room must not be blocked for maintenance or reserved by admin
        if (room.getStatus() == RoomStatus.UNDER_MAINTENANCE
                || room.getStatus() == RoomStatus.RESERVED) {
            throw new RoomFullyOccupiedException(
                    "Room " + room.getRoomNumber() + " is currently unavailable.");
        }

        // Prevent the same student booking the same room twice in the same period
        if (bookingRepository.hasActiveBookingForRoom(
                studentId, request.roomId(), request.academicYear(), request.semester())) {
            throw new BookingAlreadyExistsException(
                    "You already have an active booking for room " + room.getRoomNumber()
                            + " in " + request.semester() + " semester, " + request.academicYear() + ".");
        }

        // Period capacity: count APPROVED + CHECKED_IN for this room+period
        long reservedBeds = bookingRepository.countReservedBeds(
                request.roomId(), request.academicYear(), request.semester());
        if (reservedBeds >= room.getCapacity()) {
            throw new RoomFullyOccupiedException(room.getRoomNumber());
        }

        var student = requireUser(studentId);
        var booking = Booking.createBooking(request, student, room);
        var saved   = bookingRepository.save(booking);

        // Notify the hostel manager about the new request
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
            releaseRoomBed(booking.getRoom(), booking.getAcademicYear(), booking.getSemester());
        }

        notificationService.notifyBookingCancelled(booking.getStudent(), bookingId);
        log.info("Booking cancelled by student: id={}", bookingId);
        return bookingMapper.toDto(saved);
    }

    /**
     * Student submits their external payment reference after the booking is APPROVED.
     *
     * <p>No payment gateway is involved. The manager verifies the reference offline
     * before allowing check-in. Submitting a reference does NOT trigger check-in —
     * the manager must still explicitly call {@link #checkIn}.
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
            throw new InvalidBookingTransitionException(
                    booking.getStatus().name(), "PAYMENT_SUBMISSION");
        }

        // Safety check — deadline may have elapsed before the sweeper ran
        if (booking.getPaymentExpiresAt() != null
                && LocalDateTime.now().isAfter(booking.getPaymentExpiresAt())) {
            throw new IllegalStateException(
                    "Your payment deadline has passed. This booking will be expired shortly.");
        }

        booking.setPaymentRef(request.paymentRef());
        booking.setAmountPaid(request.amountPaid());
        var saved = bookingRepository.save(booking);

        // Notify the manager that payment proof is ready for verification
        userRepository.findManagerByHostelId(booking.getRoom().getHostel().getId())
                .ifPresent(manager -> notificationService.notifyManagerPaymentSubmitted(
                        manager, booking.getStudent().getName(),
                        booking.getRoom().getRoomNumber(), saved.getId()));

        log.info("Payment reference submitted: bookingId={}, ref={}", bookingId, request.paymentRef());
        return bookingMapper.toDto(saved);
    }

    // -------------------------------------------------------------------------
    // Manager actions
    // -------------------------------------------------------------------------

    /**
     * Manager approves or rejects a PENDING booking.
     *
     * <p><strong>On approval:</strong>
     * <ol>
     *   <li>Room is loaded with a PESSIMISTIC_WRITE lock to serialise concurrent approvals.</li>
     *   <li>Period capacity is re-checked after the lock is acquired.</li>
     *   <li>{@code room.currentOccupancy} is incremented for physical tracking.</li>
     *   <li>{@code paymentExpiresAt} is set to {@code now + gracePeriodHours}.</li>
     *   <li>If the room is now full for this period, all other PENDING bookings
     *       for the same room+period are bulk-rejected (auto-reject).</li>
     * </ol>
     *
     * <p><strong>On rejection:</strong>
     * Beds are unaffected. Waitlist for the period is notified.
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
     *   <li>Booking must be APPROVED.</li>
     *   <li>Student must have submitted a payment reference.</li>
     * </ol>
     *
     * <p>After check-in the student receives a soft reminder listing any other
     * still-active bookings they may want to cancel.
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
        bookingRepository.save(booking);

        notificationService.notifyCheckedIn(booking.getStudent(), bookingId);
        sendOtherActiveBookingsReminder(booking.getStudent().getId(), bookingId);

        log.info("Check-in: bookingId={}, managerId={}", bookingId, managerId);
        return bookingMapper.toDto(bookingRepository.findByIdWithDetails(bookingId).orElseThrow());
    }

    /**
     * Manager checks a student out.
     * Decrements physical occupancy and triggers period-scoped waitlist promotion.
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

        releaseRoomBed(booking.getRoom(), booking.getAcademicYear(), booking.getSemester());
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

    /** Manager: PENDING bookings for their hostels — waitlist drafts sorted first, then FIFO. */
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
     * Gates complaint creation — student must be CHECKED_IN at the hostel.
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
     * Called by {@link com.leroy.hostelbackend.shared.scheduler.BookingExpiredSweeper} for each expired booking.
     * Runs in its own transaction so one failure does not roll back the whole batch.
     */
    @Transactional
    public void expireApprovedBooking(Booking staleRef) {
        var booking = bookingRepository.findByIdWithDetails(staleRef.getId()).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.APPROVED) {
            return; // already actioned between the sweeper's read and now
        }

        booking.setStatus(BookingStatus.EXPIRED);
        bookingRepository.save(booking);

        // Release the bed that was locked on approval
        releaseRoomBed(booking.getRoom(), booking.getAcademicYear(), booking.getSemester());
        notificationService.notifyBookingExpired(booking.getStudent(), booking.getId());

        log.info("[SWEEPER] APPROVED booking expired: id={}, student={}, room={}",
                booking.getId(), booking.getStudent().getId(), booking.getRoom().getRoomNumber());
    }

    /**
     * Expires a waitlist-draft PENDING booking whose manager action window elapsed.
     * Rejects the booking, frees the period slot, and promotes the next student.
     */
    @Transactional
    public void expireWaitlistDraft(Booking staleRef) {
        var booking = bookingRepository.findByIdWithDetails(staleRef.getId()).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.PENDING) {
            return;
        }

        booking.setStatus(BookingStatus.EXPIRED);
        booking.setRejectedReason("Waitlist draft expired — manager did not action within the window.");
        booking.setRejectedAt(LocalDateTime.now());
        bookingRepository.save(booking);

        // Promote the next student in line for this same period
        waitlistService.promoteNextInLine(
                booking.getRoom().getHostel().getId(),
                booking.getRoom(),
                booking.getAcademicYear(),
                booking.getSemester()
        );

        log.info("[SWEEPER] Waitlist draft expired: id={}, student={}, room={}",
                booking.getId(), booking.getStudent().getId(), booking.getRoom().getRoomNumber());
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Approves the booking:
     * <ol>
     *   <li>Acquires a PESSIMISTIC_WRITE lock on the room row.</li>
     *   <li>Re-checks period capacity after the lock — another approval may
     *       have just filled the last bed.</li>
     *   <li>Increments {@code room.currentOccupancy} for physical tracking.</li>
     *   <li>Sets {@code paymentExpiresAt}.</li>
     *   <li>If the room is now full for this period, auto-rejects all other
     *       PENDING bookings for the same room+period.</li>
     * </ol>
     */
    private void approveBooking(Booking booking, int gracePeriodHours) {
        var room = roomRepository.findByIdForUpdate(booking.getRoom().getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Room not found: " + booking.getRoom().getId()));

        // Re-check period capacity after acquiring the pessimistic lock
        long reservedBeds = bookingRepository.countReservedBeds(
                room.getId(), booking.getAcademicYear(), booking.getSemester());
        if (reservedBeds >= room.getCapacity()) {
            throw new RoomFullyOccupiedException(room.getRoomNumber());
        }

        // Increment physical occupancy counter
        room.setCurrentOccupancy((short) (room.getCurrentOccupancy() + 1));
        roomService.recalculateRoomStatus(room);
        roomRepository.save(room);

        booking.setStatus(BookingStatus.APPROVED);
        booking.setApprovedAt(LocalDateTime.now());
        booking.setPaymentExpiresAt(LocalDateTime.now().plusHours(gracePeriodHours));

        // Auto-reject stale PENDING bookings if this approval just filled the last bed
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
                log.info("[AUTO-REJECT] {} stale PENDING bookings rejected for room {} [{} {}]",
                        rejectedCount, room.getRoomNumber(),
                        booking.getAcademicYear(), booking.getSemester());
            }
        }

        notificationService.notifyBookingApproved(
                booking.getStudent(), booking.getId(), gracePeriodHours);
    }

    /**
     * Rejects the booking. Beds are unaffected (PENDING never locks capacity).
     * Promotes the next waitlisted student for this period.
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

        // A rejection may open a slot — check the period-scoped waitlist
        waitlistService.promoteNextInLine(
                booking.getRoom().getHostel().getId(),
                booking.getRoom(),
                booking.getAcademicYear(),
                booking.getSemester()
        );
    }

    /**
     * Decrements physical occupancy and recalculates room status.
     * Then promotes the next waitlisted student for the freed period.
     *
     * @param room         the room that had a bed freed
     * @param academicYear the period the freed bed belongs to
     * @param semester     the semester the freed bed belongs to
     */
    private void releaseRoomBed(Room room, String academicYear, String semester) {
        var locked = roomRepository.findByIdForUpdate(room.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Room not found: " + room.getId()));

        short newOccupancy = (short) Math.max(0, locked.getCurrentOccupancy() - 1);
        locked.setCurrentOccupancy(newOccupancy);
        roomService.recalculateRoomStatus(locked);
        roomRepository.save(locked);

        // Promote next waitlisted student for this specific period
        waitlistService.promoteNextInLine(locked.getHostel().getId(), locked, academicYear, semester);
    }

    /**
     * After check-in, notifies the student about other active bookings
     * (PENDING or APPROVED) they may want to cancel.
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

    // -------------------------------------------------------------------------
    // Validation helpers
    // -------------------------------------------------------------------------

    /**
     * Validates the academic year string:
     * <ul>
     *   <li>Must match {@code YYYY/YYYY} format.</li>
     *   <li>Second year must be exactly first year + 1 (consecutive).</li>
     *   <li>Start year must be within ±1 of the current calendar year.</li>
     * </ul>
     */
    private void validateAcademicYear(String academicYear) {
        //noinspection ExtractMethodRecommender
        if (academicYear == null || !academicYear.matches("^\\d{4}/\\d{4}$")) {
            throw new IllegalArgumentException(
                    "Academic year must be in the format YYYY/YYYY, e.g. '2025/2026'.");
        }

        String[] parts = academicYear.split("/");
        int startYear  = Integer.parseInt(parts[0]);
        int endYear    = Integer.parseInt(parts[1]);

        if (endYear != startYear + 1) {
            throw new IllegalArgumentException(
                    "Invalid academic year: the second year must immediately follow the first (e.g. 2025/2026).");
        }

        int currentYear = Year.now().getValue();
        if (startYear < currentYear - 1 || startYear > currentYear + 1) {
            throw new IllegalArgumentException(
                    "Academic year '" + academicYear + "' is outside the permitted booking window. "
                            + "Bookings are accepted for the current or immediately adjacent academic years.");
        }
    }

    /**
     * Enforces semester linearity rules:
     * <ul>
     *   <li><strong>SECOND:</strong> Requires the room to have a CHECKED_IN or
     *       CHECKED_OUT booking for FIRST semester of the same academic year.
     *       Rationale: a room cannot be used for second semester without being
     *       occupied first semester — this prevents booking gaps that skip the
     *       first half of an academic year.</li>
     *   <li><strong>FULL:</strong> Blocked if any active (APPROVED / CHECKED_IN)
     *       booking already exists for the year, since FULL covers both semesters.</li>
     *   <li><strong>FIRST:</strong> No linearity constraint — always permitted
     *       (subject to capacity).</li>
     * </ul>
     */
    private void validateSemesterLinearity(CreateBookingRequest request) {
        String semester    = request.semester();
        UUID   roomId      = request.roomId();
        String academicYear = request.academicYear();

        if ("SECOND".equals(semester)) {
            boolean firstSemOccupied = bookingRepository
                    .hasFirstSemesterOccupancy(roomId, academicYear);
            if (!firstSemOccupied) {
                throw new IllegalArgumentException(
                        "Cannot book SECOND semester for academic year " + academicYear
                                + " — this room has no FIRST semester booking (CHECKED_IN or CHECKED_OUT). "
                                + "Room bookings must follow semester order.");
            }
        }

        if ("FULL".equals(semester)) {
            boolean yearAlreadyBooked = bookingRepository
                    .hasAnyActiveBookingForYear(roomId, academicYear);
            if (yearAlreadyBooked) {
                throw new IllegalArgumentException(
                        "Cannot book a FULL year for " + academicYear
                                + " — an active booking already exists for part of this year.");
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