package com.leroy.hostelbackend.shared.scheduler;

import com.leroy.hostelbackend.module.booking.model.BookingStatus;
import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.booking.service.BookingService;
import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.room.model.Room;
import com.leroy.hostelbackend.module.room.model.RoomType;
import com.leroy.hostelbackend.module.user.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static com.leroy.hostelbackend.testsupport.TestFixtures.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link BookingExpiredSweeper}.
 *
 * <p>The sweeper itself owns no business rules — {@link BookingService}
 * does (tested separately). What matters here is the sweep's own
 * responsibilities: querying both expiry categories, processing every
 * booking found, and — critically — isolating failures so that one bad
 * booking doesn't stop the rest of the batch from being processed. This
 * last property can't be verified by testing {@code BookingService} alone.
 */
@ExtendWith(MockitoExtension.class)
class BookingExpiredSweeperTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private BookingService    bookingService;

    private BookingExpiredSweeper sweeper;

    private final Hostel hostel = hostel("Leroy Hostel");
    private final Room room = room(hostel, RoomType.SINGLE, 1, 1);
    private final User student = student("Lexa", "Doe");

    @BeforeEach
    void setUp() {
        sweeper = new BookingExpiredSweeper(bookingRepository, bookingService);
    }

    @Nested
    @DisplayName("sweepExpiredApprovedBookings (via sweep())")
    class SweepExpiredApprovedBookings {

        @Test
        @DisplayName("does nothing when there are no expired APPROVED bookings")
        void noOpWhenNoneFound() {
            when(bookingRepository.findExpiredUnpaidBookings(any())).thenReturn(List.of());
            when(bookingRepository.findExpiredWaitlistDrafts(any())).thenReturn(List.of());

            sweeper.sweep();

            verify(bookingService, never()).expireApprovedBooking(any());
        }

        @Test
        @DisplayName("processes every expired APPROVED booking found")
        void processesEveryExpiredBooking() {
            var booking1 = booking(student, room, BookingStatus.APPROVED, "2025/2026", "FIRST");
            var booking2 = booking(student, room, BookingStatus.APPROVED, "2025/2026", "FIRST");
            when(bookingRepository.findExpiredUnpaidBookings(any()))
                    .thenReturn(List.of(booking1, booking2));
            when(bookingRepository.findExpiredWaitlistDrafts(any())).thenReturn(List.of());

            sweeper.sweep();

            verify(bookingService).expireApprovedBooking(booking1);
            verify(bookingService).expireApprovedBooking(booking2);
        }

        @Test
        @DisplayName("isolates a failure on one booking — the rest of the batch still gets processed")
        void isolatesFailuresBetweenBookings() {
            var failing  = booking(student, room, BookingStatus.APPROVED, "2025/2026", "FIRST");
            var healthy1 = booking(student, room, BookingStatus.APPROVED, "2025/2026", "FIRST");
            var healthy2 = booking(student, room, BookingStatus.APPROVED, "2025/2026", "FIRST");
            when(bookingRepository.findExpiredUnpaidBookings(any()))
                    .thenReturn(List.of(healthy1, failing, healthy2));
            when(bookingRepository.findExpiredWaitlistDrafts(any())).thenReturn(List.of());

            doThrow(new RuntimeException("simulated DB failure"))
                    .when(bookingService).expireApprovedBooking(failing);

            sweeper.sweep();

            verify(bookingService).expireApprovedBooking(healthy1);
            verify(bookingService).expireApprovedBooking(failing);
            verify(bookingService).expireApprovedBooking(healthy2);
        }

        @Test
        @DisplayName("queries with a timestamp so only truly expired bookings are ever selected")
        void queriesWithCurrentTimestamp() {
            when(bookingRepository.findExpiredUnpaidBookings(any())).thenReturn(List.of());
            when(bookingRepository.findExpiredWaitlistDrafts(any())).thenReturn(List.of());

            var before = LocalDateTime.now();
            sweeper.sweep();
            var after = LocalDateTime.now();

            var captor = org.mockito.ArgumentCaptor.forClass(LocalDateTime.class);
            verify(bookingRepository).findExpiredUnpaidBookings(captor.capture());
            org.assertj.core.api.Assertions.assertThat(captor.getValue())
                    .isAfterOrEqualTo(before)
                    .isBeforeOrEqualTo(after);
        }
    }

    @Nested
    @DisplayName("sweepExpiredWaitlistDrafts (via sweep())")
    class SweepExpiredWaitlistDrafts {

        @Test
        @DisplayName("does nothing when there are no expired waitlist drafts")
        void noOpWhenNoneFound() {
            when(bookingRepository.findExpiredUnpaidBookings(any())).thenReturn(List.of());
            when(bookingRepository.findExpiredWaitlistDrafts(any())).thenReturn(List.of());

            sweeper.sweep();

            verify(bookingService, never()).expireWaitlistDraft(any());
        }

        @Test
        @DisplayName("processes every expired waitlist draft found")
        void processesEveryExpiredDraft() {
            var draft1 = booking(student, room, BookingStatus.PENDING, "2025/2026", "FIRST");
            draft1.setIsWaitlistDraft(true);
            var draft2 = booking(student, room, BookingStatus.PENDING, "2025/2026", "FIRST");
            draft2.setIsWaitlistDraft(true);
            when(bookingRepository.findExpiredUnpaidBookings(any())).thenReturn(List.of());
            when(bookingRepository.findExpiredWaitlistDrafts(any()))
                    .thenReturn(List.of(draft1, draft2));

            sweeper.sweep();

            verify(bookingService).expireWaitlistDraft(draft1);
            verify(bookingService).expireWaitlistDraft(draft2);
        }

        @Test
        @DisplayName("isolates a failure on one draft — the rest of the batch still gets processed")
        void isolatesFailuresBetweenDrafts() {
            var failing = booking(student, room, BookingStatus.PENDING, "2025/2026", "FIRST");
            var healthy = booking(student, room, BookingStatus.PENDING, "2025/2026", "FIRST");
            when(bookingRepository.findExpiredUnpaidBookings(any())).thenReturn(List.of());
            when(bookingRepository.findExpiredWaitlistDrafts(any()))
                    .thenReturn(List.of(failing, healthy));

            doThrow(new IllegalStateException("simulated failure"))
                    .when(bookingService).expireWaitlistDraft(failing);

            sweeper.sweep();

            verify(bookingService).expireWaitlistDraft(failing);
            verify(bookingService).expireWaitlistDraft(healthy);
        }
    }

    @Test
    @DisplayName("runs both sweeps on every invocation, independent of each other's results")
    void runsBothSweepsIndependently() {
        var expiredApproved = booking(student, room, BookingStatus.APPROVED, "2025/2026", "FIRST");
        var expiredDraft = booking(student, room, BookingStatus.PENDING, "2025/2026", "FIRST");
        expiredDraft.setIsWaitlistDraft(true);

        when(bookingRepository.findExpiredUnpaidBookings(any())).thenReturn(List.of(expiredApproved));
        when(bookingRepository.findExpiredWaitlistDrafts(any())).thenReturn(List.of(expiredDraft));

        sweeper.sweep();

        verify(bookingService).expireApprovedBooking(expiredApproved);
        verify(bookingService).expireWaitlistDraft(expiredDraft);
    }
}
