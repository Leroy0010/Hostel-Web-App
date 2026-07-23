package com.leroy.hostelbackend.module.waitlist.service;

import com.leroy.hostelbackend.module.booking.dto.AvailablePeriodDto;
import com.leroy.hostelbackend.module.booking.model.Booking;
import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.hostel.repository.HostelRepository;
import com.leroy.hostelbackend.module.notification.service.NotificationService;
import com.leroy.hostelbackend.module.room.model.Room;
import com.leroy.hostelbackend.module.room.model.RoomStatus;
import com.leroy.hostelbackend.module.room.model.RoomType;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.module.waitlist.dto.JoinWaitlistRequest;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistDto;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistEntryDto;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistStatusDto;
import com.leroy.hostelbackend.module.waitlist.mapper.WaitlistMapper;
import com.leroy.hostelbackend.module.waitlist.model.Waitlist;
import com.leroy.hostelbackend.module.waitlist.repository.WaitlistRepository;
import com.leroy.hostelbackend.shared.exception.AlreadyOnWaitlistException;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Room-type-scoped, period-scoped hostel waitlist service.
 *
 * <h2>Queue scope — (hostelId, roomType, academicYear, semester)</h2>
 * <p>Students specify the hostel <em>and</em> the room type they want.
 * This is the "Goldilocks" scope: broad enough that students need only one entry
 * per type per period, narrow enough that a freed SINGLE bed never promotes a
 * student who queued for a DOUBLE.
 *
 * <h2>When a student may join the waitlist</h2>
 * <p>Joining is only valid when <em>all</em> beds of the requested type for the
 * requested period are fully locked (APPROVED or CHECKED_IN ≥ capacity). If any
 * bed is still freely bookable the student should book directly — the waitlist
 * only fires when a locked slot is released, so joining while beds are available
 * produces an entry that would never receive a promotion event.
 * {@link #joinWaitlist} enforces this server-side via {@link #validatePeriodIsFullyBooked}.
 *
 * <h2>Promotion validation — mirrors {@code BookingService.createBooking()}</h2>
 * <p>{@link #promoteNextInLine} applies the subset of {@code createBooking} checks
 * that are still relevant when auto-creating a waitlist draft:
 * <ol>
 *   <li><strong>Room availability</strong> — room must not be UNDER_MAINTENANCE
 *       or RESERVED (mirrors check #3).</li>
 *   <li><strong>SECOND semester linearity</strong> — FIRST semester must already
 *       be CHECKED_IN/CHECKED_OUT on this room for this year (mirrors the SECOND
 *       linearity gate). This is a room-level guard; the entire promotion is skipped,
 *       not just the candidate.</li>
 *   <li><strong>Duplicate active booking</strong> — the candidate must not already
 *       hold an active booking for this exact (room, academicYear, semester) (mirrors
 *       check #4). Skip candidate and try the next.</li>
 *   <li><strong>FULL semester self-conflict</strong> — if the freed period is FULL,
 *       the candidate must not already hold an active FIRST or SECOND booking for
 *       the same room in the same year (mirrors the FULL linearity gate). Skip
 *       candidate and try the next.</li>
 * </ol>
 * <p>Checks <em>not</em> repeated: academic year format/range (came from an existing
 * booking, already validated), and period capacity (this method runs in the same
 * transaction as the slot-freeing event, so the freed slot is guaranteed available).
 *
 * <h2>When promoteNextInLine is called — only on real vacancy events</h2>
 * <ul>
 *   <li>{@code APPROVED → CANCELLED} — period slot freed; genuine vacancy.</li>
 *   <li>{@code APPROVED → EXPIRED}   — period slot freed; genuine vacancy.</li>
 *   <li>{@code CHECKED_IN → CHECKED_OUT} — physical bed freed; period slot freed.</li>
 *   <li>Waitlist draft {@code EXPIRED} — next student promoted to fill the gap.</li>
 * </ul>
 * <p>{@code PENDING → REJECTED} does <strong>NOT</strong> call this. PENDING never
 * locks a period slot; rejection releases nothing, and promoting here would
 * auto-draft a student into a still-full room.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WaitlistService {

    private final WaitlistRepository  waitlistRepository;
    private final BookingRepository   bookingRepository;
    private final HostelRepository    hostelRepository;
    private final UserRepository      userRepository;
    private final WaitlistMapper      waitlistMapper;
    private final NotificationService notificationService;

    /**
     * Hours the manager has to approve or reject a waitlist-draft PENDING booking
     * before the sweeper auto-expires it and advances the queue.
     * Override via {@code hostel.waitlist.draft-expiry-hours} in {@code application.yml}.
     */
    @Value("${hostel.waitlist.draft-expiry-hours:24}")
    private int draftExpiryHours;

    // =========================================================================
    // Student actions
    // =========================================================================

    /**
     * Adds a student to the waitlist for a specific hostel, room type, and period.
     *
     * <p><strong>Pre-condition guard:</strong> joining is only valid when every room
     * of the requested type for the requested period is fully locked. If any bed is
     * still freely bookable, {@link IllegalStateException} is thrown — the student
     * should book directly instead of queueing.
     *
     * @param studentId UUID of the authenticated student
     * @param request   hostelId, roomType, academicYear, semester
     * @return the persisted {@link WaitlistDto} including the student's position
     * @throws IllegalStateException      if beds are still available for direct booking
     * @throws AlreadyOnWaitlistException if already queued for this exact combination
     * @throws ResourceNotFoundException  if the student or hostel does not exist
     */
    @Transactional
    public WaitlistDto joinWaitlist(UUID studentId, JoinWaitlistRequest request) {
        var hostelId     = request.hostelId();
        var roomType     = request.roomType();
        var academicYear = request.academicYear();
        var semester     = request.semester();

        // Ensure the period is genuinely full before allowing the student to queue.
        // The waitlist only fires when a locked slot is freed — joining while beds
        // are still available produces an entry that would never be promoted.
        validatePeriodIsFullyBooked(hostelId, roomType, academicYear, semester);

        // Duplicate guard — clear message before the DB unique index fires
        if (waitlistRepository.findByStudentIdAndHostelIdAndPeriod(
                studentId, hostelId, roomType, academicYear, semester).isPresent()) {
            throw new AlreadyOnWaitlistException();
        }

        var student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + studentId));
        var hostel  = hostelRepository.findById(hostelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hostel not found: " + hostelId));

        long nextPosition = waitlistRepository
                .countByHostelIdAndRoomTypeAndAcademicYearAndSemester(
                        hostelId, roomType, academicYear, semester) + 1;

        var entry = new Waitlist();
        entry.setStudent(student);
        entry.setHostel(hostel);
        entry.setRoomType(roomType);
        entry.setPosition((int) nextPosition);
        entry.setAcademicYear(academicYear);
        entry.setSemester(semester);
        entry.setNotified(false);

        var saved = waitlistRepository.save(entry);
        log.info("Student {} joined waitlist for hostel {} [{} {} {}] at position {}",
                studentId, hostelId, roomType, academicYear, semester, nextPosition);
        return waitlistMapper.toDto(saved);
    }

    /**
     * Student voluntarily leaves a waitlist entry. All positions below the removed
     * entry are shifted up by one in the same transaction.
     *
     * @param studentId    UUID of the authenticated student
     * @param hostelId     the hostel
     * @param roomType     the room type they were waiting for
     * @param academicYear the academic year
     * @param semester     the semester
     * @throws ResourceNotFoundException if the student is not on this queue
     */
    @Transactional
    public void leaveWaitlist(UUID studentId, UUID hostelId, RoomType roomType,
                              String academicYear, String semester) {
        var entry = waitlistRepository
                .findByStudentIdAndHostelIdAndPeriod(
                        studentId, hostelId, roomType, academicYear, semester)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "You are not on the waitlist for this hostel, room type and period."));

        int removedPosition = entry.getPosition();
        waitlistRepository.delete(entry);
        waitlistRepository.decrementPositionsAfter(
                hostelId, roomType, academicYear, semester, removedPosition);

        log.info("Student {} left waitlist for hostel {} [{} {} {}]",
                studentId, hostelId, roomType, academicYear, semester);
    }

    /**
     * Returns the student's current position on a specific waitlist queue,
     * or indicates they are not on it.
     *
     * @param studentId    UUID of the authenticated student
     * @param hostelId     the hostel
     * @param roomType     the room type
     * @param academicYear the academic year
     * @param semester     the semester
     * @return a {@link WaitlistStatusDto} with position and total queue depth
     */
    @Transactional(readOnly = true)
    public WaitlistStatusDto getWaitlistStatus(UUID studentId, UUID hostelId,
                                               RoomType roomType,
                                               String academicYear, String semester) {
        var entry = waitlistRepository
                .findByStudentIdAndHostelIdAndPeriod(
                        studentId, hostelId, roomType, academicYear, semester);
        long total = waitlistRepository
                .countByHostelIdAndRoomTypeAndAcademicYearAndSemester(
                        hostelId, roomType, academicYear, semester);

        return entry
                .map(w -> new WaitlistStatusDto(
                        true, w.getPosition(), total,
                        roomType.name(), academicYear, semester))
                .orElse(new WaitlistStatusDto(
                        false, null, total,
                        roomType.name(), academicYear, semester));
    }

    /**
     * All waitlist entries for a student across all hostels and periods,
     * sorted by join date ascending (oldest first).
     *
     * @param studentId UUID of the authenticated student
     * @param pageable  pagination parameters
     */
    @Transactional(readOnly = true)
    public Page<WaitlistDto> myWaitlistEntries(UUID studentId, Pageable pageable) {
        return waitlistRepository.findByStudentId(studentId, pageable)
                .map(waitlistMapper::toDto);
    }

    // =========================================================================
    // Manager reads
    // =========================================================================

    /**
     * Paginated waitlist for a hostel and period, optionally filtered by room type.
     * Sorted by room type then position so the manager sees each type's queue grouped.
     *
     * @param hostelId    the hostel UUID
     * @param roomType    optional filter; {@code null} returns all room types
     * @param academicYear the target year
     * @param semester    the target semester
     * @param pageable    pagination parameters
     * @throws ResourceNotFoundException if the hostel does not exist
     */
    @Transactional(readOnly = true)
    public Page<WaitlistEntryDto> hostelWaitlist(UUID hostelId,
                                                 RoomType roomType,
                                                 String academicYear,
                                                 String semester,
                                                 Pageable pageable) {
        if (!hostelRepository.existsById(hostelId)) {
            throw new ResourceNotFoundException("Hostel not found: " + hostelId);
        }
        return waitlistRepository
                .findByHostelIdAndPeriodOrderByPosition(
                        hostelId, roomType, academicYear, semester, pageable)
                .map(waitlistMapper::toEntryDto);
    }

    // =========================================================================
    // Manager / Admin force-remove
    // =========================================================================

    /**
     * Manager force-removes a specific waitlist entry by UUID. Used for misconduct
     * or data correction. Positions below the removed entry are shifted up.
     *
     * @param waitlistId UUID of the entry to remove
     * @throws ResourceNotFoundException if the entry does not exist
     */
    @Transactional
    public void managerRemoveEntry(UUID waitlistId) {
        var entry = waitlistRepository.findById(waitlistId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Waitlist entry not found: " + waitlistId));

        int      removedPosition = entry.getPosition();
        UUID     hostelId        = entry.getHostel().getId();
        RoomType roomType        = entry.getRoomType();
        String   academicYear    = entry.getAcademicYear();
        String   semester        = entry.getSemester();

        waitlistRepository.delete(entry);
        waitlistRepository.decrementPositionsAfter(
                hostelId, roomType, academicYear, semester, removedPosition);
        log.info("[MANAGER] Waitlist entry {} removed", waitlistId);
    }

    /**
     * Returns the periods for which a student may join the waitlist for a given
     * hostel and room type.
     *
     * <p>Only periods where <em>all</em> rooms of the requested type are fully
     * locked (reserved bed count ≥ capacity for every matching room) are returned.
     * A period with any bookable bed is excluded because the waitlist only activates
     * when a locked slot is freed — queueing for a bookable period is pointless.
     *
     * @param hostelId the hostel UUID
     * @param roomType the room type; {@code null} returns periods for all types
     * @return (academicYear, semester) pairs eligible for waitlisting
     */
    @Transactional(readOnly = true)
    public List<AvailablePeriodDto> getWaitlistPeriodsDropdown(UUID hostelId,
                                                               RoomType roomType) {
        int    currentYear = Year.now().getValue();
        String yearMinus1  = (currentYear - 1) + "/" + currentYear;
        String yearCurrent = currentYear + "/" + (currentYear + 1);
        String yearPlus1   = (currentYear + 1) + "/" + (currentYear + 2);

        String roomTypeStr = (roomType != null) ? roomType.name() : null;

        return hostelRepository
                .findValidPeriodsForWaitlist(
                        hostelId, roomTypeStr, yearMinus1, yearCurrent, yearPlus1)
                .stream()
                .map(proj -> new AvailablePeriodDto(proj.getAcademicYear(), proj.getSemester()))
                .toList();
    }

    // =========================================================================
    // Internal — called by BookingService when a real slot is freed
    // =========================================================================

    /**
     * Auto-promotes the next eligible student in the room-type-scoped queue
     * when a genuine vacancy opens up for a specific period.
     *
     * <p><strong>Capacity is guaranteed free</strong> — this always runs in the
     * same transaction as the slot-freeing event. The freed slot is already
     * reflected in the DB, so a period-capacity re-check would be both redundant
     * and incorrect (the outer call may hold the room row lock).
     *
     * <p><strong>Academic year/format not re-validated</strong> — the values came
     * from an existing booking that already passed {@code validateAcademicYear()}.
     *
     * <p><strong>Per-candidate guards applied in order:</strong>
     * <ol>
     *   <li><strong>Room availability</strong> (mirrors BookingService check #3) —
     *       room must not be UNDER_MAINTENANCE or RESERVED. Skips the entire
     *       promotion (room constraint, not student).</li>
     *   <li><strong>Duplicate active booking</strong> (mirrors BookingService
     *       check #4) — candidate must not already hold an active booking for this
     *       exact (room, academicYear, semester). Skips the candidate and recurses
     *       to the next student.</li>
     *   <li><strong>FULL semester self-conflict</strong> (mirrors BookingService
     *       FULL linearity gate) — if the period is FULL, the candidate must not
     *       already hold an active FIRST or SECOND booking for this room+year.
     *       Skips the candidate and recurses to the next student.</li>
     * </ol>
     *
     * @param hostelId    the hostel with a newly freed slot
     * @param freedRoom   the specific room — its roomType drives queue matching
     * @param academicYear the period the vacancy applies to
     * @param semester    the semester the vacancy applies to
     */
    @Transactional
    public void promoteNextInLine(UUID hostelId, Room freedRoom,
                                  String academicYear, String semester) {

        // ── Guard 1: Room availability ────────────────────────────────────────
        // Mirrors BookingService.createBooking() check #3.
        // If the room went offline concurrently, no student should be drafted into
        // it. Skip the entire promotion event — the room cannot accept a booking.
        if (freedRoom.getStatus() == RoomStatus.UNDER_MAINTENANCE
                || freedRoom.getStatus() == RoomStatus.RESERVED) {
            log.warn("[WAITLIST] Promotion skipped — room {} is {} and cannot accept a draft.",
                    freedRoom.getRoomNumber(), freedRoom.getStatus());
            return;
        }

        RoomType roomType = freedRoom.getRoomType();

        Optional<Waitlist> nextOpt = waitlistRepository
                .findNextInLine(hostelId, roomType, academicYear, semester);

        if (nextOpt.isEmpty()) {
            log.debug("[WAITLIST] No waiting students for hostel {} [{} {} {}]",
                    hostelId, roomType, academicYear, semester);
            return;
        }

        Waitlist entry    = nextOpt.get();
        UUID     studentId = entry.getStudent().getId();

        // ── Guard 2: Duplicate active booking (student-level) ─────────────────
        // Mirrors BookingService.createBooking() check #4 (hasActiveBookingForRoom).
        // The candidate may already hold an active booking for this exact
        // (room, academicYear, semester). Scenario: student booked another room in
        // the same hostel, got checked in, and meanwhile a waitlist draft fires
        // for a room they had previously queued for.
        // Creating a duplicate would violate the partial unique index:
        //   bookings(student_id, room_id, academic_year, semester)
        //   WHERE status IN ('PENDING', 'APPROVED', 'CHECKED_IN').
        // Resolution: remove their waitlist entry (they already have accommodation
        // for this room+period) and try the next student in the queue.
        if (bookingRepository.hasActiveBookingForRoom(
                studentId, freedRoom.getId(), academicYear, semester)) {
            log.warn("[WAITLIST] Candidate {} already has an active booking for room {} [{} {}]. " +
                            "Removing entry and trying next candidate.",
                    studentId, freedRoom.getRoomNumber(), academicYear, semester);
            skipCandidateAndRecurse(entry, hostelId, freedRoom, academicYear, semester);
            return;
        }

        // ── Guard 3: FULL semester self-conflict (student-level) ──────────────
        // Mirrors BookingService.validateSemesterLinearity() FULL gate.
        // If the freed period is FULL and the candidate already holds an active
        // FIRST or SECOND booking for the same room in the same academic year,
        // creating a FULL draft would give them overlapping self-bookings
        // (FIRST + FULL or SECOND + FULL for the same room).
        //
        // Important: bookings by OTHER students for FIRST/SECOND on this room do
        // NOT block the FULL draft — capacity is already guaranteed free at this
        // point. Only a self-conflict on the same student matters here.
        if ("FULL".equals(semester)
                && bookingRepository.studentHasSemesterBookingForYear(
                studentId, freedRoom.getId(), academicYear)) {
            log.warn("[WAITLIST] Candidate {} already holds a FIRST/SECOND booking for room {} in {}. " +
                            "Cannot draft FULL semester. Trying next candidate.",
                    studentId, freedRoom.getRoomNumber(), academicYear);
            skipCandidateAndRecurse(entry, hostelId, freedRoom, academicYear, semester);
            return;
        }

        // ── All guards passed — create the auto-draft PENDING booking ─────────
        var draft = Booking.createWaitlistDraft(
                entry.getStudent(),
                freedRoom,
                academicYear,
                semester,
                LocalDateTime.now().plusHours(draftExpiryHours)
        );
        bookingRepository.save(draft);

        // Notify the student — a booking has been pre-created for them
        notificationService.notifyWaitlistPromoted(entry.getStudent(), hostelId);

        // Notify the manager — a waitlist draft is awaiting their action
        userRepository.findManagerByHostelId(hostelId).ifPresent(manager ->
                notificationService.notifyManagerNewBookingRequest(
                        manager,
                        entry.getStudent().getName(),
                        freedRoom.getRoomNumber(),
                        draft.getId()
                )
        );

        // Remove the promoted student from the waitlist and compact positions
        int removedPosition = entry.getPosition();
        waitlistRepository.delete(entry);
        waitlistRepository.decrementPositionsAfter(
                hostelId, roomType, academicYear, semester, removedPosition);

        log.info("[WAITLIST] Promoted student {} → draft booking {} for room {} [{} {} {}]",
                studentId, draft.getId(),
                freedRoom.getRoomNumber(), roomType, academicYear, semester);
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    /**
     * Removes an ineligible waitlist candidate and recurses to the next student.
     *
     * <p>Called when a student-level guard fires (Guard 2 or Guard 3). The
     * candidate's entry is deleted and queue positions are compacted before
     * recursing, so the queue remains consistent regardless of how many consecutive
     * candidates are skipped.
     *
     * @param entry        the ineligible entry to remove
     * @param hostelId     the hostel
     * @param freedRoom    the room with an available slot
     * @param academicYear the period
     * @param semester     the semester
     */
    private void skipCandidateAndRecurse(Waitlist entry, UUID hostelId, Room freedRoom,
                                         String academicYear, String semester) {
        int      removedPosition = entry.getPosition();
        RoomType roomType        = entry.getRoomType();

        waitlistRepository.delete(entry);
        waitlistRepository.decrementPositionsAfter(
                hostelId, roomType, academicYear, semester, removedPosition);

        // Recurse — the queue is now compacted; the next candidate is at position 1
        promoteNextInLine(hostelId, freedRoom, academicYear, semester);
    }

    /**
     * Validates that all rooms of the requested type for the requested period are
     * fully locked before allowing a student to join the waitlist.
     *
     * <p>The waitlist only fires when a locked slot (APPROVED or CHECKED_IN) is
     * freed. If any bed for this period is still directly bookable, joining the
     * waitlist would produce an entry that never receives a promotion event.
     *
     * <p>Reuses {@code HostelRepository.findValidPeriodsForWaitlist} — the same
     * query that backs the dropdown — so the server-side guard is always consistent
     * with what the UI presents to the student.
     *
     * @param hostelId     the hostel
     * @param roomType     the room type being requested
     * @param academicYear the academic year
     * @param semester     the semester
     * @throws IllegalStateException if any bed of this type is still freely bookable
     */
    private void validatePeriodIsFullyBooked(UUID hostelId, RoomType roomType,
                                             String academicYear, String semester) {
        int    currentYear = Year.now().getValue();
        String yearMinus1  = (currentYear - 1) + "/" + currentYear;
        String yearCurrent = currentYear + "/" + (currentYear + 1);
        String yearPlus1   = (currentYear + 1) + "/" + (currentYear + 2);

        boolean periodIsFullyBooked = hostelRepository
                .findValidPeriodsForWaitlist(
                        hostelId, roomType.name(), yearMinus1, yearCurrent, yearPlus1)
                .stream()
                .anyMatch(p -> p.getAcademicYear().equals(academicYear)
                        && p.getSemester().equals(semester));

        if (!periodIsFullyBooked) {
            throw new IllegalStateException(
                    "Rooms of type " + roomType.name() + " are still available for direct " +
                            "booking in " + semester + " " + academicYear + ". " +
                            "Please book a room directly instead of joining the waitlist.");
        }
    }
}