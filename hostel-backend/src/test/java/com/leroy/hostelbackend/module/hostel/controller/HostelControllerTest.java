package com.leroy.hostelbackend.module.hostel.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leroy.hostelbackend.module.hostel.dto.AssignManagerRequest;
import com.leroy.hostelbackend.module.hostel.dto.CreateHostelRequest;
import com.leroy.hostelbackend.module.hostel.dto.HostelDto;
import com.leroy.hostelbackend.module.hostel.dto.UpdateHostelRequest;
import com.leroy.hostelbackend.module.hostel.model.GenderPolicy;
import com.leroy.hostelbackend.module.hostel.service.HostelDisplayService;
import com.leroy.hostelbackend.module.hostel.service.HostelService;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
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
import java.util.List;
import java.util.UUID;

import static com.leroy.hostelbackend.testsupport.TestFixtures.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * {@code @WebMvcTest} slice tests for {@link HostelController}.
 *
 * <p>Same pattern as {@code RoomControllerTest}: role enforcement, public
 * (permitAll) reads, and validation, with {@link HostelService} /
 * {@link HostelDisplayService} mocked throughout. See
 * {@link MethodSecurityTestConfig} for the security setup.
 */
@WebMvcTest(controllers = HostelController.class)
@Import(MethodSecurityTestConfig.class)
class HostelControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private HostelService hostelService;
    @MockitoBean private HostelDisplayService hostelDisplayService;
    @MockitoBean private com.leroy.hostelbackend.module.auth.security.JwtService jwtService;
    @MockitoBean private com.leroy.hostelbackend.module.user.repository.UserRepository userRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private static final UUID HOSTEL_ID = UUID.randomUUID();

    private MockHttpServletRequestBuilder withJson(MockHttpServletRequestBuilder builder, Object body)
            throws Exception {
        return builder.contentType("application/json").content(objectMapper.writeValueAsString(body));
    }

    private static HostelDto minimalHostelDto() {
        return new HostelDto(
                HOSTEL_ID, "Leroy Hostel", "1 Campus Road", "A great place to stay",
                "MIXED", "https://example.com/hostel.jpg", true, 5.1053, -1.2466,
                null, LocalDateTime.now(), LocalDateTime.now());
    }

    // =========================================================================
    // listHostels / getHostel — public (permitAll)
    // =========================================================================

    @Nested
    @DisplayName("GET /api/hostels and /api/hostels/{id} — public reads")
    class PublicReads {

        @Test
        @DisplayName("listHostels: 200 even when unauthenticated")
        void listHostelsPublic() throws Exception {
            Page<?> emptyPage = new PageImpl<>(List.of());
            when(hostelService.listActiveHostels(any(), any(), any())).thenReturn((Page) emptyPage);

            mockMvc.perform(get("/api/hostels"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Hostels fetched."));
        }

        @Test
        @DisplayName("getHostel: 200 even when unauthenticated")
        void getHostelPublic() throws Exception {
            when(hostelDisplayService.getHostelDetailsPage(eq(HOSTEL_ID), any(), any(), any()))
                    .thenReturn(null);

            mockMvc.perform(get("/api/hostels/{id}", HOSTEL_ID))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("getHostel: 404 when the hostel does not exist")
        void getHostelNotFound() throws Exception {
            when(hostelDisplayService.getHostelDetailsPage(eq(HOSTEL_ID), any(), any(), any()))
                    .thenThrow(new ResourceNotFoundException("Hostel not found: " + HOSTEL_ID));

            mockMvc.perform(get("/api/hostels/{id}", HOSTEL_ID))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
        }
    }

    // =========================================================================
    // createHostel — POST /api/admin/hostels (ADMIN only)
    // =========================================================================

    @Nested
    @DisplayName("POST /api/admin/hostels")
    class CreateHostel {

        private final CreateHostelRequest validRequest = new CreateHostelRequest(
                "Leroy Hostel", "1 Campus Road", "A great place to stay",
                GenderPolicy.MIXED, "https://example.com/hostel.jpg", 5.1053, -1.2466, null);

        @Test
        @DisplayName("403 when authenticated as MANAGER instead of ADMIN")
        void wrongRole() throws Exception {
            mockMvc.perform(withJson(post("/api/admin/hostels"), validRequest)
                            .with(authentication(authFor(manager("Kwame", "Mensah")))))
                    .andExpect(status().isForbidden());
            verifyNoInteractions(hostelService);
        }

        @Test
        @DisplayName("401 when unauthenticated (this endpoint is NOT under the public /api/hostels/** matcher)")
        void unauthenticated() throws Exception {
            mockMvc.perform(withJson(post("/api/admin/hostels"), validRequest))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("400 when name is blank")
        void blankName() throws Exception {
            var invalid = new CreateHostelRequest(
                    "", "1 Campus Road", null, GenderPolicy.MIXED,
                    "https://example.com/hostel.jpg", null, null, null);

            mockMvc.perform(withJson(post("/api/admin/hostels"), invalid)
                            .with(authentication(authFor(admin("Ama", "Boateng")))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.name[0]").value("Hostel name is required"));
        }

        @Test
        @DisplayName("400 when latitude is out of range")
        void latitudeOutOfRange() throws Exception {
            var invalid = new CreateHostelRequest(
                    "Leroy Hostel", "1 Campus Road", null, GenderPolicy.MIXED,
                    "https://example.com/hostel.jpg", 91.0, -1.2466, null);

            mockMvc.perform(withJson(post("/api/admin/hostels"), invalid)
                            .with(authentication(authFor(admin("Ama", "Boateng")))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.latitude[0]")
                            .value("Latitude must be between -90 and 90"));
        }

        @Test
        @DisplayName("201 for ADMIN on success")
        void success() throws Exception {
            when(hostelService.createHostel(any())).thenReturn(minimalHostelDto());

            mockMvc.perform(withJson(post("/api/admin/hostels"), validRequest)
                            .with(authentication(authFor(admin("Ama", "Boateng")))))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.message").value("Hostel created successfully."))
                    .andExpect(jsonPath("$.data.name").value("Leroy Hostel"));
        }
    }

    // =========================================================================
    // assignManager — POST /api/admin/hostels/{id}/manager (ADMIN only)
    // =========================================================================

    @Nested
    @DisplayName("POST /api/admin/hostels/{id}/manager")
    class AssignManager {

        @Test
        @DisplayName("403 when authenticated as MANAGER instead of ADMIN")
        void wrongRole() throws Exception {
            var request = new AssignManagerRequest(UUID.randomUUID());
            mockMvc.perform(withJson(post("/api/admin/hostels/{id}/manager", HOSTEL_ID), request)
                            .with(authentication(authFor(manager("Kwame", "Mensah")))))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("400 when managerId is missing")
        void missingManagerId() throws Exception {
            var invalid = new AssignManagerRequest(null);

            mockMvc.perform(withJson(post("/api/admin/hostels/{id}/manager", HOSTEL_ID), invalid)
                            .with(authentication(authFor(admin("Ama", "Boateng")))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.managerId[0]").value("Manager ID is required"));
        }

        @Test
        @DisplayName("200 on success")
        void success() throws Exception {
            var managerId = UUID.randomUUID();
            var request = new AssignManagerRequest(managerId);
            when(hostelService.assignManager(eq(HOSTEL_ID), any())).thenReturn(minimalHostelDto());

            mockMvc.perform(withJson(post("/api/admin/hostels/{id}/manager", HOSTEL_ID), request)
                            .with(authentication(authFor(admin("Ama", "Boateng")))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Manager assigned."));
        }
    }

    // =========================================================================
    // managerUpdateHostel — PUT /api/manager/hostels/{id} (MANAGER only)
    // =========================================================================

    @Nested
    @DisplayName("PUT /api/manager/hostels/{id}")
    class ManagerUpdateHostel {

        private final UpdateHostelRequest patchRequest =
                new UpdateHostelRequest(null, null, "Updated description", null, null, null, null);

        @Test
        @DisplayName("403 when authenticated as ADMIN instead of MANAGER (this endpoint is manager-only)")
        void rejectsAdmin() throws Exception {
            mockMvc.perform(withJson(put("/api/manager/hostels/{id}", HOSTEL_ID), patchRequest)
                            .with(authentication(authFor(admin("Ama", "Boateng")))))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("200 for MANAGER, passing their own id as the ownership-check actor")
        void success() throws Exception {
            var manager = manager("Kwame", "Mensah");
            when(hostelService.managerUpdateHostel(eq(HOSTEL_ID), any(), eq(manager.getId())))
                    .thenReturn(minimalHostelDto());

            mockMvc.perform(withJson(put("/api/manager/hostels/{id}", HOSTEL_ID), patchRequest)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Hostel updated."));

            verify(hostelService).managerUpdateHostel(HOSTEL_ID, patchRequest, manager.getId());
        }
    }
}
