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
 * <p><strong>Why {@code occupants} carries light profiles, not contact
 * details:</strong> exposing a phone number or email address in a search
 * result that any authenticated student can request would let anyone with a
 * student account scrape the system and harvest contact details, at scale,
 * for spam or harassment — a real risk, not a hypothetical one, since nothing
 * about requesting this endpoint requires any relationship with the people
 * whose data would be returned. A first name and avatar let a prospective
 * roommate feel like a real person worth reaching out to, without creating
 * that scrapeable surface; actual contact happens after the two students have
 * a genuine reason to be in the same room (i.e. after booking), through
 * channels the system already supports (in-app notifications, or simply
 * exchanging details once actually resident together).
 *
 * @param roomId           the room UUID
 * @param roomNumber       display room number
 * @param roomType         SINGLE | DOUBLE | TRIPLE | QUAD | DORMITORY
 * @param bedsAvailable    remaining free beds
 * @param price room price
 * @param imageUrl         room cover image
 * @param matchingTags     tags shared between the student and at least one occupant
 * @param occupantCount    how many students currently live in this room
 * @param occupants        light, privacy-safe profiles of current occupants (see class Javadoc)
 */
public record RoomMatchSuggestionDto(
        UUID   roomId,
        String roomNumber,
        RoomType roomType,
        short  bedsAvailable,
        BigDecimal price,
        String imageUrl,
        List<PreferenceTag> matchingTags,
        int occupantCount,
        List<OccupantProfileDto> occupants
) {}