package com.leroy.hostelbackend.module.preference.mapper;

import com.leroy.hostelbackend.module.preference.dto.PreferenceDto;
import com.leroy.hostelbackend.module.preference.model.StudentPreference;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct mapper for {@link StudentPreference} → {@link PreferenceDto}.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PreferenceMapper {

    @Mapping(target = "studentId", source = "student.id")
    PreferenceDto toDto(StudentPreference preference);
}