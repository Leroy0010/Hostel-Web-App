package com.leroy.hostelbackend.module.room.dto;

import com.leroy.hostelbackend.module.booking.dto.AvailablePeriodDto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record RoomDisplayDto(
        UUID id,
        String roomNumber,
        String roomType,
        Short capacity,
        BigDecimal price,
        Short floorNumber,
        String imageUrl,
        List<AvailablePeriodDto> availablePeriods
) {}