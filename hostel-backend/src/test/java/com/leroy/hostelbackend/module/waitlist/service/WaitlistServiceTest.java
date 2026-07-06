package com.leroy.hostelbackend.module.waitlist.service;

import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.hostel.projection.AvailablePeriodProjection;
import com.leroy.hostelbackend.module.hostel.repository.HostelRepository;
import com.leroy.hostelbackend.module.notification.service.NotificationService;
import com.leroy.hostelbackend.module.room.model.Room;
import com.leroy.hostelbackend.module.room.model.RoomStatus;
import com.leroy.hostelbackend.module.room.model.RoomType;
import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.module.waitlist.dto.JoinWaitlistRequest;
import com.leroy.hostelbackend.module.waitlist.mapper.WaitlistMapper;
import com.leroy.hostelbackend.module.waitlist.model.Waitlist;
import com.leroy.hostelbackend.module.waitlist.repository.WaitlistRepository;
import com.leroy.hostelbackend.shared.exception.AlreadyOnWaitlistException;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.leroy.hostelbackend.testsupport.TestFixtures.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link WaitlistService}.
 *
 * <p>The highest-risk logic here is {@link WaitlistService#promoteNextInLine}
 * — its four ordered guards, and the recursive skip-to-next-candidate
 * behavior when a guard rejects a specific student rather than the whole
 * promotion event. Each guard is tested in isolation, then in combination
 * with the recursion to confirm the queue is fully drained of ineligible
 * candidates rather than stopping at the first one.
 */
@ExtendWith(MockitoExtension.class)
class WaitlistServiceTest {

    @Mock private WaitlistRepository  waitlistRepository;
    @Mock private BookingRepository   bookingRepository;
    @Mock private HostelRepository    hostelRepository;
    @Mock private UserRepository      userRepository;
    @Mock private WaitlistMapper      waitlistMapper;
    @Mock private NotificationService notificationService;

    private WaitlistService waitlistService;

    private final String currentAcademicYear =
            Year.now().getValue() + "/" + (Year.now().getValue() + 1);

    @BeforeEach
    void setUp() {
        waitlistService = new WaitlistService(
                waitlistRepository, bookingRepository, hostelRepository,
                userRepository, waitlistMapper, notificationService);
        // draftExpiryHours is populated via @Value in production; a plain
        // constructor call leaves it at 0, which would make the promoted
        // draft's pendingExpiresAt equal to "now" instead of in the future.
        ReflectionTestUtils.setField(waitlistService, "draftExpiryHours", 24);
    }

    /** Stubs the dropdown-backing query so the given period reads as fully booked (or not). */
    private void stubPeriodFullyBooked(UUID hostelId, RoomType roomType,
                                        String academicYear, String semester, boolean fullyBooked) {
        List<AvailablePeriodProjection> projections = fullyBooked
                ? List.of(namedProjection(academicYear, semester))
                : List.of();
        when(hostelRepository.findValidPeriodsForWaitlist(
                eq(hostelId), eq(roomType.name()), any(), any(), any()))
                .thenReturn(projections);
    }

    private AvailablePeriodProjection namedProjection(String academicYear, String semester) {
        AvailablePeriodProjection p = mock(AvailablePeriodProjection.class);
        lenient().when(p.getAcademicYear()).thenReturn(academicYear);
        lenient().when(p.getSemester()).thenReturn(semester);
        return p;
    }

    // =========================================================================
    // joinWaitlist
    // =========================================================================

    @Nested
    @DisplayName("joinWaitlist")
    class JoinWaitlist {

        private final User student = student("Lexa", "Doe");
        private final Hostel hostel = hostel("Leroy Hostel");
        private final JoinWaitlistRequest request =
                new JoinWaitlistRequest(hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST");

        @Test
        @DisplayName("rejects joining when beds of the requested type are still directly bookable")
        void rejectsWhenPeriodNotFullyBooked() {
            stubPeriodFullyBooked(hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST", false);

            assertThatThrownBy(() -> waitlistService.joinWaitlist(student.getId(), request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("still available for direct booking");
            verifyNoInteractions(waitlistRepository);
        }

        @Test
        @DisplayName("rejects a duplicate join for the exact same (hostel, roomType, period)")
        void rejectsDuplicateJoin() {
            stubPeriodFullyBooked(hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST", true);
            when(waitlistRepository.findByStudentIdAndHostelIdAndPeriod(
                    student.getId(), hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST"))
                    .thenReturn(Optional.of(new Waitlist()));

            assertThatThrownBy(() -> waitlistService.joinWaitlist(student.getId(), request))
                    .isInstanceOf(AlreadyOnWaitlistException.class);
        }

        @Test
        @DisplayName("assigns the next sequential position and persists the entry")
        void assignsNextPosition() {
            stubPeriodFullyBooked(hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST", true);
            when(waitlistRepository.findByStudentIdAndHostelIdAndPeriod(any(), any(), any(), any(), any()))
                    .thenReturn(Optional.empty());
            when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
            when(hostelRepository.findById(hostel.getId())).thenReturn(Optional.of(hostel));
            when(waitlistRepository.countByHostelIdAndRoomTypeAndAcademicYearAndSemester(
                    hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST"))
                    .thenReturn(3L);
            when(waitlistRepository.save(any(Waitlist.class))).thenAnswer(inv -> inv.getArgument(0));

            waitlistService.joinWaitlist(student.getId(), request);

            var captor = ArgumentCaptor.forClass(Waitlist.class);
            verify(waitlistRepository).save(captor.capture());
            assertThat(captor.getValue().getPosition()).isEqualTo(4);
            assertThat(captor.getValue().getStudent()).isEqualTo(student);
            assertThat(captor.getValue().getNotified()).isFalse();
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when the student does not exist")
        void throwsWhenStudentMissing() {
            stubPeriodFullyBooked(hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST", true);
            when(waitlistRepository.findByStudentIdAndHostelIdAndPeriod(any(), any(), any(), any(), any()))
                    .thenReturn(Optional.empty());
            when(userRepository.findById(student.getId())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> waitlistService.joinWaitlist(student.getId(), request))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // =========================================================================
    // leaveWaitlist
    // =========================================================================

    @Nested
    @DisplayName("leaveWaitlist")
    class LeaveWaitlist {

        private final User student = student("Lexa", "Doe");
        private final Hostel hostel = hostel("Leroy Hostel");

        @Test
        @DisplayName("throws ResourceNotFoundException when the student is not on this queue")
        void throwsWhenNotOnQueue() {
            when(waitlistRepository.findByStudentIdAndHostelIdAndPeriod(
                    student.getId(), hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> waitlistService.leaveWaitlist(
                    student.getId(), hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("deletes the entry and compacts positions below it")
        void deletesAndCompactsPositions() {
            var entry = new Waitlist();
            entry.setPosition(3);
            when(waitlistRepository.findByStudentIdAndHostelIdAndPeriod(
                    student.getId(), hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST"))
                    .thenReturn(Optional.of(entry));

            waitlistService.leaveWaitlist(
                    student.getId(), hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST");

            verify(waitlistRepository).delete(entry);
            verify(waitlistRepository).decrementPositionsAfter(
                    hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST", 3);
        }
    }

    // =========================================================================
    // managerRemoveEntry
    // =========================================================================

    @Nested
    @DisplayName("managerRemoveEntry")
    class ManagerRemoveEntry {

        @Test
        @DisplayName("throws ResourceNotFoundException for an unknown entry id")
        void throwsWhenMissing() {
            var id = UUID.randomUUID();
            when(waitlistRepository.findById(id)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> waitlistService.managerRemoveEntry(id))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("deletes the entry and compacts positions below it")
        void deletesAndCompacts() {
            var hostel = hostel("Leroy Hostel");
            var entry = new Waitlist();
            entry.setId(UUID.randomUUID());
            entry.setHostel(hostel);
            entry.setRoomType(RoomType.TRIPLE);
            entry.setAcademicYear(currentAcademicYear);
            entry.setSemester("FIRST");
            entry.setPosition(2);
            when(waitlistRepository.findById(entry.getId())).thenReturn(Optional.of(entry));

            waitlistService.managerRemoveEntry(entry.getId());

            verify(waitlistRepository).delete(entry);
            verify(waitlistRepository).decrementPositionsAfter(
                    hostel.getId(), RoomType.TRIPLE, currentAcademicYear, "FIRST", 2);
        }
    }

    // =========================================================================
    // promoteNextInLine — the guard chain
    // =========================================================================

    @Nested
    @DisplayName("promoteNextInLine")
    class PromoteNextInLine {

        private final Hostel hostel = hostel("Leroy Hostel");
        private final Room room = room(hostel, RoomType.SINGLE, 1, 0);

        @Test
        @DisplayName("Guard 1: skips the entire promotion when the freed room is UNDER_MAINTENANCE")
        void guard1_skipsWhenRoomUnderMaintenance() {
            room.setStatus(RoomStatus.UNDER_MAINTENANCE);

            waitlistService.promoteNextInLine(hostel.getId(), room, currentAcademicYear, "FIRST");

            verifyNoInteractions(waitlistRepository, bookingRepository, notificationService);
        }

        @Test
        @DisplayName("Guard 1: skips the entire promotion when the freed room is RESERVED")
        void guard1_skipsWhenRoomReserved() {
            room.setStatus(RoomStatus.RESERVED);

            waitlistService.promoteNextInLine(hostel.getId(), room, currentAcademicYear, "FIRST");

            verifyNoInteractions(waitlistRepository, bookingRepository, notificationService);
        }

        @Test
        @DisplayName("Guard 2: skips the entire promotion for a SECOND-semester vacancy with no FIRST occupancy on record")
        void guard2_skipsSecondSemesterWithoutFirstOccupancy() {
            when(bookingRepository.hasFirstSemesterOccupancy(room.getId(), currentAcademicYear))
                    .thenReturn(false);

            waitlistService.promoteNextInLine(hostel.getId(), room, currentAcademicYear, "SECOND");

            verifyNoInteractions(waitlistRepository, notificationService);
        }

        @Test
        @DisplayName("Guard 2 does not apply to FIRST or FULL semester vacancies")
        void guard2_doesNotApplyToNonSecondSemesters() {
            when(waitlistRepository.findNextInLine(any(), any(), any(), any())).thenReturn(Optional.empty());

            waitlistService.promoteNextInLine(hostel.getId(), room, currentAcademicYear, "FIRST");

            verify(bookingRepository, never()).hasFirstSemesterOccupancy(any(), any());
        }

        @Test
        @DisplayName("does nothing (but does not error) when the queue is empty")
        void noOpWhenQueueEmpty() {
            when(waitlistRepository.findNextInLine(
                    hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST"))
                    .thenReturn(Optional.empty());

            waitlistService.promoteNextInLine(hostel.getId(), room, currentAcademicYear, "FIRST");

            verifyNoInteractions(notificationService);
            verify(bookingRepository, never()).save(any());
        }

        @Test
        @DisplayName("Guard 3: skips a candidate who already holds an active booking for this room+period, then recurses")
        void guard3_skipsDuplicateCandidateAndRecurses() {
            var ineligible = waitlistEntry(1, student("Ama", "Owusu"));
            // Was second in the original queue — a distinct position from
            // `ineligible` matters here: decrementPositionsAfter is called
            // once per removed entry with *that entry's own* position, so
            // giving both the same position would make the two calls
            // indistinguishable to Mockito's strict verification.
            var eligible   = waitlistEntry(2, student("Kwame", "Mensah"));

            when(waitlistRepository.findNextInLine(
                    hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST"))
                    .thenReturn(Optional.of(ineligible))
                    .thenReturn(Optional.of(eligible));
            when(bookingRepository.hasActiveBookingForRoom(
                    ineligible.getStudent().getId(), room.getId(), currentAcademicYear, "FIRST"))
                    .thenReturn(true);
            when(bookingRepository.hasActiveBookingForRoom(
                    eligible.getStudent().getId(), room.getId(), currentAcademicYear, "FIRST"))
                    .thenReturn(false);
            when(userRepository.findManagerByHostelId(hostel.getId())).thenReturn(Optional.empty());
            when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            waitlistService.promoteNextInLine(hostel.getId(), room, currentAcademicYear, "FIRST");

            // The ineligible candidate is removed and the queue is compacted...
            verify(waitlistRepository).delete(ineligible);
            verify(waitlistRepository).decrementPositionsAfter(
                    hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST", ineligible.getPosition());
            // ...then the recursive call finds and promotes the next (eligible) candidate.
            verify(waitlistRepository).delete(eligible);
            verify(bookingRepository).save(argThat(b ->
                    b.getStudent().equals(eligible.getStudent()) && b.getIsWaitlistDraft()));
            verify(notificationService).notifyWaitlistPromoted(eligible.getStudent(), hostel.getId());
        }

        @Test
        @DisplayName("Guard 4: skips a FULL-semester candidate who already holds a FIRST/SECOND booking for the room+year, then recurses")
        void guard4_skipsFullSemesterSelfConflictAndRecurses() {
            var ineligible = waitlistEntry(1, student("Ama", "Owusu"));
            var eligible   = waitlistEntry(2, student("Kwame", "Mensah"));

            when(waitlistRepository.findNextInLine(
                    hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FULL"))
                    .thenReturn(Optional.of(ineligible))
                    .thenReturn(Optional.of(eligible));
            when(bookingRepository.hasActiveBookingForRoom(any(), any(), any(), any())).thenReturn(false);
            when(bookingRepository.studentHasSemesterBookingForYear(
                    ineligible.getStudent().getId(), room.getId(), currentAcademicYear))
                    .thenReturn(true);
            when(bookingRepository.studentHasSemesterBookingForYear(
                    eligible.getStudent().getId(), room.getId(), currentAcademicYear))
                    .thenReturn(false);
            when(userRepository.findManagerByHostelId(hostel.getId())).thenReturn(Optional.empty());
            when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            waitlistService.promoteNextInLine(hostel.getId(), room, currentAcademicYear, "FULL");

            verify(waitlistRepository).delete(ineligible);
            verify(waitlistRepository).delete(eligible);
            verify(notificationService).notifyWaitlistPromoted(eligible.getStudent(), hostel.getId());
        }

        @Test
        @DisplayName("Guard 4 does not apply to FIRST or SECOND semester vacancies")
        void guard4_doesNotApplyToNonFullSemesters() {
            var candidate = waitlistEntry(1, student("Ama", "Owusu"));
            when(waitlistRepository.findNextInLine(
                    hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST"))
                    .thenReturn(Optional.of(candidate));
            when(bookingRepository.hasActiveBookingForRoom(any(), any(), any(), any())).thenReturn(false);
            when(userRepository.findManagerByHostelId(hostel.getId())).thenReturn(Optional.empty());
            when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            waitlistService.promoteNextInLine(hostel.getId(), room, currentAcademicYear, "FIRST");

            verify(bookingRepository, never()).studentHasSemesterBookingForYear(any(), any(), any());
        }

        @Test
        @DisplayName("all guards pass: creates a waitlist-draft booking, notifies the student and manager, and removes the entry")
        void allGuardsPass_createsDraftAndNotifies() {
            var candidate = waitlistEntry(1, student("Ama", "Owusu"));
            var manager = manager("Kwame", "Mensah");

            when(waitlistRepository.findNextInLine(
                    hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST"))
                    .thenReturn(Optional.of(candidate));
            when(bookingRepository.hasActiveBookingForRoom(any(), any(), any(), any())).thenReturn(false);
            when(userRepository.findManagerByHostelId(hostel.getId())).thenReturn(Optional.of(manager));
            when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            waitlistService.promoteNextInLine(hostel.getId(), room, currentAcademicYear, "FIRST");

            var captor = ArgumentCaptor.forClass(com.leroy.hostelbackend.module.booking.model.Booking.class);
            verify(bookingRepository).save(captor.capture());
            var draft = captor.getValue();
            assertThat(draft.getIsWaitlistDraft()).isTrue();
            assertThat(draft.getStatus())
                    .isEqualTo(com.leroy.hostelbackend.module.booking.model.BookingStatus.PENDING);
            assertThat(draft.getStudent()).isEqualTo(candidate.getStudent());
            assertThat(draft.getRoom()).isEqualTo(room);
            assertThat(draft.getPendingExpiresAt()).isAfter(LocalDateTime.now());

            verify(notificationService).notifyWaitlistPromoted(candidate.getStudent(), hostel.getId());
            verify(notificationService).notifyManagerNewBookingRequest(
                    eq(manager), eq(candidate.getStudent().getName()), eq(room.getRoomNumber()), any());
            verify(waitlistRepository).delete(candidate);
            verify(waitlistRepository).decrementPositionsAfter(
                    hostel.getId(), RoomType.SINGLE, currentAcademicYear, "FIRST", candidate.getPosition());
        }

        @Test
        @DisplayName("tolerates a hostel with no assigned manager when promoting")
        void toleratesMissingManagerOnPromotion() {
            var candidate = waitlistEntry(1, student("Ama", "Owusu"));
            when(waitlistRepository.findNextInLine(any(), any(), any(), any()))
                    .thenReturn(Optional.of(candidate));
            when(bookingRepository.hasActiveBookingForRoom(any(), any(), any(), any())).thenReturn(false);
            when(userRepository.findManagerByHostelId(hostel.getId())).thenReturn(Optional.empty());
            when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            waitlistService.promoteNextInLine(hostel.getId(), room, currentAcademicYear, "FIRST");

            verify(notificationService).notifyWaitlistPromoted(candidate.getStudent(), hostel.getId());
            verify(notificationService, never())
                    .notifyManagerNewBookingRequest(any(), any(), any(), any());
        }

        private Waitlist waitlistEntry(int position, User student) {
            var entry = new Waitlist();
            entry.setId(UUID.randomUUID());
            entry.setStudent(student);
            entry.setHostel(hostel);
            entry.setRoomType(RoomType.SINGLE);
            entry.setPosition(position);
            entry.setAcademicYear(currentAcademicYear);
            entry.setSemester("FIRST");
            entry.setNotified(false);
            return entry;
        }
    }

    // =========================================================================
    // getWaitlistPeriodsDropdown — thin delegation, sanity check only
    // =========================================================================

    @Nested
    @DisplayName("getWaitlistPeriodsDropdown")
    class GetWaitlistPeriodsDropdown {

        @Test
        @DisplayName("maps repository projections to AvailablePeriodDto")
        void mapsProjectionsToDto() {
            var hostel = hostel("Leroy Hostel");
            var projection = namedProjection(currentAcademicYear, "FIRST");
            when(hostelRepository.findValidPeriodsForWaitlist(
                    eq(hostel.getId()), eq(RoomType.SINGLE.name()), any(), any(), any()))
                    .thenReturn(List.of(projection));

            var result = waitlistService.getWaitlistPeriodsDropdown(hostel.getId(), RoomType.SINGLE);

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().academicYear()).isEqualTo(currentAcademicYear);
            assertThat(result.getFirst().semester()).isEqualTo("FIRST");
        }
    }
}
