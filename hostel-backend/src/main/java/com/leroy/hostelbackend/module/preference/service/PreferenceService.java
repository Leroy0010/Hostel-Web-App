package com.leroy.hostelbackend.module.preference.service;

import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.hostel.repository.HostelRepository;
import com.leroy.hostelbackend.module.preference.dto.*;
import com.leroy.hostelbackend.module.preference.mapper.PreferenceMapper;
import com.leroy.hostelbackend.module.preference.model.PreferenceTag;
import com.leroy.hostelbackend.module.preference.model.StudentPreference;
import com.leroy.hostelbackend.module.preference.repository.StudentPreferenceRepository;
import com.leroy.hostelbackend.module.room.model.RoomStatus;
import com.leroy.hostelbackend.module.room.repository.RoomRepository;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Manages student lifestyle preferences and the roommate matching algorithm.
 *
 * <p><strong>Matching algorithm:</strong>
 * <ol>
 *   <li>Load the requesting student's tags from {@code student_preferences}.</li>
 *   <li>Convert to a PostgreSQL array literal ({@code "{QUIET,NEAT}"}) and run the
 *       native GIN overlap query to get UUIDs of students with matching tags.</li>
 *   <li>Cross-reference those UUIDs against active bookings ({@code APPROVED} /
 *       {@code CHECKED_IN}) for rooms in the target hostel.</li>
 *   <li>For each candidate room: check it is {@code AVAILABLE} (has free beds),
 *       compute the intersection of tags between the student and occupants, and
 *       build a {@link RoomMatchSuggestionDto}.</li>
 *   <li>Sort by number of matching tags descending — closest match first.</li>
 * </ol>
 *
 * <p><strong>Why native query:</strong> JPQL does not support the PostgreSQL
 * {@code &&} array-overlap operator. The native query hits the GIN index on
 * {@code student_preferences.tags} and runs in O(log n) rather than a full seq scan.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PreferenceService {

    private final StudentPreferenceRepository preferenceRepository;
    private final BookingRepository           bookingRepository;
    private final RoomRepository              roomRepository;
    private final UserRepository              userRepository;
    private final HostelRepository            hostelRepository;
    private final PreferenceMapper            preferenceMapper;

    // -------------------------------------------------------------------------
    // Save / update preferences
    // -------------------------------------------------------------------------

    /**
     * Creates or replaces the student's lifestyle tags. Full replace semantics —
     * sending an empty list clears all tags.
     *
     * <p>Tags are de-duplicated and validated against {@link PreferenceTag} before
     * persisting. Unknown tag strings are rejected with a clear error message.
     *
     * @param studentId the authenticated student's UUID
     * @param request   the complete desired tag set
     * @return the persisted {@link PreferenceDto}
     */
    @Transactional
    public PreferenceDto savePreferences(UUID studentId, SavePreferencesRequest request) {
        var student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + studentId));

        // Convert enums to their string names, de-duplicated, ordered
        var tagStrings = request.tags().stream()
                .distinct()
                .sorted()
                .toList();

        var preference = preferenceRepository.findByStudentId(studentId)
                .orElseGet(() -> {
                    var p = new StudentPreference();
                    p.setStudent(student);
                    return p;
                });

        preference.setTags(tagStrings);
        var saved = preferenceRepository.save(preference);

        log.info("Preferences saved for student {}: tags={}", studentId, tagStrings);
        return preferenceMapper.toDto(saved);
    }

    // -------------------------------------------------------------------------
    // Read preferences
    // -------------------------------------------------------------------------

    /**
     * Returns the student's current preferences, or an empty tag list if they
     * haven't set any yet.
     */
    @Transactional(readOnly = true)
    public PreferenceDto getMyPreferences(UUID studentId) {
        return preferenceRepository.findByStudentId(studentId)
                .map(preferenceMapper::toDto)
                .orElse(new PreferenceDto(studentId, List.of(), null));
    }

    // -------------------------------------------------------------------------
    // Roommate matching
    // -------------------------------------------------------------------------

    /**
     * Finds rooms in a hostel where at least one current occupant's tags overlap
     * with the requesting student's tags.
     *
     * <p>Returns an empty suggestions list (not an error) if the student has no
     * tags set — callers should prompt the student to fill in their preferences.
     *
     * @param studentId UUID of the requesting student
     * @param hostelId  UUID of the hostel to search within
     * @return match result including the student's own tags and sorted suggestions
     */
    @Transactional(readOnly = true)
    public RoomMatchResultDto findRoommateSuggestions(UUID studentId, UUID hostelId) {
        if (!hostelRepository.existsById(hostelId)) {
            throw new ResourceNotFoundException("Hostel not found: " + hostelId);
        }

        // 1. Load the requesting student's tags
        var myPreference = preferenceRepository.findByStudentId(studentId)
                .orElse(null);

        if (myPreference == null || myPreference.getTags().isEmpty()) {
            log.debug("Student {} has no preferences set — returning empty suggestions", studentId);
            return new RoomMatchResultDto(List.of(), List.of());
        }

        var myTags = myPreference.getTags();

        // 2. Build the PostgreSQL array literal: {"QUIET","NEAT"}
        String pgArrayLiteral = buildPgArrayLiteral(myTags);

        // 3. GIN overlap query — returns UUIDs of students who share at least one tag
        List<UUID> compatibleStudentIds = preferenceRepository
                .findStudentsWithOverlappingTags(pgArrayLiteral, studentId);

        if (compatibleStudentIds.isEmpty()) {
            return new RoomMatchResultDto(myTags, List.of());
        }

        // 4. Find active bookings for compatible students in this hostel
        //    (APPROVED or CHECKED_IN = currently occupying a room)
        var activeBookings = bookingRepository.findActiveByRoomIdIn(
                hostelId, compatibleStudentIds);

        if (activeBookings.isEmpty()) {
            return new RoomMatchResultDto(myTags, List.of());
        }

        // 5. Group bookings by room, then for each room:
        //    - check it still has free beds (AVAILABLE)
        //    - compute the union of matching tags across all current occupants
        //    - build a suggestion DTO
        var myTagSet = new HashSet<>(myTags);

        // roomId → list of occupant student UUIDs in that room
        Map<UUID, List<UUID>> roomToOccupants = activeBookings.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getRoom().getId(),
                        Collectors.mapping(b -> b.getStudent().getId(), Collectors.toList())
                ));

        var suggestions = new ArrayList<RoomMatchSuggestionDto>();

        for (var entry : roomToOccupants.entrySet()) {
            UUID       roomId    = entry.getKey();
            List<UUID> occupants = entry.getValue();

            var roomOpt = roomRepository.findByIdWithHostel(roomId);
            if (roomOpt.isEmpty()) continue;

            var room = roomOpt.get();

            // Skip rooms that aren't AVAILABLE (no free beds)
            if (room.getStatus() != RoomStatus.AVAILABLE) continue;
            // Ensure the room belongs to the requested hostel
            if (!room.getHostel().getId().equals(hostelId)) continue;

            // 6. Compute matching tags: union of (myTags ∩ occupantTags) across all occupants
            Set<PreferenceTag> matchingTags = new HashSet<>();
            for (UUID occupantId : occupants) {
                preferenceRepository.findByStudentId(occupantId).ifPresent(pref -> {
                    Set<PreferenceTag> occupantTagSet = new HashSet<>(pref.getTags());
                    occupantTagSet.retainAll(myTagSet);   // intersection
                    matchingTags.addAll(occupantTagSet);
                });
            }

            if (matchingTags.isEmpty()) continue; // safety guard

            short bedsAvailable = (short) (room.getCapacity() - room.getCurrentOccupancy());

            suggestions.add(new RoomMatchSuggestionDto(
                    room.getId(),
                    room.getRoomNumber(),
                    room.getRoomType(),
                    bedsAvailable,
                    room.getPricePerSemester(),
                    room.getImageUrl(),
                    new ArrayList<>(matchingTags).stream().sorted().toList(),
                    occupants.size()
            ));
        }

        // 7. Sort: most matching tags first, then fewest occupants (roomier feel)
        suggestions.sort(Comparator
                .comparingInt((RoomMatchSuggestionDto s) -> s.matchingTags().size()).reversed()
                .thenComparingInt(RoomMatchSuggestionDto::occupantCount));

        log.debug("Roommate suggestions for student {} in hostel {}: {} rooms found",
                studentId, hostelId, suggestions.size());

        return new RoomMatchResultDto(myTags, suggestions);
    }

    // -------------------------------------------------------------------------
    // Admin / Manager read — view any student's preferences
    // -------------------------------------------------------------------------

    /**
     * Returns the preferences for any student by their UUID.
     * Used by admin analytics and the manager room-assignment view.
     */
    @Transactional(readOnly = true)
    public PreferenceDto getPreferencesForStudent(UUID studentId) {
        return preferenceRepository.findByStudentId(studentId)
                .map(preferenceMapper::toDto)
                .orElse(new PreferenceDto(studentId, List.of(), null));
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Converts a Java list of tag strings to a PostgreSQL array literal
     * suitable for the native CAST({...} AS text[]) syntax.
     *
     * <p>Example: {@code ["QUIET", "NEAT"]} → {@code "{QUIET,NEAT}"}
     */
    private String buildPgArrayLiteral(List<PreferenceTag> tags) {
        return "{" + String.join(",", tags.stream().map(PreferenceTag::name).toList()) + "}";
    }
}