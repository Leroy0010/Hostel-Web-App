package com.leroy.hostelbackend.module.waitlist.service;

import com.leroy.hostelbackend.module.hostel.repository.HostelRepository;
import com.leroy.hostelbackend.module.notification.service.NotificationService;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Manages the hostel waitlist — joining, leaving, status checks, and the
 * automatic promotion pipeline triggered by vacancies in {@code BookingService}.
 *
 * <p><strong>Promotion flow (triggered by BookingService):</strong>
 * <ol>
 *   <li>A bed is freed (booking cancelled, rejected, or student checks out).</li>
 *   <li>{@code BookingService} calls {@link #notifyNextInLine(UUID)}.</li>
 *   <li>This service loads position 1 with {@code notified = false}.</li>
 *   <li>It marks the entry as {@code notified = true} and — in a real system —
 *       fires a Firebase push via {@code NotificationService} (Phase 3).
 *       For now a log message stands in its place; the hook is already wired.</li>
 *   <li>The student then has a configurable window to submit a booking before
 *       the slot moves to position 2 (not yet automated — Phase 3 enhancement).</li>
 * </ol>
 *
 * <p><strong>Position integrity:</strong> Positions are kept contiguous (no gaps).
 * Every removal calls {@link WaitlistRepository#decrementPositionsAfter} as part
 * of the same transaction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WaitlistService {

    private final WaitlistRepository waitlistRepository;
    private final HostelRepository   hostelRepository;
    private final UserRepository     userRepository;
    private final WaitlistMapper     waitlistMapper;
    private final NotificationService notificationService;

    // -------------------------------------------------------------------------
    // Student actions
    // -------------------------------------------------------------------------

    /**
     * Adds a student to the waitlist for a hostel.
     * Their position is set to {@code currentQueueSize + 1}.
     *
     * @param studentId the student requesting to join
     * @param hostelId  the hostel they want to wait for
     * @return the created {@link WaitlistDto}
     * @throws AlreadyOnWaitlistException if the student is already on this hostel's list
     */
    @Transactional
    public WaitlistDto joinWaitlist(UUID studentId, UUID hostelId) {
        // Guard: prevent duplicate entries
        if (waitlistRepository.findByStudentIdAndHostelId(studentId, hostelId).isPresent()) {
            throw new AlreadyOnWaitlistException();
        }

        var student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + studentId));
        var hostel  = hostelRepository.findById(hostelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hostel not found: " + hostelId));

        // Next position = current queue length + 1
        long nextPosition = waitlistRepository.countByHostelId(hostelId) + 1;

        var entry = new Waitlist();
        entry.setStudent(student);
        entry.setHostel(hostel);
        entry.setPosition((int) nextPosition);
        entry.setNotified(false);

        var saved = waitlistRepository.save(entry);
        log.info("Student {} joined waitlist for hostel {} at position {}", studentId, hostelId, nextPosition);
        return waitlistMapper.toDto(saved);
    }

    /**
     * Removes a student from a hostel's waitlist voluntarily.
     * All positions below the removed entry are shifted up by one.
     *
     * @param studentId the student leaving the waitlist
     * @param hostelId  the hostel they are leaving
     * @throws ResourceNotFoundException if the student is not on this waitlist
     */
    @Transactional
    public void leaveWaitlist(UUID studentId, UUID hostelId) {
        var entry = waitlistRepository.findByStudentIdAndHostelId(studentId, hostelId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "You are not on the waitlist for this hostel."));

        int removedPosition = entry.getPosition();
        waitlistRepository.delete(entry);

        // Close the gap left by this removal
        waitlistRepository.decrementPositionsAfter(hostelId, removedPosition);
        log.info("Student {} left waitlist for hostel {}", studentId, hostelId);
    }

    /**
     * Returns the student's current position on a hostel's waitlist,
     * or indicates they are not on it.
     *
     * @param studentId the student to check
     * @param hostelId  the hostel to check against
     */
    @Transactional(readOnly = true)
    public WaitlistStatusDto getWaitlistStatus(UUID studentId, UUID hostelId) {
        var entry = waitlistRepository.findByStudentIdAndHostelId(studentId, hostelId);
        long total = waitlistRepository.countByHostelId(hostelId);

        return entry.map(w -> new WaitlistStatusDto(true, w.getPosition(), total))
                .orElse(new WaitlistStatusDto(false, null, total));
    }

    /**
     * A student's own waitlist entries across all hostels they are waiting for.
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
     * Paginated waitlist for a hostel in position order.
     * Used on the manager's hostel dashboard to see who is queued.
     *
     * @param hostelId  the hostel whose waitlist to view
     * @param pageable  page and sort params
     */
    @Transactional(readOnly = true)
    public Page<WaitlistEntryDto> hostelWaitlist(UUID hostelId, Pageable pageable) {
        if (!hostelRepository.existsById(hostelId)) {
            throw new ResourceNotFoundException("Hostel not found: " + hostelId);
        }
        return waitlistRepository.findByHostelIdOrderByPosition(hostelId, pageable)
                .map(waitlistMapper::toEntryDto);
    }

    // -------------------------------------------------------------------------
    // Internal — called by BookingService
    // -------------------------------------------------------------------------

    /**
     * Notifies the next un-notified student in line when a bed becomes available.
     *
     * <p>Called internally by {@code BookingService} after a booking is cancelled,
     * rejected, or a student checks out. Runs in the <em>same transaction</em> as
     * the booking state change so the notification flag is committed atomically.
     *
     * <p><strong>Phase 3 hook:</strong> Replace the {@code log.info} call here with
     * a call to {@code NotificationService.sendPush(student, WAITLIST_PROMOTED)}
     * once Firebase is wired up.
     *
     * @param hostelId the hostel that just had a vacancy open up
     */
    @Transactional
    public void notifyNextInLine(UUID hostelId) {
        waitlistRepository.findNextInLine(hostelId).ifPresent(entry -> {
            entry.setNotified(true);
            waitlistRepository.save(entry);

             notificationService.notifyWaitlistPromoted(entry.getStudent(), hostelId);

            log.info("[WAITLIST] Notified student {} (position {}) that a bed is available in hostel {}",
                    entry.getStudent().getId(), entry.getPosition(), hostelId);
        });
    }

    /**
     * Admin removes a student from a waitlist (e.g. for misconduct or data correction).
     *
     * @param waitlistId the specific waitlist entry UUID
     */
    @Transactional
    public void adminRemoveEntry(UUID waitlistId) {
        var entry = waitlistRepository.findById(waitlistId)
                .orElseThrow(() -> new ResourceNotFoundException("Waitlist entry not found: " + waitlistId));

        int removedPosition = entry.getPosition();
        UUID hostelId       = entry.getHostel().getId();

        waitlistRepository.delete(entry);
        waitlistRepository.decrementPositionsAfter(hostelId, removedPosition);
        log.info("[ADMIN] Waitlist entry {} removed by admin", waitlistId);

    }
}