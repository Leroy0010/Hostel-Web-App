package com.leroy.hostelbackend.module.map.mapper;

import com.leroy.hostelbackend.module.map.dto.LandmarkDto;
import com.leroy.hostelbackend.module.map.model.Landmark;
import org.mapstruct.*;

/**
 * MapStruct mapper for {@link Landmark} → {@link LandmarkDto}.
 *
 * <p>Latitude and longitude are extracted from the JTS {@code Point} in
 * {@link LandmarkService} before calling the mapper, then injected by rebuilding
 * the record — the same pattern used in {@code HostelService}.
 * The mapper handles all other fields automatically.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LandmarkMapper {

    /**
     * Maps entity to DTO. {@code latitude} and {@code longitude} are ignored here
     * because they are extracted from the JTS Point by the service and used to
     * construct the final DTO record directly.
     */
    @Mapping(target = "category",  expression = "java(landmark.getCategory().name())")
    @Mapping(target = "latitude",  ignore = true)
    @Mapping(target = "longitude", ignore = true)
    LandmarkDto toDto(Landmark landmark);
}