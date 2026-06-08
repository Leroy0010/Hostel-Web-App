package com.leroy.hostelbackend.module.booking.mapper;

import com.leroy.hostelbackend.module.booking.dto.BookingDto;
import com.leroy.hostelbackend.module.booking.dto.BookingSummaryDto;
import com.leroy.hostelbackend.module.booking.model.Booking;
import com.leroy.hostelbackend.module.user.model.User;
import org.mapstruct.*;

/**
 * MapStruct mapper for {@link Booking} ↔ DTO conversions.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BookingMapper {

    @Mapping(target = "student",    source = "student")
    @Mapping(target = "room",       source = "room")
    @Mapping(target = "approvedBy", source = "approvedBy")
    @Mapping(target = "status",     expression = "java(booking.getStatus().name())")
    BookingDto toDto(Booking booking);

    @Mapping(target = "id",        source = "id")
    @Mapping(target = "firstName", source = "firstName")
    @Mapping(target = "lastName",  source = "lastName")
    @Mapping(target = "email",     source = "email")
    BookingDto.StudentSummary toStudentSummary(User student);

    @Mapping(target = "id",         source = "booking.room.id")
    @Mapping(target = "roomNumber", source = "booking.room.roomNumber")
    @Mapping(target = "roomType",   expression = "java(booking.getRoom().getRoomType().name())")
    @Mapping(target = "hostelId",   source = "booking.room.hostel.id")
    @Mapping(target = "hostelName", source = "booking.room.hostel.name")
    BookingDto.RoomSummary toRoomSummary(Booking booking);

    @Mapping(target = "id",        source = "id")
    @Mapping(target = "firstName", source = "firstName")
    @Mapping(target = "lastName",  source = "lastName")
    BookingDto.ApprovedBySummary toApprovedBySummary(User approvedBy);

    @Mapping(target = "studentId",   source = "student.id")
    @Mapping(target = "studentName", expression = "java(booking.getStudent().getFirstName() + ' ' + booking.getStudent().getLastName())")
    @Mapping(target = "roomId",      source = "room.id")
    @Mapping(target = "roomNumber",  source = "room.roomNumber")
    @Mapping(target = "hostelName",  source = "room.hostel.name")
    @Mapping(target = "status",      expression = "java(booking.getStatus().name())")
    BookingSummaryDto toSummaryDto(Booking booking);
}