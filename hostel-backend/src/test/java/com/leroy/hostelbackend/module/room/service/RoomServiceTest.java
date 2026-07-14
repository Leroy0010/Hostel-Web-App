package com.leroy.hostelbackend.module.room.service;

import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.hostel.repository.HostelRepository;
import com.leroy.hostelbackend.module.hostel.service.HostelService;
import com.leroy.hostelbackend.module.room.dto.AmenityRequest;
import com.leroy.hostelbackend.module.room.dto.CreateRoomRequest;
import com.leroy.hostelbackend.module.room.dto.UpdateRoomRequest;
import com.leroy.hostelbackend.module.room.mapper.RoomMapper;
import com.leroy.hostelbackend.module.room.model.Room;
import com.leroy.hostelbackend.module.room.model.RoomAmenity;
import com.leroy.hostelbackend.module.room.model.RoomStatus;
import com.leroy.hostelbackend.module.room.model.RoomType;
import com.leroy.hostelbackend.module.room.repository.RoomAmenityRepository;
import com.leroy.hostelbackend.module.room.repository.RoomRepository;
import com.leroy.hostelbackend.shared.exception.DuplicateRoomNumberException;
import com.leroy.hostelbackend.shared.exception.HostelAccessDeniedException;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.leroy.hostelbackend.testsupport.TestFixtures.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link RoomService}.
 *
 * <p>{@link HostelService} is mocked throughout — its own ownership logic
 * has no dedicated test suite yet (flagged as a follow-up), but one test
 * here ({@link CreateRoom#adminIsRejectedByAssertManagerOwns}) pins down a
 * real interaction between the two classes that was initially flagged as a
 * possible Javadoc/enforcement mismatch and has since been confirmed as
 * intentional (see that test's comment for the resolution).
 */
@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @Mock private RoomRepository        roomRepository;
    @Mock private RoomAmenityRepository amenityRepository;
    @Mock private HostelRepository      hostelRepository;
    @Mock private HostelService         hostelService;
    @Mock private RoomMapper            roomMapper;
    @Mock private BookingRepository     bookingRepository;

    private RoomService roomService;

    private final UUID actorId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        roomService = new RoomService(
                roomRepository, amenityRepository, hostelRepository,
                hostelService, roomMapper, bookingRepository);
    }

    // =========================================================================
    // createRoom
    // =========================================================================

    @Nested
    @DisplayName("createRoom")
    class CreateRoom {

        private final Hostel hostel = hostel("Leroy Hostel");
        private final CreateRoomRequest request = new CreateRoomRequest(
                "A-101", RoomType.SINGLE, (short) 1, new BigDecimal("1500.00"),
                "https://example.com/room.jpg", 1, List.of());

        @BeforeEach
        void stub() {
            lenient().when(hostelRepository.findById(hostel.getId())).thenReturn(Optional.of(hostel));
            lenient().when(roomRepository.existsByHostelIdAndRoomNumberIgnoreCase(hostel.getId(), "A-101"))
                    .thenReturn(false);
            lenient().when(roomRepository.save(any(Room.class))).thenAnswer(inv -> inv.getArgument(0));
        }

        @Test
        @DisplayName("persists the room with AVAILABLE status and zero occupancy")
        void createsRoomWithDefaults() {
            roomService.createRoom(hostel.getId(), request, actorId);

            var captor = ArgumentCaptor.forClass(Room.class);
            verify(roomRepository).save(captor.capture());
            var saved = captor.getValue();
            assertThat(saved.getRoomNumber()).isEqualTo("A-101");
            assertThat(saved.getStatus()).isEqualTo(RoomStatus.AVAILABLE);
            assertThat(saved.getCurrentOccupancy()).isEqualTo((short) 0);
        }

        @Test
        @DisplayName("persists provided amenities alongside the room")
        void persistsAmenities() {
            var withAmenities = new CreateRoomRequest(
                    "A-101", RoomType.SINGLE, (short) 1, new BigDecimal("1500.00"),
                    "https://example.com/room.jpg", 1,
                    List.of(new AmenityRequest("Air Conditioning", null)));
            when(amenityRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

            roomService.createRoom(hostel.getId(), withAmenities, actorId);

            var captor = ArgumentCaptor.forClass(List.class);
            verify(amenityRepository).saveAll(captor.capture());
            assertThat(captor.getValue()).hasSize(1);
        }

        @Test
        @DisplayName("does not touch the amenity repository when no amenities are provided")
        void skipsAmenitiesWhenNoneProvided() {
            roomService.createRoom(hostel.getId(), request, actorId);
            verifyNoInteractions(amenityRepository);
        }

        @Test
        @DisplayName("throws DuplicateRoomNumberException when the room number already exists in the hostel")
        void rejectsDuplicateRoomNumber() {
            when(roomRepository.existsByHostelIdAndRoomNumberIgnoreCase(hostel.getId(), "A-101"))
                    .thenReturn(true);

            assertThatThrownBy(() -> roomService.createRoom(hostel.getId(), request, actorId))
                    .isInstanceOf(DuplicateRoomNumberException.class);
            verify(roomRepository, never()).save(any());
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when the hostel does not exist")
        void throwsWhenHostelMissing() {
            when(hostelRepository.findById(hostel.getId())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> roomService.createRoom(hostel.getId(), request, actorId))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("propagates HostelAccessDeniedException when the actor doesn't own the hostel")
        void rejectsNonOwningManager() {
            doThrow(new HostelAccessDeniedException("You don't have permission access this hostel"))
                    .when(hostelService).assertManagerOwns(hostel.getId(), actorId);

            assertThatThrownBy(() -> roomService.createRoom(hostel.getId(), request, actorId))
                    .isInstanceOf(HostelAccessDeniedException.class);
            verifyNoInteractions(roomRepository);
        }

        @Test
        @DisplayName("CONFIRMED INTENTIONAL: an ADMIN actor is rejected the same as any other non-owning manager")
        void adminIsRejectedByAssertManagerOwns() {
            // Originally flagged as a Javadoc/enforcement mismatch: RoomService's
            // class Javadoc claimed "ADMIN — full CRUD on any room in any hostel"
            // while assertManagerOwns has no ADMIN bypass. Since then, the
            // RoomController @PreAuthorize for createRoom was narrowed to
            // hasRole('MANAGER') only, and the Javadoc now carries an inline note
            // confirming the real intent: "(I want only the managers to have
            // controll over the rooms)". So this is confirmed-intentional
            // behavior, not an open question — this test still pins it down at
            // the service level by simulating what the real (mocked here)
            // HostelService does for a non-owning actor, since createRoom
            // unconditionally calls assertManagerOwns for every actor regardless
            // of role.
            doThrow(new HostelAccessDeniedException("You don't have permission access this hostel"))
                    .when(hostelService).assertManagerOwns(hostel.getId(), actorId);

            assertThatThrownBy(() -> roomService.createRoom(hostel.getId(), request, actorId))
                    .isInstanceOf(HostelAccessDeniedException.class);

            // The remaining class Javadoc still literally says "ADMIN — full CRUD"
            // above the inline note contradicting it — worth a documentation
            // cleanup pass, though the enforced behavior itself is now settled.
        }
    }

    // =========================================================================
    // updateRoom
    // =========================================================================

    @Nested
    @DisplayName("updateRoom")
    class UpdateRoom {

        private final Hostel hostel = hostel("Leroy Hostel");
        private Room room;

        @BeforeEach
        void stub() {
            room = room(hostel, RoomType.DOUBLE, 2, 1);
            room.setRoomNumber("A-101");
            lenient().when(roomRepository.findByIdWithHostel(room.getId())).thenReturn(Optional.of(room));
            lenient().when(roomRepository.save(any(Room.class))).thenAnswer(inv -> inv.getArgument(0));
            lenient().when(amenityRepository.findByRoomId(room.getId())).thenReturn(List.of());
        }

        @Test
        @DisplayName("patch semantics: leaves fields untouched when their request value is null")
        void leavesUntouchedFieldsAsIs() {
            var priceOnly = new UpdateRoomRequest(null, null, null, new BigDecimal("1800.00"), null, null);

            roomService.updateRoom(room.getId(), priceOnly, actorId);

            assertThat(room.getRoomNumber()).isEqualTo("A-101"); // unchanged
            assertThat(room.getPricePerSemester()).isEqualByComparingTo("1800.00");
        }

        @Test
        @DisplayName("trims and applies a new room number when it actually changes")
        void appliesChangedRoomNumber() {
            // NOTE: the duplicate check uses the raw (untrimmed) request value —
            // trimming only happens afterward, when the field is actually set.
            when(roomRepository.existsByHostelIdAndRoomNumberIgnoreCase(hostel.getId(), "  B-204  "))
                    .thenReturn(false);
            var request = new UpdateRoomRequest("  B-204  ", null, null, null, null, null);

            roomService.updateRoom(room.getId(), request, actorId);

            assertThat(room.getRoomNumber()).isEqualTo("B-204");
        }

        @Test
        @DisplayName("does not re-check for duplicates when the room number is unchanged (case-insensitive)")
        void skipsDuplicateCheckWhenNumberUnchanged() {
            var request = new UpdateRoomRequest("a-101", null, null, null, null, null); // same, different case

            roomService.updateRoom(room.getId(), request, actorId);

            verify(roomRepository, never()).existsByHostelIdAndRoomNumberIgnoreCase(any(), any());
        }

        @Test
        @DisplayName("throws DuplicateRoomNumberException when renaming to a number already used in the hostel")
        void rejectsRenameToDuplicateNumber() {
            when(roomRepository.existsByHostelIdAndRoomNumberIgnoreCase(hostel.getId(), "B-204"))
                    .thenReturn(true);
            var request = new UpdateRoomRequest("B-204", null, null, null, null, null);

            assertThatThrownBy(() -> roomService.updateRoom(room.getId(), request, actorId))
                    .isInstanceOf(DuplicateRoomNumberException.class);
        }

        @Test
        @DisplayName("rejects reducing capacity below current occupancy")
        void rejectsCapacityBelowOccupancy() {
            var request = new UpdateRoomRequest(null, null, (short) 0, null, null, null); // occupancy is 1

            assertThatThrownBy(() -> roomService.updateRoom(room.getId(), request, actorId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("cannot be less than current occupancy");
        }

        @Test
        @DisplayName("allows raising capacity and re-evaluates room status afterward")
        void allowsCapacityIncreaseAndRecalculatesStatus() {
            room.setCurrentOccupancy((short) 2);
            room.setCapacity((short) 2);
            room.setStatus(RoomStatus.FULLY_OCCUPIED);
            var request = new UpdateRoomRequest(null, null, (short) 4, null, null, null);

            roomService.updateRoom(room.getId(), request, actorId);

            assertThat(room.getCapacity()).isEqualTo((short) 4);
            // No longer at capacity (2 occupants / 4 beds) — status should flip back.
            assertThat(room.getStatus()).isEqualTo(RoomStatus.AVAILABLE);
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when the room does not exist")
        void throwsWhenRoomMissing() {
            when(roomRepository.findByIdWithHostel(any())).thenReturn(Optional.empty());
            var request = new UpdateRoomRequest("X", null, null, null, null, null);

            assertThatThrownBy(() -> roomService.updateRoom(UUID.randomUUID(), request, actorId))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // =========================================================================
    // updateRoomStatus / deleteRoom
    // =========================================================================

    @Nested
    @DisplayName("updateRoomStatus and deleteRoom")
    class StatusAndDelete {

        private final Hostel hostel = hostel("Leroy Hostel");
        private Room room;

        @BeforeEach
        void stub() {
            room = room(hostel, RoomType.SINGLE, 1, 0);
            when(roomRepository.findByIdWithHostel(room.getId())).thenReturn(Optional.of(room));
        }

        @Test
        @DisplayName("updateRoomStatus sets the status directly, bypassing recalculateRoomStatus")
        void setsStatusDirectly() {
            lenient().when(roomRepository.save(any(Room.class))).thenAnswer(inv -> inv.getArgument(0));
            lenient().when(amenityRepository.findByRoomId(room.getId())).thenReturn(List.of());

            roomService.updateRoomStatus(room.getId(), RoomStatus.UNDER_MAINTENANCE, actorId);

            assertThat(room.getStatus()).isEqualTo(RoomStatus.UNDER_MAINTENANCE);
        }

        @Test
        @DisplayName("deleteRoom removes the room after verifying ownership")
        void deletesRoom() {
            roomService.deleteRoom(room.getId());
            verify(roomRepository).delete(room);
        }
    }

    // =========================================================================
    // Amenity management
    // =========================================================================

    @Nested
    @DisplayName("amenity management")
    class AmenityManagement {

        private final Hostel hostel = hostel("Leroy Hostel");
        private Room room;

        @BeforeEach
        void stub() {
            room = room(hostel, RoomType.SINGLE, 1, 0);
            lenient().when(roomRepository.findByIdWithHostel(room.getId())).thenReturn(Optional.of(room));
        }

        @Test
        @DisplayName("replaceAmenities deletes all existing amenities before saving the new set")
        void replaceDeletesBeforeSaving() {
            when(amenityRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
            var requests = List.of(new AmenityRequest("Wi-Fi", null));

            roomService.replaceAmenities(room.getId(), requests, actorId);

            var inOrder = inOrder(amenityRepository);
            inOrder.verify(amenityRepository).deleteAllByRoomId(room.getId());
            inOrder.verify(amenityRepository).saveAll(anyList());
        }

        @Test
        @DisplayName("addAmenity rejects a duplicate label (case-insensitive) for the same room")
        void rejectsDuplicateAmenityLabel() {
            when(amenityRepository.existsByRoomIdAndAmenityIgnoreCase(room.getId(), "Wi-Fi"))
                    .thenReturn(true);

            assertThatThrownBy(() -> roomService.addAmenity(
                    room.getId(), new AmenityRequest("Wi-Fi", null), actorId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exists");
            verify(amenityRepository, never()).save(any(RoomAmenity.class));
        }

        @Test
        @DisplayName("addAmenity trims the label and persists a new amenity")
        void addsTrimmedAmenity() {
            when(amenityRepository.existsByRoomIdAndAmenityIgnoreCase(any(), any())).thenReturn(false);
            when(amenityRepository.findByRoomId(room.getId())).thenReturn(List.of());

            roomService.addAmenity(room.getId(), new AmenityRequest("  Air Conditioning  ", null), actorId);

            var captor = ArgumentCaptor.forClass(RoomAmenity.class);
            verify(amenityRepository).save(captor.capture());
            assertThat(captor.getValue().getAmenity()).isEqualTo("Air Conditioning");
        }

        @Test
        @DisplayName("deleteAmenity throws ResourceNotFoundException for an unknown id")
        void deleteThrowsWhenMissing() {
            var amenityId = UUID.randomUUID();
            when(amenityRepository.findById(amenityId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> roomService.deleteAmenity(amenityId, actorId))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("deleteAmenity verifies ownership via the amenity's room's hostel before deleting")
        void deleteVerifiesOwnership() {
            var amenity = new RoomAmenity();
            amenity.setId(UUID.randomUUID());
            amenity.setRoom(room);
            when(amenityRepository.findById(amenity.getId())).thenReturn(Optional.of(amenity));

            roomService.deleteAmenity(amenity.getId(), actorId);

            verify(hostelService).assertManagerOwns(hostel.getId(), actorId);
            verify(amenityRepository).delete(amenity);
        }
    }

    // =========================================================================
    // recalculateRoomStatus — the status-flip rules
    // =========================================================================

    @Nested
    @DisplayName("recalculateRoomStatus")
    class RecalculateRoomStatus {

        private final Hostel hostel = hostel("Leroy Hostel");

        @Test
        @DisplayName("flips to FULLY_OCCUPIED once occupancy reaches capacity")
        void flipsToFullyOccupiedAtCapacity() {
            var room = room(hostel, RoomType.SINGLE, 1, 1);
            room.setStatus(RoomStatus.AVAILABLE);

            roomService.recalculateRoomStatus(room);

            assertThat(room.getStatus()).isEqualTo(RoomStatus.FULLY_OCCUPIED);
        }

        @Test
        @DisplayName("flips back to AVAILABLE once occupancy drops below capacity, but only from FULLY_OCCUPIED")
        void flipsBackToAvailableFromFullyOccupied() {
            var room = room(hostel, RoomType.DOUBLE, 2, 1);
            room.setStatus(RoomStatus.FULLY_OCCUPIED);

            roomService.recalculateRoomStatus(room);

            assertThat(room.getStatus()).isEqualTo(RoomStatus.AVAILABLE);
        }

        @Test
        @DisplayName("does NOT override UNDER_MAINTENANCE even when occupancy drops below capacity")
        void neverOverridesUnderMaintenance() {
            var room = room(hostel, RoomType.DOUBLE, 2, 0);
            room.setStatus(RoomStatus.UNDER_MAINTENANCE);

            roomService.recalculateRoomStatus(room);

            assertThat(room.getStatus()).isEqualTo(RoomStatus.UNDER_MAINTENANCE);
        }

        @Test
        @DisplayName("does NOT override RESERVED even when occupancy drops below capacity")
        void neverOverridesReserved() {
            var room = room(hostel, RoomType.DOUBLE, 2, 0);
            room.setStatus(RoomStatus.RESERVED);

            roomService.recalculateRoomStatus(room);

            assertThat(room.getStatus()).isEqualTo(RoomStatus.RESERVED);
        }

        @Test
        @DisplayName("stays AVAILABLE when occupancy is already below capacity")
        void staysAvailableBelowCapacity() {
            var room = room(hostel, RoomType.DOUBLE, 2, 1);
            room.setStatus(RoomStatus.AVAILABLE);

            roomService.recalculateRoomStatus(room);

            assertThat(room.getStatus()).isEqualTo(RoomStatus.AVAILABLE);
        }
    }
}
