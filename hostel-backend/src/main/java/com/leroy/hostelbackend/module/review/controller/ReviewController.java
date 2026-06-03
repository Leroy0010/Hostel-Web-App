package com.leroy.hostelbackend.module.review.controller;

import com.leroy.hostelbackend.module.review.dto.*;
import com.leroy.hostelbackend.module.review.service.ReviewService;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.user.model.UserRole;
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

import java.util.UUID;

/**
 * REST controller for hostel reviews.
 *
 * <pre>
 * POST   /reviews                          STUDENT: submit a review
 * GET    /reviews/my                       STUDENT: own reviews
 * GET    /reviews/{id}                     Any authenticated: review detail
 * PUT    /reviews/{id}                     STUDENT (author): update own review
 * DELETE /reviews/{id}                     STUDENT (author) or ADMIN: delete
 * GET    /hostels/{hostelId}/reviews       Any authenticated: hostel review feed
 * GET    /hostels/{hostelId}/reviews/rating Any authenticated: aggregate rating card
 * </pre>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
@Tag(name = "Reviews")
public class ReviewController {

    private final ReviewService reviewService;

    /**
     * Submit a new review. The booking ID in the request body proves the student
     * actually stayed at the hostel — the service validates this.
     */
    @PostMapping("/reviews")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<ReviewDto>> createReview(
            @Valid @RequestBody CreateReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Review submitted.", reviewService.createReview(customUserDetails.getUserId(), request)));
    }

    /**
     * All reviews submitted by the authenticated student.
     */
    @GetMapping("/reviews/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Page<ReviewSummaryDto>>> myReviews(
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success("Reviews fetched.", reviewService.myReviews(customUserDetails.getUserId(), pageable)));
    }

    /**
     * Full detail for a single review — any authenticated user.
     */
    @GetMapping("/reviews/{id}")
    public ResponseEntity<ApiResponse<ReviewDto>> getReview(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Review fetched.", reviewService.getReviewById(id)));
    }

    /**
     * Update rating and/or comment. Author only.
     */
    @PutMapping("/reviews/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<ReviewDto>> updateReview(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success("Review updated.", reviewService.updateReview(id, customUserDetails.getUserId(), request)));
    }

    /**
     * Delete a review. Authors delete their own; admins can delete any.
     */
    @DeleteMapping("/reviews/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var userId  = customUserDetails.getUserId();
        boolean isAdmin = customUserDetails.getRole().equals(UserRole.ADMIN);
        reviewService.deleteReview(id, userId, isAdmin);
        return ResponseEntity.ok(ApiResponse.success("Review deleted."));
    }

    /**
     * Paginated review feed for a hostel — newest first.
     * Open to all authenticated users including students browsing hostels.
     */
    @GetMapping("/hostels/{hostelId}/reviews")
    public ResponseEntity<ApiResponse<Page<ReviewSummaryDto>>> hostelReviews(
            @PathVariable UUID hostelId,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success("Reviews fetched.",
                reviewService.listReviewsByHostel(hostelId, pageable)));
    }

    /**
     * Aggregate rating card for a hostel — average score and total count.
     * Displayed on the hostel listing and detail pages.
     */
    @GetMapping("/hostels/{hostelId}/reviews/rating")
    public ResponseEntity<ApiResponse<HostelRatingDto>> hostelRating(@PathVariable UUID hostelId) {
        return ResponseEntity.ok(ApiResponse.success("Rating fetched.", reviewService.getHostelRating(hostelId)));
    }
}