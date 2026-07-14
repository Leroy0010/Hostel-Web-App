package com.leroy.hostelbackend.module.room.controller;

import com.leroy.hostelbackend.module.booking.dto.AvailablePeriodDto;
import com.leroy.hostelbackend.module.room.dto.*;
import com.leroy.hostelbackend.module.room.model.RoomType;
import com.leroy.hostelbackend.module.room.service.RoomService;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for room management.
 *
 * <p>Endpoint summary:
 * <pre>
 * GET    /hostels/{hostelId}/rooms                   → Students: available rooms (filterable)
 * GET    /rooms/{id}                                  → Any authenticated: room detail
 * GET    /manager/hostels/{hostelId}/rooms            → Manager: all rooms in hostel
 * POST   /manager/hostels/{hostelId}/rooms            → Manager: create room
 * PUT    /manager/rooms/{id}                          → Manager: update room
 * PATCH  /manager/rooms/{id}/status                  → Manager: change status
 * DELETE /manager/rooms/{id}                          → Manager only: delete room
 * PUT    /manager/rooms/{id}/amenities               → Manager: replace all amenities
 * POST   /manager/rooms/{id}/amenities               → Manager: add one amenity
 * DELETE /manager/amenities/{amenityId}              → Manager: remove one amenity
 * </pre>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Rooms")
@RequestMapping("/api")
public class RoomController {

    private final RoomService roomService;

    // =========================================================================
    // Student / Public reads
    // =========================================================================

    /**
     * Available rooms in a hostel with optional type and price filters.
     * Defaults: page 0, size 12, sorted by price ascending.
     */
    @GetMapping("/hostels/{hostelId}/rooms")
    public ResponseEntity<ApiResponse<Page<RoomSummaryDto>>> listAvailableRooms(
            @PathVariable UUID hostelId,
            @RequestParam(required = false) RoomType roomType,
            @RequestParam(required = false) BigDecimal maxPrice,
            @PageableDefault(size = 12, sort = "pricePerSemester", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success("Available rooms fetched.",
                roomService.listAvailableRooms(hostelId, roomType, maxPrice, pageable)));
    }

    /** Full room detail including amenities. */
    @GetMapping("/rooms/{id}")
    public ResponseEntity<ApiResponse<RoomDto>> getRoom(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Room fetched.", roomService.getRoomById(id)));
    }

    @GetMapping("/student/hostels/{hostelId}/rooms")
    public ResponseEntity<ApiResponse<List<RoomSummaryDto>>> getStudentActiveRoomsByHostelId(
            @AuthenticationPrincipal CustomUserDetails customUserDetails,
            @PathVariable UUID hostelId) {
        return ResponseEntity
                .ok(ApiResponse.success("Rooms fetched", roomService.getStudentActiveRooms(customUserDetails.getUserId(), hostelId)));
    }

    // =========================================================================
    // Manager + Admin reads
    // =========================================================================

    /** All rooms in a hostel — includes occupied / maintenance rooms. */
    @GetMapping("/manager/hostels/{hostelId}/rooms")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Page<RoomSummaryDto>>> listAllRooms(
            @PathVariable UUID hostelId,
            @PageableDefault(size = 20, sort = "roomNumber") Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success("Rooms fetched.",
                roomService.listRoomsByHostel(hostelId, pageable)));
    }

    // =========================================================================
    // Manager writes
    // =========================================================================

    /** Create a new room in a hostel. */
    @PostMapping("/manager/hostels/{hostelId}/rooms")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<RoomDto>> createRoom(
            @PathVariable UUID hostelId,
            @Valid @RequestBody CreateRoomRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success("Room created.", roomService.createRoom(hostelId, request, customUserDetails.getUserId())));
    }

    /** Update room fields. Patch semantics — null fields ignored. */
    @PutMapping("/manager/rooms/{id}")
    @PreAuthorize("hasAnyRole('MANAGER')")
    public ResponseEntity<ApiResponse<RoomDto>> updateRoom(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRoomRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success("Room updated.",
                roomService.updateRoom(id, request, customUserDetails.getUserId())));
    }

    /** Change room operational status (e.g. mark UNDER_MAINTENANCE). */
    @PatchMapping("/manager/rooms/{id}/status")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<RoomDto>> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRoomStatusRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success("Room status updated.",
                roomService.updateRoomStatus(id, request.status(), customUserDetails.getUserId())));
    }

    /** Permanently delete a room. */
    @DeleteMapping("/manager/rooms/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(@PathVariable UUID id) {
        roomService.deleteRoom(id);
        return ResponseEntity.ok(ApiResponse.success("Room deleted."));
    }

    // =========================================================================
    // Amenity management
    // =========================================================================

    /** Replace ALL amenities on a room with the supplied list. */
    @PutMapping("/manager/rooms/{id}/amenities")
    @PreAuthorize("hasAnyRole('MANAGER')")
    public ResponseEntity<ApiResponse<RoomDto>> replaceAmenities(
            @PathVariable UUID id,
            @Valid @RequestBody List<AmenityRequest> requests,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {

        return ResponseEntity.ok(ApiResponse.success("Amenities replaced.",
                roomService.replaceAmenities(id, requests, customUserDetails.getUserId())));
    }

    /** Add a single amenity to a room without removing existing ones. */
    @PostMapping("/manager/rooms/{id}/amenities")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<RoomDto>> addAmenity(
            @PathVariable UUID id,
            @Valid @RequestBody AmenityRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success("Amenity added.", roomService.addAmenity(id, request, customUserDetails.getUserId())));
    }

    /** Remove a single amenity by its UUID. */
    @DeleteMapping("/manager/amenities/{amenityId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteAmenity(
            @PathVariable UUID amenityId,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {

        roomService.deleteAmenity(amenityId, customUserDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("Amenity removed."));
    }

    @GetMapping("/rooms/{roomId}/available-periods")
    public ResponseEntity<ApiResponse<List<AvailablePeriodDto>>> getAvailablePeriods(
            @PathVariable UUID roomId
    ){
        return ResponseEntity
                .ok(ApiResponse.success(
                        "Available booking periods",
                        roomService.getBookingPeriods(roomId)));
    }
}