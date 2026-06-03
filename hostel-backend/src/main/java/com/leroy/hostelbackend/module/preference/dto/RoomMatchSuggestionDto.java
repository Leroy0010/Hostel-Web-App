package com.leroy.hostelbackend.module.preference.dto;

import com.leroy.hostelbackend.module.preference.model.PreferenceTag;
import com.leroy.hostelbackend.module.room.model.RoomType;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * A suggested room for roommate matching.
 *
 * <p>Returned when a student requests suggestions for a hostel. Each entry
 * represents a room that has at least one current occupant whose tags overlap
 * with the requesting student's tags, and still has free beds.
 *
 * @param roomId           the room UUID
 * @param roomNumber       display room number
 * @param roomType         SINGLE | DOUBLE | TRIPLE | QUAD | DORMITORY
 * @param bedsAvailable    remaining free beds
 * @param pricePerSemester room price
 * @param imageUrl         room cover image
 * @param matchingTags     tags shared between the student and at least one occupant
 * @param occupantCount    how many students currently live in this room
 */
public record RoomMatchSuggestionDto(
        UUID   roomId,
        String roomNumber,
        RoomType roomType,
        short  bedsAvailable,
        BigDecimal pricePerSemester,
        String imageUrl,
        List<PreferenceTag> matchingTags,
        int occupantCount
) {}
