package com.leroy.hostelbackend.shared.scheduler;

import com.leroy.hostelbackend.module.booking.model.Booking;
import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.booking.service.BookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Background job that sweeps for APPROVED bookings whose payment deadline has passed.
 * Frees up beds automatically so managers do not have to chase unpaid bookings.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class BookingExpiredSweeper {

    private final BookingRepository bookingRepository;
    private final BookingService bookingService;

    // Runs every 5 minutes. You can override this in application.properties
    // using: hostel.sweeper.rate=60000 (for 1 minute, etc.)
    @Scheduled(fixedRateString = "${hostel.sweeper.rate:300000}")
    public void sweepExpiredBookings() {
        log.debug("[SWEEPER] Running expired booking sweep...");

        List<Booking> expiredBookings = bookingRepository.findExpiredUnpaidBookings(LocalDateTime.now());

        if (expiredBookings.isEmpty()) {
            return;
        }

        log.info("[SWEEPER] Found {} expired bookings to process.", expiredBookings.size());

        for (Booking booking : expiredBookings) {
            try {
                // BookingService.expireBooking runs in its own transaction,
                // so failure here doesn't roll back the whole batch.
                bookingService.expireBooking(booking);
            } catch (Exception e) {
                log.error("[SWEEPER] Failed to expire booking {}: {}", booking.getId(), e.getMessage());
            }
        }
    }
}