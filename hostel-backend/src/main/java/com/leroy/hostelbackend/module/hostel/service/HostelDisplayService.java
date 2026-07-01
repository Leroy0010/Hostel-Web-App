package com.leroy.hostelbackend.module.hostel.service;

import com.leroy.hostelbackend.module.booking.dto.AvailablePeriodDto;
import com.leroy.hostelbackend.module.hostel.dto.HostelDetailsResponseDto;
import com.leroy.hostelbackend.module.hostel.dto.HostelDto;
import com.leroy.hostelbackend.module.hostel.dto.HostelSectionDto;
import com.leroy.hostelbackend.module.hostel.projection.HostelDetailFlatProjection;
import com.leroy.hostelbackend.module.hostel.projection.HostelRoomFlatProjection;
import com.leroy.hostelbackend.module.hostel.repository.HostelRepository;
import com.leroy.hostelbackend.module.room.dto.RoomDisplayDto;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Year;
import java.util.*;

@Service
@RequiredArgsConstructor
public class HostelDisplayService {

    private final HostelRepository hostelRepository;

    @Transactional(readOnly = true)
    public Page<HostelSectionDto> getHostelHorizontalSections(
            String search,
            String genderPolicy,
            String roomType,
            BigDecimal maxPrice,
            Pageable pageable
    ) {
        int currentYear = Year.now().getValue();
        String yMinus1 = (currentYear - 1) + "/" + currentYear;
        String yCurrent = currentYear + "/" + (currentYear + 1);
        String yPlus1 = (currentYear + 1) + "/" + (currentYear + 2);

        // Safe extraction of the primary sort parameter from Pageable object
        String sortBy = "name";
        String sortOrder = "ASC";
        if (pageable.getSort().isSorted()) {
            var order = pageable.getSort().iterator().next();
            sortBy = order.getProperty().equalsIgnoreCase("address") ? "address" : "name";
            sortOrder = order.isAscending() ? "ASC" : "DESC";
        }

        String safeSearch = (search == null || search.isBlank()) ? null : search;
        String safeGender = (genderPolicy == null || genderPolicy.equalsIgnoreCase("ALL")) ? null : genderPolicy.toUpperCase();
        String safeRoomType = (roomType == null || roomType.isBlank()) ? null : roomType.toUpperCase();

        long totalCount = hostelRepository.countHostelsWithRoomPreviews(
                safeSearch, safeGender, safeRoomType, maxPrice, yMinus1, yCurrent, yPlus1
        );

        if (totalCount == 0) {
            return new PageImpl<>(Collections.emptyList(), pageable, 0);
        }

        List<HostelRoomFlatProjection> flatRows = hostelRepository.findHostelsWithRoomPreviews(
                safeSearch, safeGender, safeRoomType, maxPrice,
                yMinus1, yCurrent, yPlus1,
                sortBy, sortOrder,
                pageable.getPageSize(),
                (int) pageable.getOffset()
        );

        return new PageImpl<>(transformFlatRowsToDto(flatRows), pageable, totalCount);
    }

