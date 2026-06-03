package com.leroy.hostelbackend.module.booking.mapper;

import org.mapstruct.Mapper;

import com.leroy.hostelbackend.module.booking.dto.*;
import com.leroy.hostelbackend.module.booking.model.Booking;
import com.leroy.hostelbackend.module.user.model.User;
import org.mapstruct.*;

/**
 * MapStruct mapper for {@link Booking} ↔ DTO conversions.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BookingMapper {

    /** Full booking detail — all nested objects mapped. */
    @Mapping(target = "student",    source = "student")
    @Mapping(target = "room",       source = "booking")
    @Mapping(target = "approvedBy", source = "approvedBy")
    BookingDto toDto(Booking booking);

    @Mapping(target = "id",        source = "id")
    @Mapping(target = "firstName", source = "firstName")
    @Mapping(target = "lastName",  source = "lastName")
    @Mapping(target = "email",     source = "email")
    BookingDto.StudentSummary toStudentSummary(User student);

    @Mapping(target = "id",         source = "room.id")
    @Mapping(target = "roomNumber", source = "room.roomNumber")
    @Mapping(target = "roomType",   source = "room.roomType")
    @Mapping(target = "hostelId",   source = "room.hostel.id")
    @Mapping(target = "hostelName", source = "room.hostel.name")
    BookingDto.RoomSummary toRoomSummary(Booking booking);

    @Mapping(target = "id",        source = "id")
    @Mapping(target = "firstName", source = "firstName")
    @Mapping(target = "lastName",  source = "lastName")
    BookingDto.ApprovedBySummary toApprovedBySummary(User approvedBy);

    /** Lightweight summary for paginated lists. */
    @Mapping(target = "studentId",   source = "student.id")
    @Mapping(target = "studentName", expression = "java(booking.getStudent().getFirstName() + ' ' + booking.getStudent().getLastName())")
    @Mapping(target = "roomId",      source = "room.id")
    @Mapping(target = "roomNumber",  source = "room.roomNumber")
    @Mapping(target = "hostelName",  source = "room.hostel.name")
    BookingSummaryDto toSummaryDto(Booking booking);
}
