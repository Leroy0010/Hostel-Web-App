package com.leroy.hostelbackend.module.room.service;

import com.leroy.hostelbackend.module.booking.dto.AvailablePeriodDto;
import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.hostel.dto.HostelSummaryDto;
import com.leroy.hostelbackend.module.hostel.repository.HostelRepository;
import com.leroy.hostelbackend.module.hostel.service.HostelService;
import com.leroy.hostelbackend.module.room.dto.*;
import com.leroy.hostelbackend.module.room.mapper.RoomMapper;
import com.leroy.hostelbackend.module.room.model.Room;
import com.leroy.hostelbackend.module.room.model.RoomAmenity;
import com.leroy.hostelbackend.module.room.model.RoomStatus;
import com.leroy.hostelbackend.module.room.model.RoomType;
import com.leroy.hostelbackend.module.room.repository.RoomAmenityRepository;
import com.leroy.hostelbackend.module.room.repository.RoomRepository;
import com.leroy.hostelbackend.module.room.specification.RoomSpecifications;
import com.leroy.hostelbackend.shared.exception.DuplicateRoomNumberException;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Year;
import java.util.List;
import java.util.UUID;

/**
 * Application service for room management.
 *
 * <p><strong>Access rules:</strong>
 * <ul>
 *   <li>ADMIN  — full CRUD on any room in any hostel.</li>
 *   <li>MANAGER — CRUD on rooms within their own assigned hostels only.
 *       Ownership is verified by {@link HostelService#assertManagerOwns}.</li>
 *   <li>STUDENT — read-only availability queries.</li>
 * </ul>
 *
 * <p><strong>N+1 prevention:</strong> All list queries use {@code JOIN FETCH} via
 * the repository. Amenities are loaded in a single separate batch query per room
 * detail call — never inside a loop.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RoomService {

    private final RoomRepository       roomRepository;
    private final RoomAmenityRepository amenityRepository;
    private final HostelRepository     hostelRepository;
    private final HostelService        hostelService;
    private final RoomMapper           roomMapper;
    private final BookingRepository bookingRepository;

    // -------------------------------------------------------------------------
    // Student / Public reads
    // -------------------------------------------------------------------------

    /**
     * Paginated list of available rooms in a hostel with optional filters.
     *
     * @param hostelId hostel to browse
     * @param roomType optional filter — pass null to skip
     * @param maxPrice optional upper price limit — pass null to skip
     * @param pageable page/sort params
     */
    @Transactional(readOnly = true)
    public Page<RoomSummaryDto> listAvailableRooms(
            UUID hostelId,
            RoomType roomType,
            BigDecimal maxPrice,
            Pageable pageable
    ) {

        var spec = RoomSpecifications.filterRooms(
                hostelId,
                roomType,
                maxPrice
        );

        return roomRepository.findAll(spec, pageable)
                .map(roomMapper::toSummaryDtoWithComputed);
    }

    /**
     * Full room detail including amenities. Any authenticated user.
     */
    @Transactional(readOnly = true)
    public RoomDto getRoomById(UUID roomId) {
        var room      = requireRoom(roomId);
        var amenities = amenityRepository.findByRoomId(roomId);
        return roomMapper.toDtoWithComputed(room, roomMapper.toAmenityDtos(amenities));
    }

    @Transactional(readOnly = true)
    public List<RoomSummaryDto> getStudentActiveRooms(UUID userId, UUID hostelId){
        return bookingRepository
                .findStudentActiveRooms(userId, hostelId)
                .stream()
                .map(roomMapper::toSummaryDto)
                .toList();
    }

    // -------------------------------------------------------------------------
    // Manager / Admin reads
    // -------------------------------------------------------------------------

    /**
     * All rooms in a hostel — for the manager dashboard (includes occupied/maintenance).
     */
    @Transactional(readOnly = true)
    public Page<RoomSummaryDto> listRoomsByHostel(UUID hostelId, Pageable pageable) {
        requireHostelExists(hostelId);
        return roomRepository.findByHostelId(hostelId, pageable)
                .map(roomMapper::toSummaryDtoWithComputed);
    }

    // -------------------------------------------------------------------------
    // Manager / Admin writes
    // -------------------------------------------------------------------------

    /**
     * Creates a room inside a hostel.
     * ADMIN can create in any hostel. MANAGER is validated against their assignment.
     *
     * @param hostelId  the target hostel
     * @param request   validated creation payload
     * @param actorId   the creating user's UUID (from security context)
     */
    @Transactional
    public RoomDto createRoom(UUID hostelId, CreateRoomRequest request, UUID actorId) {
        hostelService.assertManagerOwns(hostelId, actorId);

        var hostel = hostelRepository.findById(hostelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hostel not found: " + hostelId));

        // Duplicate room number check within the hostel
        if (roomRepository.existsByHostelIdAndRoomNumberIgnoreCase(hostelId, request.roomNumber())) {
            throw new DuplicateRoomNumberException("Duplicate room number: Room number: " + request.roomNumber() + " Hostel name: " + hostel.getName());
        }

        var room = Room.createRoom(request, hostel);

        var savedRoom = roomRepository.save(room);
        log.info("Room created: id={}, number={}, hostel={}", savedRoom.getId(), savedRoom.getRoomNumber(), hostelId);

        // Persist amenities if provided
        List<RoomAmenity> savedAmenities = List.of();
        if (request.amenities() != null && !request.amenities().isEmpty()) {
            savedAmenities = saveAmenities(savedRoom, request.amenities());
        }

        return roomMapper.toDtoWithComputed(savedRoom, roomMapper.toAmenityDtos(savedAmenities));
    }

    /**
     * Updates room details. ADMIN can update any room; MANAGER only their hostel's rooms.
     * Patch semantics — null fields are ignored.
     */
    @Transactional
    public RoomDto updateRoom(UUID roomId, UpdateRoomRequest request, UUID actorId) {
        var room = requireRoom(roomId);

        hostelService.assertManagerOwns(room.getHostel().getId(), actorId);

        if (request.roomNumber() != null) {
            // Check for duplicate only if number is actually changing
            if (!request.roomNumber().equalsIgnoreCase(room.getRoomNumber()) &&
                    roomRepository.existsByHostelIdAndRoomNumberIgnoreCase(room.getHostel().getId(), request.roomNumber())) {
                throw new DuplicateRoomNumberException("Duplicate room number: Room number: " + request.roomNumber() + " Hostel name: " + room.getHostel().getName());
            }
            room.setRoomNumber(request.roomNumber().trim());
        }
        if (request.roomType()         != null) room.setRoomType(request.roomType());
        if (request.pricePerSemester() != null) room.setPricePerSemester(request.pricePerSemester());
        if (request.imageUrl()         != null) room.setImageUrl(request.imageUrl());
        if (request.floorNumber()      != null) room.setFloorNumber(request.floorNumber().shortValue());

        // Capacity can only increase — never below current occupancy
        if (request.capacity() != null) {
            if (request.capacity() < room.getCurrentOccupancy()) {
                throw new IllegalArgumentException(
                        "New capacity (" + request.capacity() + ") cannot be less than current occupancy (" + room.getCurrentOccupancy() + ").");
            }
            room.setCapacity(request.capacity());
            // Re-evaluate status after capacity change
            recalculateRoomStatus(room);
        }

        var saved     = roomRepository.save(room);
        var amenities = amenityRepository.findByRoomId(roomId);
        return roomMapper.toDtoWithComputed(saved, roomMapper.toAmenityDtos(amenities));
    }

    /**
     * Changes the room's operational status (e.g. to UNDER_MAINTENANCE or RESERVED).
     * ADMIN or the assigned MANAGER only.
     *
     * @throws IllegalArgumentException if the status string is not a valid {@link RoomStatus}
     */
    @Transactional
    public RoomDto updateRoomStatus(UUID roomId, RoomStatus statusValue, UUID actorId) {
        var room = requireRoom(roomId);
        hostelService.assertManagerOwns(room.getHostel().getId(), actorId);


        room.setStatus(statusValue);
        var saved     = roomRepository.save(room);
        var amenities = amenityRepository.findByRoomId(roomId);
        return roomMapper.toDtoWithComputed(saved, roomMapper.toAmenityDtos(amenities));
    }

    /**
     * Deletes a room entirely. ADMIN only (managers cannot delete rooms — they deactivate them).
     *
     * @throws IllegalStateException if the room has active bookings (enforced at DB level)
     */
    @Transactional
    public void deleteRoom(UUID roomId) {
        var room = requireRoom(roomId);
        roomRepository.delete(room);
        log.info("Room deleted: id={}", roomId);
    }

    // -------------------------------------------------------------------------
    // Amenity management
    // -------------------------------------------------------------------------

    /**
     * Replaces ALL amenities for a room with the new list.
     * This is a full replace — pass the complete desired set each time.
     */
    @Transactional
    public RoomDto replaceAmenities(UUID roomId, List<AmenityRequest> requests, UUID actorId) {
        var room = requireRoom(roomId);

        hostelService.assertManagerOwns(room.getHostel().getId(), actorId);

        amenityRepository.deleteAllByRoomId(roomId);
        var saved = saveAmenities(room, requests);
        return roomMapper.toDtoWithComputed(room, roomMapper.toAmenityDtos(saved));
    }

    /**
     * Adds a single amenity to a room without replacing existing ones.
     */
    @Transactional
    public RoomDto addAmenity(UUID roomId, AmenityRequest request, UUID actorId) {
        var room = requireRoom(roomId);

        hostelService.assertManagerOwns(room.getHostel().getId(), actorId);


        if (amenityRepository.existsByRoomIdAndAmenityIgnoreCase(roomId, request.amenity())) {
            throw new IllegalArgumentException("Amenity '" + request.amenity() + "' already exists for this room.");
        }

        var amenity = buildAmenity(room, request);
        amenityRepository.save(amenity);

        var all = amenityRepository.findByRoomId(roomId);
        return roomMapper.toDtoWithComputed(room, roomMapper.toAmenityDtos(all));
    }

    /** Removes a single amenity by its UUID. */
    @Transactional
    public void deleteAmenity(UUID amenityId, UUID actorId) {
        var amenity = amenityRepository.findById(amenityId)
                .orElseThrow(() -> new ResourceNotFoundException("Amenity not found: " + amenityId));

        hostelService.assertManagerOwns(amenity.getRoom().getHostel().getId(), actorId);

        amenityRepository.delete(amenity);
    }

    @Transactional(readOnly = true)
    public List<AvailablePeriodDto> getBookingPeriods(UUID roomId) {

        int currentYear = Year.now().getValue();
        String yearMinus1 = (currentYear - 1) + "/" + currentYear;
        String yearCurrent = currentYear + "/" + (currentYear + 1);
        String yearPlus1 = (currentYear + 1) + "/" + (currentYear + 2);

        return hostelRepository.findBookingPeriods(roomId, yearMinus1, yearCurrent, yearPlus1).stream().map(proj -> new AvailablePeriodDto(proj.getAcademicYear(), proj.getSemester())).toList();
    }

    // -------------------------------------------------------------------------
    // Package-visible helpers (used by BookingService)
    // -------------------------------------------------------------------------

    /**
     * Re-evaluates and persists {@code room.status} based on current occupancy vs capacity.
     * Called by {@link com.leroy.hostelbackend.module.booking.service.BookingService}
     * after each occupancy change.
     */
    public void recalculateRoomStatus(Room room) {
        if (room.getCurrentOccupancy() >= room.getCapacity()) {
            room.setStatus(RoomStatus.FULLY_OCCUPIED);
        } else if (RoomStatus.FULLY_OCCUPIED.equals(room.getStatus())) {
            // Only flip back to AVAILABLE if it was previously FULLY_OCCUPIED
            // (don't override UNDER_MAINTENANCE or RESERVED)
            room.setStatus(RoomStatus.AVAILABLE);
        }
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private Room requireRoom(UUID id) {
        return roomRepository.findByIdWithHostel(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + id));
    }

    private void requireHostelExists(UUID hostelId) {
        if (!hostelRepository.existsById(hostelId)) {
            throw new ResourceNotFoundException("Hostel not found: " + hostelId);
        }
    }

    private List<RoomAmenity> saveAmenities(Room room, List<AmenityRequest> requests) {
        var entities = requests.stream()
                .map(r -> buildAmenity(room, r))
                .toList();
        return amenityRepository.saveAll(entities);
    }

    private RoomAmenity buildAmenity(Room room, AmenityRequest request) {
        var a = new RoomAmenity();
        a.setRoom(room);
        a.setAmenity(request.amenity().trim());
        a.setImageUrl(request.imageUrl());
        return a;
    }
}