    @Transactional(readOnly = true)
    public HostelDetailsResponseDto getHostelDetailsPage(
            UUID hostelId,
            String roomType,
            BigDecimal maxPrice,
            Pageable pageable
    ) {
        hostelRepository.findById(hostelId).orElseThrow(() -> new ResourceNotFoundException("Hostel",  hostelId));
        int currentYear = Year.now().getValue();
        String yMinus1 = (currentYear - 1) + "/" + currentYear;
        String yCurrent = currentYear + "/" + (currentYear + 1);
        String yPlus1 = (currentYear + 1) + "/" + (currentYear + 2);

        // Safe conversion of incoming room pageable properties
        String sortBy = "pricePerSemester";
        String sortOrder = "ASC";
        if (pageable.getSort().isSorted()) {
            var order = pageable.getSort().iterator().next();
            sortBy = order.getProperty().equalsIgnoreCase("roomNumber") ? "roomNumber" : "pricePerSemester";
            sortOrder = order.isAscending() ? "ASC" : "DESC";
        }

        String safeRoomType = (roomType == null || roomType.isBlank()) ? null : roomType.toUpperCase();

        // 1. Fetch total room count matching criteria for pagination metadata
        long totalRooms = hostelRepository.countHostelRoomsWithFilters(
                hostelId, safeRoomType, maxPrice, yMinus1, yCurrent, yPlus1
        );

        // 2. Fetch the collective flat layout rows
        List<HostelDetailFlatProjection> rows = hostelRepository.findHostelDetailsWithRooms(
                hostelId, safeRoomType, maxPrice, yMinus1, yCurrent, yPlus1,
                sortBy, sortOrder, pageable.getPageSize(), (int) pageable.getOffset()
        );

        if (rows.isEmpty()) {
            return null;
        }

        // 3. Extract single HostelDto details from the first record row
        HostelDetailFlatProjection core = rows.getFirst();
        HostelDto.ManagerSummary managerSummary = null;
        if (core.getManagerId() != null) {
            managerSummary = new HostelDto.ManagerSummary(
                    core.getManagerId(), core.getManagerFirstName(), core.getManagerLastName(),
                    core.getManagerEmail(), core.getManagerPhone()
            );
        }

        HostelDto hostelDto = new HostelDto(
                core.getHostelId(), core.getHostelName(), core.getHostelAddress(),
                core.getHostelDescription(), core.getHostelGenderPolicy(), core.getHostelImageUrl(),
                core.getHostelIsActive(), core.getHostelLatitude(), core.getHostelLongitude(),
                managerSummary, core.getHostelCreatedAt(), core.getHostelUpdatedAt()
        );

        // 4. Transform nested row iterations into structured Room Display objects
        Map<UUID, RoomDisplayDto> roomMap = new LinkedHashMap<>();
        Map<UUID, List<AvailablePeriodDto>> periodStorage = new HashMap<>();

        for (HostelDetailFlatProjection row : rows) {
            UUID roomId = row.getRoomId();
            if (roomId == null) continue; // No rooms matched the filters

            roomMap.computeIfAbsent(roomId, k -> new RoomDisplayDto(
                    roomId, row.getRoomNumber(), row.getRoomType(),
                    row.getCapacity(), row.getPricePerSemester(),
                    row.getFloorNumber(), row.getRoomImageUrl(), new ArrayList<>()
            ));

            if (row.getAcademicYear() != null && row.getSemester() != null) {
                periodStorage.computeIfAbsent(roomId, k -> new ArrayList<>())
                        .add(new AvailablePeriodDto(row.getAcademicYear(), row.getSemester()));
            }
        }

        // Stitch the computed periods back to their respective parent rooms
        List<RoomDisplayDto> structuredRooms = new ArrayList<>();
        roomMap.forEach((roomId, roomDto) -> {
            var periods = periodStorage.getOrDefault(roomId, Collections.emptyList());
            roomDto.availablePeriods().addAll(periods);
            structuredRooms.add(roomDto);
        });

        Page<RoomDisplayDto> roomPage = new PageImpl<>(structuredRooms, pageable, totalRooms);

        return new HostelDetailsResponseDto(hostelDto, roomPage);
    }

    private List<HostelSectionDto> transformFlatRowsToDto(List<HostelRoomFlatProjection> rows) {
        Map<UUID, HostelSectionDto> hostelMap = new LinkedHashMap<>();
        Map<UUID, Map<UUID, RoomDisplayDto>> roomStorage = new HashMap<>();
        Map<UUID, List<AvailablePeriodDto>> periodStorage = new HashMap<>();

        for (HostelRoomFlatProjection row : rows) {
            UUID hostelId = row.getHostelId();
            if (hostelId == null) continue;

            hostelMap.computeIfAbsent(hostelId, k -> new HostelSectionDto(
                    hostelId, row.getHostelName(), row.getHostelAddress(),
                    row.getHostelGenderPolicy(), row.getHostelImageUrl(),
                    row.getHostelIsActive(), new ArrayList<>()
            ));

            UUID roomId = row.getRoomId();
            if (roomId != null) {
                var roomsInHostel = roomStorage.computeIfAbsent(hostelId, k -> new LinkedHashMap<>());

                roomsInHostel.computeIfAbsent(roomId, k -> new RoomDisplayDto(
                        roomId, row.getRoomNumber(), row.getRoomType(),
                        row.getCapacity(), row.getPricePerSemester(),
                        row.getFloorNumber(), row.getRoomImageUrl(), new ArrayList<>()
                ));

                if (row.getAcademicYear() != null && row.getSemester() != null) {
                    periodStorage.computeIfAbsent(roomId, k -> new ArrayList<>())
                            .add(new AvailablePeriodDto(row.getAcademicYear(), row.getSemester()));
                }
            }
        }

        hostelMap.forEach((hostelId, hostelDto) -> {
            var roomsMap = roomStorage.getOrDefault(hostelId, Collections.emptyMap());
            roomsMap.forEach((roomId, roomDto) -> {
                var periods = periodStorage.getOrDefault(roomId, Collections.emptyList());
                roomDto.availablePeriods().addAll(periods);
                hostelDto.rooms().add(roomDto);
            });
        });

        return new ArrayList<>(hostelMap.values());
    }
}