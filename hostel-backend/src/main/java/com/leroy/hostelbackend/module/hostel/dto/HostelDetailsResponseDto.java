package com.leroy.hostelbackend.module.hostel.dto;

import com.leroy.hostelbackend.module.room.dto.RoomDisplayDto;
import org.springframework.data.domain.Page;

public record HostelDetailsResponseDto(
        HostelDto hostel,
        Page<RoomDisplayDto> rooms,
        HostelRatingDto rating
) {}