package com.leroy.hostelbackend.module.user.mapper;

import com.leroy.hostelbackend.module.booking.model.Booking;
import com.leroy.hostelbackend.module.user.dto.HostelDto;
import com.leroy.hostelbackend.module.user.dto.UserDto;
import com.leroy.hostelbackend.module.user.dto.UserResponse;
import com.leroy.hostelbackend.module.user.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {
    @Mapping(target = "name", expression = "java(user.getName())")
    UserDto toDto(User user);

    @Mapping(target = "hostel", source = "booking")
    UserResponse toResponse(User user, Booking booking);

    @Mapping(target = "roomNumber", source = "room.roomNumber")
    @Mapping(target = "name", source = "room.hostel.name")
    @Mapping(target = "address", source = "room.hostel.address")
    HostelDto toUserHostelDto(Booking booking);
}

