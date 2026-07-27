package com.leroy.hostelbackend.module.preference.dto;

import java.util.UUID;

/**
 * A "light" occupant profile shown alongside a room-match suggestion, so a
 * prospective roommate isn't a completely anonymous entry in a room.
 *
 * <p>Deliberately minimal and privacy-preserving: only fields that already
 * exist on {@code User} and that the student would reasonably want a
 * prospective roommate to see are included. In particular this does
 * <strong>not</strong> include email, phone number, or any other contact
 * detail — direct contact details are never exposed in search/match results
 * (see the class Javadoc on {@code RoomMatchSuggestionDto} for the reasoning).
 * Two fields sometimes discussed for this feature — course of study and
 * gender — are intentionally omitted because neither is currently captured
 * anywhere in the system (there is no such column on {@code User}), not
 * because of a privacy decision; adding them would require a schema change
 * and a registration-flow update, and is tracked as a recommendation rather
 * than implemented under this feature.
 */
public record OccupantProfileDto(
        UUID id,
        String firstName,
        String avatarUrl
) {}
