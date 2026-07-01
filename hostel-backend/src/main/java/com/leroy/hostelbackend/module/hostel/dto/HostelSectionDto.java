package com.leroy.hostelbackend.module.hostel.dto;

import com.leroy.hostelbackend.module.room.dto.RoomDisplayDto;

import java.util.List;
import java.util.UUID;

public record HostelSectionDto(
        UUID id,
        String name,
        String address,
        String genderPolicy,
        String imageUrl,
        Boolean isActive,
        List<RoomDisplayDto> rooms
) {}