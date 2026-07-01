package com.leroy.hostelbackend.module.dashboard.controller;

import com.leroy.hostelbackend.module.dashboard.dto.DashboardDto;
import com.leroy.hostelbackend.module.dashboard.service.DashboardService;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for the role-specific dashboard endpoint.
 *
 * <p><strong>Single endpoint, three response shapes:</strong>
 * {@code GET /api/dashboard} returns a different JSON payload depending on the
 * authenticated user's role. The response is discriminated by a top-level
 * {@code "role"} field:
 *
 * <pre>
 * GET /api/dashboard
 *   ADMIN   → AdminDashboard   (system-wide overview)
 *   MANAGER → ManagerDashboard (scoped to the manager's hostels)
 *   STUDENT → StudentDashboard (personal bookings + waitlist)
 * </pre>
 *
 * <p>The TypeScript frontend uses the {@code role} discriminator to narrow the
 * union type and render the appropriate dashboard component.
 *
 * <p>All roles are allowed — the service handles role-based scoping
 * internally via {@link DashboardService#getDashboard}.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
@Tag(name = "Dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * Returns the role-appropriate dashboard payload for the authenticated user.
     *
     * <ul>
     *   <li><strong>ADMIN</strong> — system-wide metrics: hostel occupancy,
     *       booking funnel, complaint summary, waitlist depth, user counts.</li>
     *   <li><strong>MANAGER</strong> — per-hostel cards scoped to the manager's
     *       assigned hostels: pending bookings, open complaints, occupancy.</li>
     *   <li><strong>STUDENT</strong> — personal view: current accommodation,
     *       recent bookings, waitlist positions.</li>
     * </ul>
     *
     * @param principal the authenticated user injected by Spring Security
     * @return {@code 200 OK} with a {@link DashboardDto} variant
     */
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardDto>> getDashboard(
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        var payload = dashboardService.getDashboard(
                principal.getUserId(),
                principal.getRole()
        );
        return ResponseEntity.ok(ApiResponse.success("Dashboard fetched.", payload));
    }
}