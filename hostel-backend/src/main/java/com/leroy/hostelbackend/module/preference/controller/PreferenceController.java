package com.leroy.hostelbackend.module.preference.controller;

import com.leroy.hostelbackend.module.preference.dto.*;
import com.leroy.hostelbackend.module.preference.service.PreferenceService;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for student preferences and roommate matching.
 *
 * <pre>
 * PUT  /preferences/my              STUDENT: save/replace own tags
 * GET  /preferences/my              STUDENT: view own tags
 * GET  /preferences/match/{hostelId} STUDENT: get roommate suggestions for a hostel
 * GET  /admin/preferences/{studentId} ADMIN/MANAGER: view any student's tags
 * </pre>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
@Tag(name = "Preferences")
public class PreferenceController {

    private final PreferenceService preferenceService;

    /**
     * Save or replace the authenticated student's lifestyle tags.
     * Send an empty list to clear all preferences.
     */
    @PutMapping("/preferences/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<PreferenceDto>> savePreferences(
            @Valid @RequestBody SavePreferencesRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var studentId = customUserDetails.getUserId();
        return ResponseEntity.ok(ApiResponse.success(
                "Preferences saved.", preferenceService.savePreferences(studentId, request)));
    }

    /**
     * Returns the authenticated student's current tags.
     */
    @GetMapping("/preferences/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<PreferenceDto>> getMyPreferences(@AuthenticationPrincipal CustomUserDetails customUserDetails) {
        var studentId = customUserDetails.getUserId();
        return ResponseEntity.ok(ApiResponse.success(
                "Preferences fetched.", preferenceService.getMyPreferences(studentId)));
    }

    /**
     * Roommate matching suggestions for a specific hostel.
     *
     * <p>Returns rooms in the hostel where at least one current occupant shares
     * a lifestyle tag with the requesting student, sorted by match quality.
     * Returns an empty list (not an error) if the student hasn't set their tags yet.
     */
    @GetMapping("/preferences/match/{hostelId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<RoomMatchResultDto>> findSuggestions(
            @PathVariable UUID hostelId,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var studentId = customUserDetails.getUserId();
        var result    = preferenceService.findRoommateSuggestions(studentId, hostelId);

        String message = result.suggestions().isEmpty()
                ? "No roommate matches found. Try setting your lifestyle preferences or check back when more students move in."
                : result.suggestions().size() + " compatible room(s) found.";

        return ResponseEntity.ok(ApiResponse.success(message, result));
    }

    /**
     * Admin/Manager: view any student's preferences (e.g. for manual room assignment).
     */
    @GetMapping("/admin/preferences/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<PreferenceDto>> getStudentPreferences(
            @PathVariable UUID studentId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Student preferences fetched.",
                preferenceService.getPreferencesForStudent(studentId)));
    }
}