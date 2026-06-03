package com.leroy.hostelbackend.module.waitlist.mapper;

import com.leroy.hostelbackend.module.waitlist.dto.WaitlistDto;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistEntryDto;
import com.leroy.hostelbackend.module.waitlist.model.Waitlist;
import org.mapstruct.*;

/**
 * MapStruct mapper for {@link Waitlist} ↔ DTO conversions.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface WaitlistMapper {

    /**
     * Maps to the student-facing view — shows the hostel they are waiting for.
     */
    @Mapping(target = "hostelId",       source = "hostel.id")
    @Mapping(target = "hostelName",     source = "hostel.name")
    @Mapping(target = "hostelImageUrl", source = "hostel.imageUrl")
    WaitlistDto toDto(Waitlist waitlist);

    /**
     * Maps to the manager-facing view — shows who is waiting.
     */
    @Mapping(target = "studentId",        source = "student.id")
    @Mapping(target = "studentFirstName", source = "student.firstName")
    @Mapping(target = "studentLastName",  source = "student.lastName")
    @Mapping(target = "studentEmail",     source = "student.email")
    WaitlistEntryDto toEntryDto(Waitlist waitlist);
}