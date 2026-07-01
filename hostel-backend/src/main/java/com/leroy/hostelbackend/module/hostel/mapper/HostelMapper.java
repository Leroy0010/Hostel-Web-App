package com.leroy.hostelbackend.module.hostel.mapper;

import com.leroy.hostelbackend.module.hostel.dto.HostelDto;
import com.leroy.hostelbackend.module.hostel.dto.HostelDto.ManagerSummary;
import com.leroy.hostelbackend.module.hostel.dto.HostelSummaryDto;
import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.user.model.User;
import org.mapstruct.*;

/**
 * MapStruct mapper for {@link Hostel} ↔ DTO conversions.
 *
 * <p>{@code componentModel = "spring"} makes the generated impl a Spring bean.
 * {@code unmappedTargetPolicy = IGNORE} silences warnings for fields like
 * {@code location} (a PostGIS object) that require manual handling.
 *
 * <p>Latitude and longitude are extracted from the PostGIS {@code location} field
 * by the service layer before calling the mapper, and passed in via
 * {@code @AfterMapping} or explicit setters in {@link com.leroy.hostelbackend.module.hostel.service.HostelService}.
 * The mapper records them directly since the service populates them.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface HostelMapper {

    /**
     * Maps a {@link Hostel} entity to a full {@link HostelDto}.
     * {@code latitude} and {@code longitude} are NOT auto-mapped — the service
     * sets them manually after calling this method.
     */
    @Mapping(target = "latitude",  ignore = true)
    @Mapping(target = "longitude", ignore = true)
    HostelDto toDto(Hostel hostel);

    /** Maps the manager {@link User} to the embedded {@link ManagerSummary}. */
    ManagerSummary toManagerSummary(User manager);

    /** Lightweight summary used in paginated lists. */
    @Mapping(target = "longitude", expression = "java(hostel.getLongitude())")
    @Mapping(target = "latitude", expression = "java(hostel.getLatitude())")
    HostelSummaryDto toSummaryDto(Hostel hostel);
}