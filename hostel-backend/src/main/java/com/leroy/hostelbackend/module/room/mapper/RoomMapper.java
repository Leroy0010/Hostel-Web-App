package com.leroy.hostelbackend.module.room.mapper;

import com.leroy.hostelbackend.module.room.dto.*;
import com.leroy.hostelbackend.module.room.model.Room;
import com.leroy.hostelbackend.module.room.model.RoomAmenity;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct mapper for {@link Room} ↔ DTO conversions.
 *
 * <p>{@code bedsAvailable} is a computed field not present on the entity — it is
 * set via {@link AfterMapping} so MapStruct handles everything else automatically.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RoomMapper {

    /**
     * Maps a {@link Room} to a full {@link RoomDto}.
     * {@code amenities} must be passed separately by the service since they are
     * a separate entity collection (not a direct field on {@link Room}).
     *
     * @param room      the room entity
     * @param amenities the room's amenity list, pre-loaded by the service
     */
    @Mapping(target = "hostelId",   source = "room.hostel.id")
    @Mapping(target = "hostelName", source = "room.hostel.name")
    @Mapping(target = "amenities",  source = "amenities")
    @Mapping(target = "bedsAvailable", ignore = true)   // computed in @AfterMapping
    RoomDto toDto(Room room, List<AmenityDto> amenities);

    /** Lightweight summary — no amenities, no hostel name. */
    @Mapping(target = "bedsAvailable", ignore = true)
    RoomSummaryDto toSummaryDto(Room room);

    /** Maps a single {@link RoomAmenity} to an {@link AmenityDto}. */
    AmenityDto toAmenityDto(RoomAmenity amenity);

    /** Maps a list of {@link RoomAmenity} entities. */
    List<AmenityDto> toAmenityDtos(List<RoomAmenity> amenities);

    // -------------------------------------------------------------------------
    // Post-processing: compute bedsAvailable
    // -------------------------------------------------------------------------



    /**
     * Helper called by the service to produce the final DTO with {@code bedsAvailable}.
     * Records are immutable, so we rebuild with the computed value.
     */
    default RoomDto toDtoWithComputed(Room room, List<AmenityDto> amenities) {
        var dto = toDto(room, amenities);
        short beds = (short) (room.getCapacity() - room.getCurrentOccupancy());
        return new RoomDto(
                dto.id(), dto.hostelId(), dto.hostelName(), dto.roomNumber(),
                dto.roomType(), dto.capacity(), dto.currentOccupancy(), beds,
                dto.pricePerSemester(), dto.status(), dto.floorNumber(), dto.imageUrl(),
                dto.amenities(), dto.createdAt(), dto.updatedAt()
        );
    }

    default RoomSummaryDto toSummaryDtoWithComputed(Room room) {
        var dto = toSummaryDto(room);
        short beds = (short) (room.getCapacity() - room.getCurrentOccupancy());
        return new RoomSummaryDto(
                dto.id(), dto.roomNumber(), dto.roomType(), dto.capacity(),
                dto.currentOccupancy(), beds, dto.pricePerSemester(),
                dto.status(), dto.floorNumber(), dto.imageUrl()
        );
    }
}