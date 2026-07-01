package com.leroy.hostelbackend.module.waitlist.mapper;

import com.leroy.hostelbackend.module.waitlist.dto.WaitlistDto;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistEntryDto;
import com.leroy.hostelbackend.module.waitlist.model.Waitlist;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct mapper for {@link Waitlist} ↔ DTO conversions.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface WaitlistMapper {

    @Mapping(target = "hostelId",       source = "hostel.id")
    @Mapping(target = "hostelName",     source = "hostel.name")
    @Mapping(target = "hostelImageUrl", source = "hostel.imageUrl")
    @Mapping(target = "roomType",       expression = "java(waitlist.getRoomType().name())")
    WaitlistDto toDto(Waitlist waitlist);

    @Mapping(target = "studentId",        source = "student.id")
    @Mapping(target = "studentFirstName", source = "student.firstName")
    @Mapping(target = "studentLastName",  source = "student.lastName")
    @Mapping(target = "studentEmail",     source = "student.email")
    @Mapping(target = "roomType",         expression = "java(waitlist.getRoomType().name())")
    WaitlistEntryDto toEntryDto(Waitlist waitlist);
}