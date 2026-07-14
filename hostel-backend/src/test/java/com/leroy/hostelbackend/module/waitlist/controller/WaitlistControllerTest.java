package com.leroy.hostelbackend.module.waitlist.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leroy.hostelbackend.module.room.model.RoomType;
import com.leroy.hostelbackend.module.waitlist.dto.JoinWaitlistRequest;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistDto;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistEntryDto;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistStatusDto;
import com.leroy.hostelbackend.module.waitlist.service.WaitlistService;
import com.leroy.hostelbackend.config.JacksonConfig;
import com.leroy.hostelbackend.testsupport.MethodSecurityTestConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

import static com.leroy.hostelbackend.testsupport.TestFixtures.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * {@code @WebMvcTest} slice tests for {@link WaitlistController}.
 *
 * <p>Same rationale as {@code BookingControllerTest}: verifies
 * {@code @PreAuthorize} role gating and request validation at the web
 * layer, with {@link WaitlistService} mocked throughout. See
 * {@link MethodSecurityTestConfig} for why a minimal test-only security
 * config is used instead of the production one.
 */
@WebMvcTest(controllers = WaitlistController.class)
@Import({MethodSecurityTestConfig.class, JacksonConfig.class})
class WaitlistControllerTest {

    @Autowired private MockMvc mockMvc;
    // See BookingControllerTest for why this is constructed locally rather
    // than @Autowired.
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    @MockitoBean private WaitlistService waitlistService;

    // See BookingControllerTest for why these two are needed: @WebMvcTest
    // auto-detects the real @Component-annotated JwtAuthenticationFilter
    // regardless of which security config is @Import-ed, so its constructor
    // dependencies must be satisfiable even though neither is ever stubbed here.
    @MockitoBean private com.leroy.hostelbackend.module.auth.security.JwtService jwtService;
    @MockitoBean private com.leroy.hostelbackend.module.user.repository.UserRepository userRepository;

    private static final UUID HOSTEL_ID = UUID.randomUUID();
    private static final UUID WAITLIST_ID = UUID.randomUUID();

    private MockHttpServletRequestBuilder withJson(MockHttpServletRequestBuilder builder, Object body)
            throws Exception {
        return builder.contentType("application/json").content(objectMapper.writeValueAsString(body));
    }

    private static WaitlistDto minimalWaitlistDto(int position) {
        return new WaitlistDto(
                WAITLIST_ID, HOSTEL_ID, "Leroy Hostel", "https://example.com/img.jpg",
                "SINGLE", position, "2025/2026", "FIRST", LocalDateTime.now(), false);
    }

    // =========================================================================
    // joinWaitlist — POST /api/waitlists (STUDENT only)
    // =========================================================================

    @Nested
    @DisplayName("POST /api/waitlists")
    class JoinWaitlist {

        private final JoinWaitlistRequest validRequest =
                new JoinWaitlistRequest(HOSTEL_ID, RoomType.SINGLE, "2025/2026", "FIRST");

        @Test
        @DisplayName("401 when unauthenticated")
        void unauthenticated() throws Exception {
            mockMvc.perform(withJson(post("/api/waitlists"), validRequest))
                    .andExpect(status().isUnauthorized());
            verifyNoInteractions(waitlistService);
        }

        @Test
        @DisplayName("403 when authenticated as MANAGER instead of STUDENT")
        void wrongRole() throws Exception {
            mockMvc.perform(withJson(post("/api/waitlists"), validRequest)
                            .with(authentication(authFor(manager("Kwame", "Mensah")))))
                    .andExpect(status().isForbidden());
            verifyNoInteractions(waitlistService);
        }

