package com.leroy.hostelbackend.shared.scheduler;

import com.leroy.hostelbackend.module.booking.model.Booking;
import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.booking.service.BookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Background sweeper that automatically cleans up stale bookings.
 *
 * <p>Runs on a configurable schedule (default: every 5 minutes). Two independent
 * sweeps are performed on each run:
 *
 * <p><strong>Sweep 1 — Expired APPROVED bookings:</strong>
 * Finds APPROVED bookings where {@code paymentExpiresAt < now} and
 * {@code paymentRef} is null/blank. For each:
 * <ol>
 *   <li>Status → {@code EXPIRED}.</li>
 *   <li>Physical bed released ({@code room.currentOccupancy} decremented).</li>
 *   <li>Student notified ("Your booking expired — you did not submit payment in time").</li>
 *   <li>Period-scoped waitlist promoted (next student auto-drafted for the freed room+period).</li>
 * </ol>
 *
 * <p><strong>Sweep 2 — Expired waitlist-draft PENDING bookings:</strong>
 * Finds PENDING bookings where {@code isWaitlistDraft = true},
 * {@code pendingExpiresAt < now}, and status is still PENDING. For each:
 * <ol>
 *   <li>Status → {@code EXPIRED}.</li>
 *   <li>No bed is released (PENDING never locks capacity).</li>
 *   <li>The next student in the period-scoped waitlist is auto-drafted as the replacement.</li>
 * </ol>
 *
 * <p><strong>Failure isolation:</strong> Each booking is processed via a method
 * that runs in its own {@code @Transactional} boundary inside {@link BookingService}.
 * A failure on one booking is caught and logged — it does not roll back the others.
 *
 * <p><strong>Configuration:</strong>
 * Override the sweep interval in {@code application.yml}:
 * <pre>
 * hostel:
 *   sweeper:
 *     rate: 300000   # milliseconds — default 5 minutes
 * </pre>
 */
@Component
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class BookingExpiredSweeper {

    private final BookingRepository bookingRepository;
    private final BookingService    bookingService;

    /**
     * Main sweep entry point. Runs both sweeps sequentially on the same schedule.
     *
     * <p>{@code fixedRateString} reads from {@code hostel.sweeper.rate} in
     * {@code application.yml}; falls back to 300000 ms (5 minutes) if not set.
     */
    @Scheduled(fixedRateString = "${hostel.sweeper.rate:300000}")
    public void sweep() {
        sweepExpiredApprovedBookings();
        sweepExpiredWaitlistDrafts();
    }

    // -------------------------------------------------------------------------
    // Sweep 1 — APPROVED bookings past payment deadline
    // -------------------------------------------------------------------------

    /**
     * Finds all APPROVED bookings whose {@code paymentExpiresAt} has elapsed
     * and whose {@code paymentRef} has not been submitted, then expires them.
     */
    private void sweepExpiredApprovedBookings() {
        List<Booking> expired = bookingRepository.findExpiredUnpaidBookings(LocalDateTime.now());

        if (expired.isEmpty()) {
            log.debug("[SWEEPER] No expired APPROVED bookings found.");
            return;
        }

        log.info("[SWEEPER] Found {} expired APPROVED booking(s) to process.", expired.size());

        int successCount = 0;
        int failCount    = 0;

        for (Booking booking : expired) {
            try {
                // Each call runs in its own transaction — failures are isolated
                bookingService.expireApprovedBooking(booking);
                successCount++;
            } catch (Exception e) {
                failCount++;
                log.error("[SWEEPER] Failed to expire APPROVED booking {}: {}",
                        booking.getId(), e.getMessage(), e);
            }
        }

        log.info("[SWEEPER] APPROVED sweep complete — expired: {}, failed: {}",
                successCount, failCount);
    }

    // -------------------------------------------------------------------------
    // Sweep 2 — Waitlist-draft PENDING bookings past manager action window
    // -------------------------------------------------------------------------

    /**
     * Finds all waitlist-draft PENDING bookings whose {@code pendingExpiresAt}
     * has elapsed and the manager has not yet actioned them. Expires each one
     * and promotes the next student in the period-scoped waitlist.
     */
    private void sweepExpiredWaitlistDrafts() {
        List<Booking> drafts = bookingRepository.findExpiredWaitlistDrafts(LocalDateTime.now());

        if (drafts.isEmpty()) {
            log.debug("[SWEEPER] No expired waitlist drafts found.");
            return;
        }

        log.info("[SWEEPER] Found {} expired waitlist draft(s) to process.", drafts.size());

        int successCount = 0;
        int failCount    = 0;

        for (Booking draft : drafts) {
            try {
                // Each call runs in its own transaction — failures are isolated
                bookingService.expireWaitlistDraft(draft);
                successCount++;
            } catch (Exception e) {
                failCount++;
                log.error("[SWEEPER] Failed to expire waitlist draft {}: {}",
                        draft.getId(), e.getMessage(), e);
            }
        }

        log.info("[SWEEPER] Waitlist draft sweep complete — expired: {}, failed: {}",
                successCount, failCount);
    }
}