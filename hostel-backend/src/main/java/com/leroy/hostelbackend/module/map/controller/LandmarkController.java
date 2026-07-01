package com.leroy.hostelbackend.module.map.controller;

import com.leroy.hostelbackend.module.map.dto.*;
import com.leroy.hostelbackend.module.map.model.LandmarkCategory;
import com.leroy.hostelbackend.module.map.service.LandmarkService;
import com.leroy.hostelbackend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for campus landmarks and PostGIS distance queries.
 *
 * <pre>
 * GET    /landmarks                              Any auth: all landmarks for map
 * GET    /landmarks/{id}                         Any auth: single landmark detail
 * GET    /landmarks?category=ACADEMIC            Any auth: filter by category
 * GET    /landmarks/distance?hostelId=&landmarkId= Any auth: distance calculation
 * GET    /hostels/{hostelId}/landmarks/nearby    Any auth: nearby landmarks (1 km default)
 * POST   /admin/landmarks                        ADMIN: create landmark
 * PUT    /admin/landmarks/{id}                   ADMIN: update landmark
 * DELETE /admin/landmarks/{id}                   ADMIN: delete landmark
 * </pre>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
@Tag(name = "Landmarks")
public class LandmarkController {

    private final LandmarkService landmarkService;

    // =========================================================================
    // Public reads — all authenticated users
    // =========================================================================

    /**
     * All campus landmarks for the initial map load.
     * Optionally filter by category using the {@code category} query param.
     *
     * <p>Examples:
     * <ul>
     *   <li>{@code GET /landmarks} — all landmarks</li>
     *   <li>{@code GET /landmarks?category=LIBRARY} — only libraries</li>
     * </ul>
     */
    @GetMapping("/landmarks")
    public ResponseEntity<ApiResponse<List<LandmarkDto>>> getLandmarks(
            @RequestParam(required = false) LandmarkCategory category,
            @RequestParam( required = false) String search
    ) {

        return ResponseEntity.ok(ApiResponse.success("Landmarks fetched.", landmarkService.getAllLandmarks(category, search)));
    }

    /**
     * Single landmark detail — used when a student taps a map pin.
     */
    @GetMapping("/landmarks/{id}")
    public ResponseEntity<ApiResponse<LandmarkDto>> getLandmark(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Landmark fetched.", landmarkService.getLandmarkById(id)));
    }

    /**
     * Straight-line distance between a hostel and a landmark.
     * Returns metres, kilometres, and an estimated walking time at 5 km/h.
     *
     * <p>Example: {@code GET /landmarks/distance?hostelId=xxx&landmarkId=yyy}
     *
     * @param hostelId   UUID of the hostel
     * @param landmarkId UUID of the landmark
     */
    @GetMapping("/landmarks/distance")
    public ResponseEntity<ApiResponse<DistanceDto>> calculateDistance(
            @RequestParam UUID hostelId,
            @RequestParam UUID landmarkId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Distance calculated.", landmarkService.calculateDistance(hostelId, landmarkId)));
    }

    /**
     * All landmarks within a radius of a hostel, nearest first.
     * Default radius is 1000 m (1 km) — override with the {@code radiusMetres} param.
     *
     * <p>Example: {@code GET /hostels/xxx/landmarks/nearby?radiusMetres=500}
     */
    @GetMapping("/hostels/{hostelId}/landmarks/nearby")
    public ResponseEntity<ApiResponse<List<NearbyLandmarkDto>>> nearbyLandmarks(
            @PathVariable UUID hostelId,
            @RequestParam(defaultValue = "1000") double radiusMetres
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Nearby landmarks fetched.",
                landmarkService.getNearbyLandmarks(hostelId, radiusMetres)));
    }

    // =========================================================================
    // Admin writes
    // =========================================================================

    /**
     * Create a new campus landmark (seed UCC locations here).
     * Only accessible to admins.
     */
    @PostMapping("/admin/landmarks")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<LandmarkDto>> createLandmark(
            @Valid @RequestBody CreateLandmarkRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Landmark created.", landmarkService.createLandmark(request)));
    }

    /**
     * Update landmark details. Patch semantics — null fields are ignored.
     */
    @PutMapping("/admin/landmarks/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<LandmarkDto>> updateLandmark(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateLandmarkRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Landmark updated.", landmarkService.updateLandmark(id, request)));
    }

    /**
     * Permanently delete a landmark. Removes it from the map.
     */
    @DeleteMapping("/admin/landmarks/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteLandmark(@PathVariable UUID id) {
        landmarkService.deleteLandmark(id);
        return ResponseEntity.ok(ApiResponse.success("Landmark deleted."));
    }
}