        @Test
        @DisplayName("400 when hostelId is missing")
        void missingHostelId() throws Exception {
            var invalid = new JoinWaitlistRequest(null, RoomType.SINGLE, "2025/2026", "FIRST");

            mockMvc.perform(withJson(post("/api/waitlists"), invalid)
                            .with(authentication(authFor(student("Lexa", "Doe")))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.hostelId[0]").value("Hostel ID is required"));
            verifyNoInteractions(waitlistService);
        }

        @Test
        @DisplayName("201 with a message that includes the assigned position")
        void success() throws Exception {
            var student = student("Lexa", "Doe");
            when(waitlistService.joinWaitlist(eq(student.getId()), any(JoinWaitlistRequest.class)))
                    .thenReturn(minimalWaitlistDto(4));

            mockMvc.perform(withJson(post("/api/waitlists"), validRequest)
                            .with(authentication(authFor(student))))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.message").value("You have joined the waitlist at position 4."))
                    .andExpect(jsonPath("$.data.position").value(4));
        }
    }

    // =========================================================================
    // leaveWaitlist — DELETE /api/waitlists/{hostelId} (STUDENT only)
    // =========================================================================

    @Nested
    @DisplayName("DELETE /api/waitlists/{hostelId}")
    class LeaveWaitlist {

        @Test
        @DisplayName("200 on success")
        void success() throws Exception {
            var student = student("Lexa", "Doe");
            var request = new JoinWaitlistRequest(HOSTEL_ID, RoomType.SINGLE, "2025/2026", "FIRST");

            mockMvc.perform(withJson(delete("/api/waitlists/{hostelId}", HOSTEL_ID), request)
                            .with(authentication(authFor(student))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("You have been removed from the waitlist."));

            verify(waitlistService).leaveWaitlist(
                    student.getId(), HOSTEL_ID, RoomType.SINGLE, "2025/2026", "FIRST");
        }

        @Test
        @DisplayName("403 when authenticated as MANAGER instead of STUDENT")
        void wrongRole() throws Exception {
            var request = new JoinWaitlistRequest(HOSTEL_ID, RoomType.SINGLE, "2025/2026", "FIRST");

            mockMvc.perform(withJson(delete("/api/waitlists/{hostelId}", HOSTEL_ID), request)
                            .with(authentication(authFor(manager("Kwame", "Mensah")))))
                    .andExpect(status().isForbidden());
            verifyNoInteractions(waitlistService);
        }
    }

    // =========================================================================
    // getStatus — GET /api/waitlists/status/{hostelId} (STUDENT only)
    // =========================================================================

    @Nested
    @DisplayName("GET /api/waitlists/status/{hostelId}")
    class GetStatus {

        @Test
        @DisplayName("200 with the student's queue position")
        void success() throws Exception {
            var student = student("Lexa", "Doe");
            var statusDto = new WaitlistStatusDto(true, 3, 10L, "SINGLE", "2025/2026", "FIRST");
            when(waitlistService.getWaitlistStatus(
                    eq(student.getId()), eq(HOSTEL_ID), eq(RoomType.SINGLE), any(), any()))
                    .thenReturn(statusDto);

            mockMvc.perform(get("/api/waitlists/status/{hostelId}", HOSTEL_ID)
                            .param("roomType", "SINGLE")
                            .param("academicYear", "2025/2026")
                            .param("semester", "FIRST")
                            .with(authentication(authFor(student))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.onWaitlist").value(true))
                    .andExpect(jsonPath("$.data.position").value(3))
                    .andExpect(jsonPath("$.data.totalInQueue").value(10));
        }
    }

    // =========================================================================
    // hostelWaitlist — GET /api/manager/hostels/{hostelId}/waitlist (MANAGER only)
    // =========================================================================

    @Nested
    @DisplayName("GET /api/manager/hostels/{hostelId}/waitlist")
    class HostelWaitlist {

        @Test
        @DisplayName("403 when authenticated as STUDENT instead of MANAGER")
        void wrongRole() throws Exception {
            mockMvc.perform(get("/api/manager/hostels/{hostelId}/waitlist", HOSTEL_ID)
                            .with(authentication(authFor(student("Lexa", "Doe")))))
                    .andExpect(status().isForbidden());
            verifyNoInteractions(waitlistService);
        }

        @Test
        @DisplayName("200 with the hostel's queue for a manager")
        void success() throws Exception {
            var manager = manager("Kwame", "Mensah");
            Page<WaitlistEntryDto> emptyPage = new PageImpl<>(java.util.List.of());
            when(waitlistService.hostelWaitlist(eq(HOSTEL_ID), any(), any(), any(), any()))
                    .thenReturn(emptyPage);

            mockMvc.perform(get("/api/manager/hostels/{hostelId}/waitlist", HOSTEL_ID)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Waitlist fetched."));
        }
    }

    // =========================================================================
    // managerRemove — DELETE /api/manager/waitlists/{waitlistId} (MANAGER only)
    // =========================================================================

    @Nested
    @DisplayName("DELETE /api/manager/waitlists/{waitlistId}")
    class ManagerRemove {

        @Test
        @DisplayName("403 when authenticated as STUDENT instead of MANAGER")
        void wrongRole() throws Exception {
            mockMvc.perform(delete("/api/manager/waitlists/{waitlistId}", WAITLIST_ID)
                            .with(authentication(authFor(student("Lexa", "Doe")))))
                    .andExpect(status().isForbidden());
            verifyNoInteractions(waitlistService);
        }

        @Test
        @DisplayName("200 on success")
        void success() throws Exception {
            mockMvc.perform(delete("/api/manager/waitlists/{waitlistId}", WAITLIST_ID)
                            .with(authentication(authFor(manager("Kwame", "Mensah")))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Waitlist entry removed."));

            verify(waitlistService).managerRemoveEntry(WAITLIST_ID);
        }
    }

    // =========================================================================
    // getWaitlistPeriods — GET /api/hostels/{hostelId}/waitlist-periods
    // (no @PreAuthorize, and matches the /api/hostels/** permitAll rule in
    // SecurityConfig — genuinely public, not merely open to any authenticated role)
    // =========================================================================

    @Nested
    @DisplayName("GET /api/hostels/{hostelId}/waitlist-periods")
    class GetWaitlistPeriods {

        @Test
        @DisplayName("200 even when unauthenticated — this path matches the /api/hostels/** "
                + "permitAll rule in production SecurityConfig")
        void publiclyAccessible() throws Exception {
            // Originally asserted 401 here, which was wrong: /api/hostels/{hostelId}/waitlist-periods
            // matches SecurityConfig's `.requestMatchers(HttpMethod.GET, "/api/hostels/**").permitAll()`,
            // same as GET /api/hostels/{id} itself. MethodSecurityTestConfig now mirrors that rule
            // faithfully, which is what surfaced this test's original assumption as incorrect.
            when(waitlistService.getWaitlistPeriodsDropdown(eq(HOSTEL_ID), any()))
                    .thenReturn(java.util.List.of());

            mockMvc.perform(get("/api/hostels/{hostelId}/waitlist-periods", HOSTEL_ID))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("200 for any authenticated role, e.g. STUDENT")
        void anyAuthenticatedRole() throws Exception {
            when(waitlistService.getWaitlistPeriodsDropdown(eq(HOSTEL_ID), any()))
                    .thenReturn(java.util.List.of());

            mockMvc.perform(get("/api/hostels/{hostelId}/waitlist-periods", HOSTEL_ID)
                            .with(authentication(authFor(student("Lexa", "Doe")))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Waitlist periods fetched."));
        }
    }
}
