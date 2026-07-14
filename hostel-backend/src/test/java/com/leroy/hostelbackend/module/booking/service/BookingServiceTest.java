package com.leroy.hostelbackend.module.booking.service;

import com.leroy.hostelbackend.module.booking.dto.ActionBookingRequest;
import com.leroy.hostelbackend.module.booking.dto.CreateBookingRequest;
import com.leroy.hostelbackend.module.booking.dto.SubmitPaymentRequest;
import com.leroy.hostelbackend.module.booking.mapper.BookingMapper;
import com.leroy.hostelbackend.module.booking.model.Booking;
import com.leroy.hostelbackend.module.booking.model.BookingStatus;
import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.notification.service.NotificationService;
import com.leroy.hostelbackend.module.room.model.Room;
import com.leroy.hostelbackend.module.room.model.RoomStatus;
import com.leroy.hostelbackend.module.room.model.RoomType;
import com.leroy.hostelbackend.module.room.repository.RoomRepository;
import com.leroy.hostelbackend.module.room.service.RoomService;
import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.module.waitlist.service.WaitlistService;
import com.leroy.hostelbackend.shared.exception.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.leroy.hostelbackend.testsupport.TestFixtures.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link BookingService}.
 *
 * <p>All collaborators are mocked — these tests exercise only the business
 * rules owned by this class (validation ordering, state-machine transitions,
 * and <em>when</em> the waitlist is or isn't promoted). Persistence,
 * mapping, and notification delivery are verified only at the level of
 * "was the right collaborator called with the right arguments", not their
 * own internal behavior (each has its own test suite / is generated code).
 */
@ExtendWith(MockitoExtension.class)
public class BookingServiceTest {

    @Mock private BookingRepository   bookingRepository;
    @Mock private RoomRepository      roomRepository;
    @Mock private UserRepository      userRepository;
    @Mock private BookingMapper       bookingMapper;
    @Mock private RoomService         roomService;
    @Mock private WaitlistService     waitlistService;
    @Mock private NotificationService notificationService;

    private BookingService bookingService;

    private final String currentAcademicYear =
            Year.now().getValue() + "/" + (Year.now().getValue() + 1);

    @BeforeEach
    void setUp() {
        bookingService = new BookingService(
                bookingRepository, roomRepository, userRepository,
                bookingMapper, roomService, waitlistService, notificationService);

        // save() is called on the mutated entity throughout the service and the
        // return value is fed straight to the mapper — echoing the argument back
        // keeps every test's assertions focused on the entity's post-mutation state.
        lenient().when(bookingRepository.save(any(Booking.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    // =========================================================================
    // createBooking
    // =========================================================================

    @Nested
    @DisplayName("createBooking")
    class CreateBooking {

        private final User student = student("Lexa", "Doe");
        private final Hostel hostel = hostel("Leroy Hostel");
        private final Room room = room(hostel, RoomType.DOUBLE, 2, 0);
        private final CreateBookingRequest request =
                new CreateBookingRequest(room.getId(), currentAcademicYear, "FIRST");

        @BeforeEach
        void stubHappyPath() {
            lenient().when(roomRepository.findByIdWithHostel(room.getId()))
                    .thenReturn(Optional.of(room));
            lenient().when(userRepository.findById(student.getId()))
                    .thenReturn(Optional.of(student));
            lenient().when(bookingRepository.hasActiveBookingForRoom(any(), any(), any(), any()))
                    .thenReturn(false);
            lenient().when(bookingRepository.countReservedBeds(any(), any(), any()))
                    .thenReturn(0L);
            lenient().when(userRepository.findManagerByHostelId(hostel.getId()))
                    .thenReturn(Optional.empty());
        }

        @Test
        @DisplayName("persists a PENDING booking and notifies the manager when the room is available")
        void createsPendingBookingAndNotifiesManager() {
            var manager = manager("Kwame", "Mensah");
            when(userRepository.findManagerByHostelId(hostel.getId()))
                    .thenReturn(Optional.of(manager));

            bookingService.createBooking(student.getId(), request);

            var captor = ArgumentCaptor.forClass(Booking.class);
            verify(bookingRepository).save(captor.capture());
            var saved = captor.getValue();

            assertThat(saved.getStatus()).isEqualTo(BookingStatus.PENDING);
            assertThat(saved.getStudent()).isEqualTo(student);
            assertThat(saved.getRoom()).isEqualTo(room);
            assertThat(saved.getIsWaitlistDraft()).isFalse();

            verify(notificationService).notifyManagerNewBookingRequest(
                    eq(manager), eq(student.getName()), eq(room.getRoomNumber()), any());
        }

        @Test
        @DisplayName("does not fail when the hostel currently has no assigned manager")
        void toleratesMissingManager() {
            bookingService.createBooking(student.getId(), request);
            verifyNoInteractions(notificationService);
        }

        @ParameterizedTest(name = "rejects malformed academic year \"{0}\"")
        @ValueSource(strings = {"2025", "2025-2026", "25/26", "2025/2027"})
        @DisplayName("rejects a malformed or non-consecutive academic year")
        void rejectsBadAcademicYear(String badYear) {
            var badRequest = new CreateBookingRequest(room.getId(), badYear, "FIRST");

            assertThatThrownBy(() -> bookingService.createBooking(student.getId(), badRequest))
                    .isInstanceOf(IllegalArgumentException.class);
            verifyNoInteractions(bookingRepository);
        }

        @Test
        @DisplayName("rejects an academic year outside the permitted +/-1 year window")
        void rejectsOutOfWindowAcademicYear() {
            int farFutureYear = Year.now().getValue() + 5;
            var badRequest = new CreateBookingRequest(
                    room.getId(), farFutureYear + "/" + (farFutureYear + 1), "FIRST");

            assertThatThrownBy(() -> bookingService.createBooking(student.getId(), badRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("outside the permitted booking window");
        }

        @Test
        @DisplayName("rejects SECOND semester when FIRST has no CHECKED_IN/CHECKED_OUT occupancy")
        void rejectsSecondSemesterWithoutFirstOccupancy() {
            when(bookingRepository.hasFirstSemesterOccupancy(room.getId(), currentAcademicYear))
                    .thenReturn(false);
            var secondRequest = new CreateBookingRequest(room.getId(), currentAcademicYear, "SECOND");

            assertThatThrownBy(() -> bookingService.createBooking(student.getId(), secondRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("SECOND semester");
        }

        @Test
        @DisplayName("allows SECOND semester once FIRST has CHECKED_IN/CHECKED_OUT occupancy")
        void allowsSecondSemesterWithFirstOccupancy() {
            when(bookingRepository.hasFirstSemesterOccupancy(room.getId(), currentAcademicYear))
                    .thenReturn(true);
            var secondRequest = new CreateBookingRequest(room.getId(), currentAcademicYear, "SECOND");

            bookingService.createBooking(student.getId(), secondRequest);

            verify(bookingRepository).save(any(Booking.class));
        }

        @Test
        @DisplayName("rejects FULL semester when the student already holds a FIRST/SECOND booking for the room+year")
        void rejectsFullSemesterSelfConflict() {
            when(bookingRepository.studentHasSemesterBookingForYear(
                    student.getId(), room.getId(), currentAcademicYear))
                    .thenReturn(true);
            var fullRequest = new CreateBookingRequest(room.getId(), currentAcademicYear, "FULL");

            assertThatThrownBy(() -> bookingService.createBooking(student.getId(), fullRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("FULL year");
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when the room does not exist")
        void throwsWhenRoomMissing() {
            when(roomRepository.findByIdWithHostel(room.getId())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookingService.createBooking(student.getId(), request))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @ParameterizedTest(name = "rejects a room with status {0}")
        @ValueSource(strings = {"UNDER_MAINTENANCE", "RESERVED"})
        @DisplayName("rejects a room that is administratively blocked")
        void rejectsBlockedRoom(String status) {
            room.setStatus(RoomStatus.valueOf(status));

            assertThatThrownBy(() -> bookingService.createBooking(student.getId(), request))
                    .isInstanceOf(RoomFullyOccupiedException.class);
        }

        @Test
        @DisplayName("rejects a duplicate active booking for the same room+period")
        void rejectsDuplicateActiveBooking() {
            when(bookingRepository.hasActiveBookingForRoom(
                    student.getId(), room.getId(), currentAcademicYear, "FIRST"))
                    .thenReturn(true);

            assertThatThrownBy(() -> bookingService.createBooking(student.getId(), request))
                    .isInstanceOf(BookingAlreadyExistsException.class);
        }

        @Test
        @DisplayName("rejects the booking once reserved beds reach room capacity")
        void rejectsWhenRoomIsFull() {
            when(bookingRepository.countReservedBeds(room.getId(), currentAcademicYear, "FIRST"))
                    .thenReturn(2L); // capacity is 2

            assertThatThrownBy(() -> bookingService.createBooking(student.getId(), request))
                    .isInstanceOf(RoomFullyOccupiedException.class);
        }
    }

    // =========================================================================
    // cancelBooking
    // =========================================================================

    @Nested
    @DisplayName("cancelBooking")
    class CancelBooking {

        private final User student = student("Lexa", "Doe");
        private final Hostel hostel = hostel("Leroy Hostel");
        private final Room room = room(hostel, RoomType.SINGLE, 1, 0);

        @Test
        @DisplayName("throws HostelAccessDeniedException when the requester is not the booking's student")
        void rejectsWrongStudent() {
            var booking = booking(student, room, BookingStatus.PENDING, currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(booking.getId()))
                    .thenReturn(Optional.of(booking));

            assertThatThrownBy(() -> bookingService.cancelBooking(booking.getId(), UUID.randomUUID()))
                    .isInstanceOf(HostelAccessDeniedException.class);
        }

        @ParameterizedTest(name = "rejects cancelling a {0} booking")
        @ValueSource(strings = {"CHECKED_IN", "CHECKED_OUT", "REJECTED", "EXPIRED", "CANCELLED"})
        @DisplayName("rejects cancellation from any non-PENDING/APPROVED status")
        void rejectsInvalidStatus(String status) {
            var booking = booking(student, room, BookingStatus.valueOf(status), currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(booking.getId()))
                    .thenReturn(Optional.of(booking));

            assertThatThrownBy(() -> bookingService.cancelBooking(booking.getId(), student.getId()))
                    .isInstanceOf(InvalidBookingTransitionException.class);
        }

        @Test
        @DisplayName("cancelling a PENDING booking does NOT promote the waitlist (no slot was ever locked)")
        void pendingCancelDoesNotPromoteWaitlist() {
            var booking = booking(student, room, BookingStatus.PENDING, currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(booking.getId()))
                    .thenReturn(Optional.of(booking));

            bookingService.cancelBooking(booking.getId(), student.getId());

            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
            verifyNoInteractions(waitlistService);
            verify(notificationService).notifyBookingCancelled(student, booking.getId());
        }

        @Test
        @DisplayName("cancelling an APPROVED booking DOES promote the waitlist (a locked slot is freed)")
        void approvedCancelPromotesWaitlist() {
            var booking = booking(student, room, BookingStatus.APPROVED, currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(booking.getId()))
                    .thenReturn(Optional.of(booking));

            bookingService.cancelBooking(booking.getId(), student.getId());

            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
            verify(waitlistService).promoteNextInLine(hostel.getId(), room, currentAcademicYear, "FIRST");
        }
    }

    // =========================================================================
    // submitPayment
    // =========================================================================

    @Nested
    @DisplayName("submitPayment")
    class SubmitPayment {

        private final User student = student("Lexa", "Doe");
        private final Hostel hostel = hostel("Leroy Hostel");
        private final Room room = room(hostel, RoomType.SINGLE, 1, 0);
        private final SubmitPaymentRequest request =
                new SubmitPaymentRequest("MOMO-REF-123", new BigDecimal("1500.00"));

        @Test
        @DisplayName("throws HostelAccessDeniedException for a non-owning student")
        void rejectsWrongStudent() {
            var booking = booking(student, room, BookingStatus.APPROVED, currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(booking.getId()))
                    .thenReturn(Optional.of(booking));

            assertThatThrownBy(() ->
                    bookingService.submitPayment(booking.getId(), UUID.randomUUID(), request))
                    .isInstanceOf(HostelAccessDeniedException.class);
        }

        @Test
        @DisplayName("throws InvalidBookingTransitionException when the booking is not APPROVED")
        void rejectsWhenNotApproved() {
            var booking = booking(student, room, BookingStatus.PENDING, currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(booking.getId()))
                    .thenReturn(Optional.of(booking));

            assertThatThrownBy(() ->
                    bookingService.submitPayment(booking.getId(), student.getId(), request))
                    .isInstanceOf(InvalidBookingTransitionException.class);
        }

        @Test
        @DisplayName("throws IllegalStateException once the payment deadline has already elapsed")
        void rejectsAfterDeadline() {
            var booking = booking(student, room, BookingStatus.APPROVED, currentAcademicYear, "FIRST");
            booking.setPaymentExpiresAt(LocalDateTime.now().minusMinutes(1));
            when(bookingRepository.findByIdWithDetails(booking.getId()))
                    .thenReturn(Optional.of(booking));

            assertThatThrownBy(() ->
                    bookingService.submitPayment(booking.getId(), student.getId(), request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("deadline has passed");
        }

        @Test
        @DisplayName("records the payment reference and notifies the manager")
        void recordsPaymentAndNotifiesManager() {
            var booking = booking(student, room, BookingStatus.APPROVED, currentAcademicYear, "FIRST");
            booking.setPaymentExpiresAt(LocalDateTime.now().plusHours(1));
            when(bookingRepository.findByIdWithDetails(booking.getId()))
                    .thenReturn(Optional.of(booking));
            var manager = manager("Kwame", "Mensah");
            when(userRepository.findManagerByHostelId(hostel.getId())).thenReturn(Optional.of(manager));

            bookingService.submitPayment(booking.getId(), student.getId(), request);

            assertThat(booking.getPaymentRef()).isEqualTo("MOMO-REF-123");
            assertThat(booking.getAmountPaid()).isEqualByComparingTo("1500.00");
            verify(notificationService).notifyManagerPaymentSubmitted(
                    manager, student.getName(), room.getRoomNumber(), booking.getId());
        }
    }

    // =========================================================================
    // actionBooking — approve / reject
    // =========================================================================

    @Nested
    @DisplayName("actionBooking")
    class ActionBooking {

        private final User student = student("Lexa", "Doe");
        private final User manager = manager("Kwame", "Mensah");
        private final Hostel hostel = hostel("Leroy Hostel");
        private final Room room = room(hostel, RoomType.DOUBLE, 2, 0);
        private Booking booking;

        @BeforeEach
        void stub() {
            booking = booking(student, room, BookingStatus.PENDING, currentAcademicYear, "FIRST");
            lenient().when(bookingRepository.findByIdWithDetails(booking.getId()))
                    .thenReturn(Optional.of(booking));
            lenient().when(userRepository.findById(manager.getId())).thenReturn(Optional.of(manager));
            lenient().when(roomRepository.findByIdForUpdate(room.getId())).thenReturn(Optional.of(room));
        }

        @ParameterizedTest(name = "rejects actioning a {0} booking")
        @ValueSource(strings = {"APPROVED", "REJECTED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "EXPIRED"})
        @DisplayName("rejects actioning any booking that is not currently PENDING")
        void rejectsNonPendingBooking(String status) {
            booking.setStatus(BookingStatus.valueOf(status));
            var request = new ActionBookingRequest(true, null, 48);

            assertThatThrownBy(() -> bookingService.actionBooking(booking.getId(), manager.getId(), request))
                    .isInstanceOf(InvalidBookingTransitionException.class);
        }

        @Test
        @DisplayName("approves the booking, locks the room row, and sets the payment deadline from the grace period")
        void approvesAndSetsPaymentDeadline() {
            when(bookingRepository.countReservedBeds(room.getId(), currentAcademicYear, "FIRST"))
                    .thenReturn(0L);
            var request = new ActionBookingRequest(true, null, 12);

            var before = LocalDateTime.now();
            bookingService.actionBooking(booking.getId(), manager.getId(), request);

            assertThat(booking.getStatus()).isEqualTo(BookingStatus.APPROVED);
            assertThat(booking.getApprovedBy()).isEqualTo(manager);
            assertThat(booking.getPaymentExpiresAt())
                    .isAfter(before.plusHours(11))
                    .isBefore(before.plusHours(13));
            verify(notificationService).notifyBookingApproved(student, booking.getId(), 12);
            verify(roomRepository).findByIdForUpdate(room.getId()); // pessimistic lock acquired
        }

        @Test
        @DisplayName("defaults the grace period to 48 hours when none is provided")
        void defaultsGracePeriod() {
            when(bookingRepository.countReservedBeds(any(), any(), any())).thenReturn(0L);
            var request = new ActionBookingRequest(true, null, null);

            bookingService.actionBooking(booking.getId(), manager.getId(), request);

            verify(notificationService).notifyBookingApproved(student, booking.getId(), 48);
        }

        @Test
        @DisplayName("re-checks capacity after acquiring the room lock and rejects if a race filled the last bed")
        void rejectsApprovalIfRoomFilledDuringRace() {
            when(bookingRepository.countReservedBeds(room.getId(), currentAcademicYear, "FIRST"))
                    .thenReturn(2L); // capacity is 2 — filled since the student applied
            var request = new ActionBookingRequest(true, null, 48);

            assertThatThrownBy(() -> bookingService.actionBooking(booking.getId(), manager.getId(), request))
                    .isInstanceOf(RoomFullyOccupiedException.class);
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING); // unchanged
        }

        @Test
        @DisplayName("bulk-rejects other PENDING bookings for the same room+period when approval fills the last bed")
        void bulkRejectsStalePendingOnLastBed() {
            when(bookingRepository.countReservedBeds(room.getId(), currentAcademicYear, "FIRST"))
                    .thenReturn(1L); // 1 of 2 beds reserved; this approval fills the last one
            var request = new ActionBookingRequest(true, null, 48);

            bookingService.actionBooking(booking.getId(), manager.getId(), request);

            verify(bookingRepository).rejectOtherPendingForRoom(
                    eq(room.getId()), eq(currentAcademicYear), eq("FIRST"),
                    eq(booking.getId()), anyString(), any(LocalDateTime.class));
        }

        @Test
        @DisplayName("does not bulk-reject other PENDING bookings when beds remain after approval")
        void doesNotBulkRejectWhenBedsRemain() {
            when(bookingRepository.countReservedBeds(room.getId(), currentAcademicYear, "FIRST"))
                    .thenReturn(0L); // 2-capacity room, only this approval reserves a bed
            var request = new ActionBookingRequest(true, null, 48);

            bookingService.actionBooking(booking.getId(), manager.getId(), request);

            verify(bookingRepository, never()).rejectOtherPendingForRoom(
                    any(), any(), any(), any(), any(), any());
        }

        @Test
        @DisplayName("throws IllegalArgumentException when rejecting without a reason")
        void rejectsWithoutReasonThrows() {
            var request = new ActionBookingRequest(false, "  ", 48);

            assertThatThrownBy(() -> bookingService.actionBooking(booking.getId(), manager.getId(), request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("rejection reason is required");
        }

        @Test
        @DisplayName("rejects the booking, trims the reason, and does NOT promote the waitlist")
        void rejectsAndNeverPromotesWaitlist() {
            var request = new ActionBookingRequest(false, "  Room reassigned.  ", null);

            bookingService.actionBooking(booking.getId(), manager.getId(), request);

            assertThat(booking.getStatus()).isEqualTo(BookingStatus.REJECTED);
            assertThat(booking.getRejectedReason()).isEqualTo("Room reassigned.");
            assertThat(booking.getRejectedAt()).isNotNull();
            verify(notificationService).notifyBookingRejected(student, booking.getId(), "  Room reassigned.  ");
            verifyNoInteractions(waitlistService);
            // Rejection never touches room capacity — no lock, no save.
            verifyNoInteractions(roomRepository);
        }
    }

    // =========================================================================
    // checkIn
    // =========================================================================

    @Nested
    @DisplayName("checkIn")
    class CheckIn {

        private final User student = student("Lexa", "Doe");
        private final User manager = manager("Kwame", "Mensah");
        private final Hostel hostel = hostel("Leroy Hostel");
        private final Room room = room(hostel, RoomType.DOUBLE, 2, 0);
        private Booking booking;

        @BeforeEach
        void stub() {
            booking = booking(student, room, BookingStatus.APPROVED, currentAcademicYear, "FIRST");
            booking.setPaymentRef("MOMO-REF-123");
            lenient().when(bookingRepository.findByIdWithDetails(booking.getId()))
                    .thenReturn(Optional.of(booking));
            lenient().when(bookingRepository.findActiveByStudentId(student.getId()))
                    .thenReturn(List.of());
        }

        @Test
        @DisplayName("throws InvalidBookingTransitionException when the booking is not APPROVED")
        void rejectsWhenNotApproved() {
            booking.setStatus(BookingStatus.PENDING);

            assertThatThrownBy(() -> bookingService.checkIn(booking.getId(), manager.getId()))
                    .isInstanceOf(InvalidBookingTransitionException.class);
        }

        @Test
        @DisplayName("throws IllegalStateException when no payment reference has been submitted")
        void rejectsWithoutPaymentRef() {
            booking.setPaymentRef(null);

            assertThatThrownBy(() -> bookingService.checkIn(booking.getId(), manager.getId()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("payment reference");
        }

        @Test
        @DisplayName("throws IllegalStateException when the payment reference is blank")
        void rejectsWithBlankPaymentRef() {
            booking.setPaymentRef("   ");

            assertThatThrownBy(() -> bookingService.checkIn(booking.getId(), manager.getId()))
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        @DisplayName("increments physical occupancy and transitions to CHECKED_IN")
        void incrementsOccupancyAndChecksIn() {
            when(roomRepository.findByIdForUpdate(room.getId())).thenReturn(Optional.of(room));

            bookingService.checkIn(booking.getId(), manager.getId());

            assertThat(room.getCurrentOccupancy()).isEqualTo((short) 1);
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CHECKED_IN);
            assertThat(booking.getCheckedInAt()).isNotNull();
            verify(roomService).recalculateRoomStatus(room);
            verify(roomRepository).save(room);
            verify(notificationService).notifyCheckedIn(student, booking.getId());
        }

        @Test
        @DisplayName("sends an other-active-bookings reminder when the student holds other active bookings")
        void sendsReminderForOtherActiveBookings() {
            when(roomRepository.findByIdForUpdate(room.getId())).thenReturn(Optional.of(room));
            var otherRoom = room(hostel, RoomType.SINGLE, 1, 0);
            var otherBooking = booking(student, otherRoom, BookingStatus.APPROVED, currentAcademicYear, "FIRST");
            when(bookingRepository.findActiveByStudentId(student.getId()))
                    .thenReturn(List.of(otherBooking, booking)); // includes the one just checked in

            bookingService.checkIn(booking.getId(), manager.getId());

            // Only the *other* booking counts — the one being checked in is excluded.
            verify(notificationService).notifyOtherActiveBookingsReminder(student.getId(), 1);
        }

        @Test
        @DisplayName("does not send a reminder when there are no other active bookings")
        void noReminderWhenNoOtherBookings() {
            when(roomRepository.findByIdForUpdate(room.getId())).thenReturn(Optional.of(room));

            bookingService.checkIn(booking.getId(), manager.getId());

            verify(notificationService, never())
                    .notifyOtherActiveBookingsReminder(any(), anyInt());
        }

        @Test
        @DisplayName("throws ResourceNotFoundException if the room disappears before the lock is acquired")
        void throwsWhenRoomMissingAtLockTime() {
            when(roomRepository.findByIdForUpdate(room.getId())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookingService.checkIn(booking.getId(), manager.getId()))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // =========================================================================
    // checkOut
    // =========================================================================

    @Nested
    @DisplayName("checkOut")
    class CheckOut {

        private final User student = student("Lexa", "Doe");
        private final User manager = manager("Kwame", "Mensah");
        private final Hostel hostel = hostel("Leroy Hostel");
        private final Room room = room(hostel, RoomType.DOUBLE, 2, 1);
        private Booking booking;

        @BeforeEach
        void stub() {
            booking = booking(student, room, BookingStatus.CHECKED_IN, currentAcademicYear, "FIRST");
            lenient().when(bookingRepository.findByIdWithDetails(booking.getId()))
                    .thenReturn(Optional.of(booking));
        }

        @Test
        @DisplayName("throws InvalidBookingTransitionException when the booking is not CHECKED_IN")
        void rejectsWhenNotCheckedIn() {
            booking.setStatus(BookingStatus.APPROVED);

            assertThatThrownBy(() -> bookingService.checkOut(booking.getId(), manager.getId()))
                    .isInstanceOf(InvalidBookingTransitionException.class);
        }

        @Test
        @DisplayName("decrements physical occupancy, transitions to CHECKED_OUT, and promotes the waitlist")
        void decrementsOccupancyAndPromotesWaitlist() {
            when(roomRepository.findByIdForUpdate(room.getId())).thenReturn(Optional.of(room));

            bookingService.checkOut(booking.getId(), manager.getId());

            assertThat(room.getCurrentOccupancy()).isEqualTo((short) 0);
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CHECKED_OUT);
            assertThat(booking.getCheckedOutAt()).isNotNull();
            verify(roomService).recalculateRoomStatus(room);
            verify(waitlistService).promoteNextInLine(hostel.getId(), room, currentAcademicYear, "FIRST");
            verify(notificationService).notifyCheckedOut(student, booking.getId());
        }

        @Test
        @DisplayName("never lets occupancy go negative even if state is already inconsistent")
        void neverGoesNegative() {
            room.setCurrentOccupancy((short) 0); // already zero, defensively
            when(roomRepository.findByIdForUpdate(room.getId())).thenReturn(Optional.of(room));

            bookingService.checkOut(booking.getId(), manager.getId());

            assertThat(room.getCurrentOccupancy()).isEqualTo((short) 0);
        }
    }

    // =========================================================================
    // Sweeper-invoked package-visible methods
    // =========================================================================

    @Nested
    @DisplayName("expireApprovedBooking")
    class ExpireApprovedBooking {

        private final User student = student("Lexa", "Doe");
        private final Hostel hostel = hostel("Leroy Hostel");
        private final Room room = room(hostel, RoomType.SINGLE, 1, 0);

        @Test
        @DisplayName("is a no-op when the booking no longer exists (already actioned)")
        void noOpWhenMissing() {
            var staleRef = booking(student, room, BookingStatus.APPROVED, currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(staleRef.getId())).thenReturn(Optional.empty());

            bookingService.expireApprovedBooking(staleRef);

            verifyNoInteractions(waitlistService, notificationService);
        }

        @Test
        @DisplayName("is a no-op when the booking has already moved out of APPROVED")
        void noOpWhenAlreadyActioned() {
            var current = booking(student, room, BookingStatus.CHECKED_IN, currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(current.getId())).thenReturn(Optional.of(current));

            bookingService.expireApprovedBooking(current);

            verifyNoInteractions(waitlistService, notificationService);
        }

        @Test
        @DisplayName("expires the booking and promotes the waitlist when still APPROVED")
        void expiresAndPromotesWaitlist() {
            var current = booking(student, room, BookingStatus.APPROVED, currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(current.getId())).thenReturn(Optional.of(current));

            bookingService.expireApprovedBooking(current);

            assertThat(current.getStatus()).isEqualTo(BookingStatus.EXPIRED);
            verify(waitlistService).promoteNextInLine(hostel.getId(), room, currentAcademicYear, "FIRST");
            verify(notificationService).notifyBookingExpired(student, current.getId());
        }
    }

    @Nested
    @DisplayName("expireWaitlistDraft")
    class ExpireWaitlistDraft {

        private final User student = student("Lexa", "Doe");
        private final Hostel hostel = hostel("Leroy Hostel");
        private final Room room = room(hostel, RoomType.SINGLE, 1, 0);

        @Test
        @DisplayName("is a no-op when the booking no longer exists")
        void noOpWhenMissing() {
            var staleRef = booking(student, room, BookingStatus.PENDING, currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(staleRef.getId())).thenReturn(Optional.empty());

            bookingService.expireWaitlistDraft(staleRef);

            verifyNoInteractions(waitlistService);
        }

        @Test
        @DisplayName("is a no-op when the draft has already been actioned by the manager")
        void noOpWhenAlreadyActioned() {
            var current = booking(student, room, BookingStatus.APPROVED, currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(current.getId())).thenReturn(Optional.of(current));

            bookingService.expireWaitlistDraft(current);

            verifyNoInteractions(waitlistService);
        }

        @Test
        @DisplayName("expires the draft, records the reason, and promotes the next candidate")
        void expiresAndPromotesNextCandidate() {
            var current = booking(student, room, BookingStatus.PENDING, currentAcademicYear, "FIRST");
            current.setIsWaitlistDraft(true);
            when(bookingRepository.findByIdWithDetails(current.getId())).thenReturn(Optional.of(current));

            bookingService.expireWaitlistDraft(current);

            assertThat(current.getStatus()).isEqualTo(BookingStatus.EXPIRED);
            assertThat(current.getRejectedReason()).contains("Waitlist draft expired");
            assertThat(current.getRejectedAt()).isNotNull();
            verify(waitlistService).promoteNextInLine(hostel.getId(), room, currentAcademicYear, "FIRST");
        }
    }

    // =========================================================================
    // getBookingById — access control
    // =========================================================================

    @Nested
    @DisplayName("getBookingById")
    class GetBookingById {

        private final User student = student("Lexa", "Doe");
        private final Hostel hostel = hostel("Leroy Hostel");
        private final Room room = room(hostel, RoomType.SINGLE, 1, 0);

        @Test
        @DisplayName("allows a student to view their own booking")
        void allowsOwner() {
            var booking = booking(student, room, BookingStatus.PENDING, currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(booking.getId())).thenReturn(Optional.of(booking));

            assertThatCode(() ->
                    bookingService.getBookingById(booking.getId(), student.getId(), false))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("denies a student viewing another student's booking")
        void deniesNonOwner() {
            var booking = booking(student, room, BookingStatus.PENDING, currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(booking.getId())).thenReturn(Optional.of(booking));

            assertThatThrownBy(() ->
                    bookingService.getBookingById(booking.getId(), UUID.randomUUID(), false))
                    .isInstanceOf(HostelAccessDeniedException.class);
        }

        @Test
        @DisplayName("allows a manager/admin to view any booking regardless of ownership")
        void allowsManagerOrAdmin() {
            var booking = booking(student, room, BookingStatus.PENDING, currentAcademicYear, "FIRST");
            when(bookingRepository.findByIdWithDetails(booking.getId())).thenReturn(Optional.of(booking));

            assertThatCode(() ->
                    bookingService.getBookingById(booking.getId(), UUID.randomUUID(), true))
                    .doesNotThrowAnyException();
        }
    }
}
