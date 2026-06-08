package com.leroy.hostelbackend.module.waitlist.service;

import com.leroy.hostelbackend.module.booking.model.Booking;
import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.hostel.repository.HostelRepository;
import com.leroy.hostelbackend.module.notification.service.NotificationService;
import com.leroy.hostelbackend.module.room.model.Room;
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
import java.util.UUID;

/**
 * Period-scoped hostel waitlist service.
 *
 * <p><strong>Key design change — Auto-drafting:</strong>
 * When a bed is freed for a specific period, this service no longer just sends
 * a push notification. It automatically:
 * <ol>
 *   <li>Finds the next student in line for that hostel+period.</li>
 *   <li>Creates a PENDING booking ({@code isWaitlistDraft = true}) for the
 *       freed room, scoped to the correct academic year and semester.</li>
 *   <li>Notifies the student that a booking has been created for them.</li>
 *   <li>Notifies the hostel manager that a waitlist candidate is ready to approve.</li>
 *   <li>Removes the student from the waitlist (they now have a real booking).</li>
 * </ol>
 *
 * <p>This eliminates the race condition where multiple students rush to book a
 * room after a vacancy notification. The manager sees a clean, pre-created booking
 * and simply approves or rejects it.
 *
 * <p><strong>Period-scoped queues:</strong> The waitlist is keyed on
 * {@code (hostelId, academicYear, semester)}. A student can be on the waitlist
 * for the same hostel for different semesters simultaneously.
 *
 * <p><strong>Auto-draft expiry:</strong> Waitlist-draft PENDING bookings have a
 * configurable deadline ({@code waitlist.draft.expiry-hours}, default 24h).
 * If the manager does not action within the window, {@code BookingExpiredSweeper}
 * auto-rejects the booking and calls this service again to promote the next student.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WaitlistService {

    private final WaitlistRepository waitlistRepository;
    private final BookingRepository  bookingRepository;
    private final HostelRepository   hostelRepository;
    private final UserRepository     userRepository;
    private final WaitlistMapper     waitlistMapper;
    private final NotificationService notificationService;

    /**
     * How long (hours) a manager has to action a waitlist-draft PENDING booking
     * before the sweeper auto-rejects it and promotes the next student.
     * Defaults to 24 hours; override via {@code hostel.waitlist.draft-expiry-hours} in application.yml.
     */
    @Value("${hostel.waitlist.draft-expiry-hours:24}")
    private int draftExpiryHours;

    // -------------------------------------------------------------------------
    // Student actions
    // -------------------------------------------------------------------------

    /**
     * Adds a student to the waitlist for a hostel's specific academic period.
     *
     * @param studentId UUID of the student
     * @param request   contains hostelId, academicYear, semester
     * @throws AlreadyOnWaitlistException if the student is already waiting for this hostel+period
     */
    @Transactional
    public WaitlistDto joinWaitlist(UUID studentId, JoinWaitlistRequest request) {
        var hostelId     = request.hostelId();
        var academicYear = request.academicYear();
        var semester     = request.semester();

        if (waitlistRepository.findByStudentIdAndHostelIdAndPeriod(
                studentId, hostelId, academicYear, semester).isPresent()) {
            throw new AlreadyOnWaitlistException();
        }

        var student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + studentId));
        var hostel = hostelRepository.findById(hostelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hostel not found: " + hostelId));

        long nextPosition = waitlistRepository
                .countByHostelIdAndAcademicYearAndSemester(hostelId, academicYear, semester) + 1;

        var entry = new Waitlist();
        entry.setStudent(student);
        entry.setHostel(hostel);
        entry.setPosition((int) nextPosition);
        entry.setAcademicYear(academicYear);
        entry.setSemester(semester);
        entry.setNotified(false);

        var saved = waitlistRepository.save(entry);
        log.info("Student {} joined waitlist for hostel {} [{} {}] at position {}",
                studentId, hostelId, academicYear, semester, nextPosition);
        return waitlistMapper.toDto(saved);
    }

    /**
     * Student voluntarily leaves a waitlist entry.
     * Positions below the removed entry are shifted up.
     */
    @Transactional
    public void leaveWaitlist(UUID studentId, UUID hostelId,
                              String academicYear, String semester) {
        var entry = waitlistRepository
                .findByStudentIdAndHostelIdAndPeriod(studentId, hostelId, academicYear, semester)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "You are not on the waitlist for this hostel and period."));

        int removedPosition = entry.getPosition();
        waitlistRepository.delete(entry);
        waitlistRepository.decrementPositionsAfter(hostelId, academicYear, semester, removedPosition);

        log.info("Student {} left waitlist for hostel {} [{} {}]",
                studentId, hostelId, academicYear, semester);
    }

    /**
     * Returns the student's waitlist status for a specific hostel+period.
     */
    @Transactional(readOnly = true)
    public WaitlistStatusDto getWaitlistStatus(UUID studentId, UUID hostelId,
                                               String academicYear, String semester) {
        var entry = waitlistRepository
                .findByStudentIdAndHostelIdAndPeriod(studentId, hostelId, academicYear, semester);
        long total = waitlistRepository
                .countByHostelIdAndAcademicYearAndSemester(hostelId, academicYear, semester);

        return entry
                .map(w -> new WaitlistStatusDto(true, w.getPosition(), total, academicYear, semester))
                .orElse(new WaitlistStatusDto(false, null, total, academicYear, semester));
    }

    /**
     * All waitlist entries for the authenticated student across all hostels and periods.
     */
    @Transactional(readOnly = true)
    public Page<WaitlistDto> myWaitlistEntries(UUID studentId, Pageable pageable) {
        return waitlistRepository.findByStudentId(studentId, pageable)
                .map(waitlistMapper::toDto);
    }

    // -------------------------------------------------------------------------
    // Manager reads
    // -------------------------------------------------------------------------

    /**
     * Paginated waitlist for a hostel+period in position order.
     * Used on the manager's dashboard to see who is queued for a specific semester.
     */
    @Transactional(readOnly = true)
    public Page<WaitlistEntryDto> hostelWaitlist(UUID hostelId,
                                                 String academicYear,
                                                 String semester,
                                                 Pageable pageable) {
        if (!hostelRepository.existsById(hostelId)) {
            throw new ResourceNotFoundException("Hostel not found: " + hostelId);
        }
        return waitlistRepository
                .findByHostelIdAndPeriodOrderByPosition(hostelId, academicYear, semester, pageable)
                .map(waitlistMapper::toEntryDto);
    }

    // -------------------------------------------------------------------------
    // Manager/Admin force-remove
    // -------------------------------------------------------------------------

    /**
     * Manager removes a specific waitlist entry by its UUID.
     * Used for misconduct or data correction. Shifts positions after the removal.
     */
    @Transactional
    public void managerRemoveEntry(UUID waitlistId) {
        var entry = waitlistRepository.findById(waitlistId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Waitlist entry not found: " + waitlistId));

        int    removedPosition = entry.getPosition();
        UUID   hostelId        = entry.getHostel().getId();
        String academicYear    = entry.getAcademicYear();
        String semester        = entry.getSemester();

        waitlistRepository.delete(entry);
        waitlistRepository.decrementPositionsAfter(hostelId, academicYear, semester, removedPosition);
        log.info("[MANAGER] Waitlist entry {} removed", waitlistId);
    }

    // -------------------------------------------------------------------------
    // Internal — called by BookingService when a bed is freed
    // -------------------------------------------------------------------------

    /**
     * Auto-promotes the next student in line for a specific hostel+period.
     *
     * <p>When called, this method:
     * <ol>
     *   <li>Finds position 1 (un-notified) for the given hostel+period.</li>
     *   <li>Creates a PENDING, {@code isWaitlistDraft = true} booking for the
     *       room that was just freed, with a {@code pendingExpiresAt} deadline.</li>
     *   <li>Notifies the student and the hostel manager.</li>
     *   <li>Removes the student from the waitlist (they now have a real booking).</li>
     *   <li>Decrements positions for remaining entries.</li>
     * </ol>
     *
     * <p>This runs in the <strong>same transaction</strong> as the calling
     * {@code BookingService} method so the promotion and bed release are atomic.
     *
     * @param hostelId    the hostel that just had a vacancy
     * @param freedRoom   the specific room with a newly freed bed
     * @param academicYear the period the vacancy applies to
     * @param semester    the semester the vacancy applies to
     */
    @Transactional
    public void promoteNextInLine(UUID hostelId, Room freedRoom,
                                  String academicYear, String semester) {
        waitlistRepository.findNextInLine(hostelId, academicYear, semester).ifPresent(entry -> {

            // 1. Build the auto-draft PENDING booking
            var draft = Booking.createWaitlistDraft(
                    entry.getStudent(),
                    freedRoom,
                    academicYear,
                    semester,
                    LocalDateTime.now().plusHours(draftExpiryHours)
            );
            bookingRepository.save(draft);

            // 2. Notify the student — a booking has been created for them
            notificationService.notifyWaitlistPromoted(entry.getStudent(), hostelId);

            // 3. Notify the hostel manager about the auto-drafted booking
            userRepository.findManagerByHostelId(hostelId).ifPresent(manager ->
                    notificationService.notifyManagerNewBookingRequest(
                            manager,
                            entry.getStudent().getName(),
                            freedRoom.getRoomNumber(),
                            draft.getId()
                    )
            );

            // 4. Remove the student from the waitlist — they have a booking now
            int removedPosition = entry.getPosition();
            waitlistRepository.delete(entry);
            waitlistRepository.decrementPositionsAfter(hostelId, academicYear, semester, removedPosition);

            log.info("[WAITLIST] Promoted student {} to auto-draft booking {} for room {} [{} {}]",
                    entry.getStudent().getId(), draft.getId(),
                    freedRoom.getRoomNumber(), academicYear, semester);
        });
    }
}