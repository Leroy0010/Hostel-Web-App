package com.leroy.hostelbackend.module.room.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leroy.hostelbackend.module.room.dto.AmenityRequest;
import com.leroy.hostelbackend.module.room.dto.CreateRoomRequest;
import com.leroy.hostelbackend.module.room.dto.RoomDto;
import com.leroy.hostelbackend.module.room.dto.UpdateRoomStatusRequest;
import com.leroy.hostelbackend.module.room.model.RoomStatus;
import com.leroy.hostelbackend.module.room.model.RoomType;
import com.leroy.hostelbackend.module.room.service.RoomService;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import com.leroy.hostelbackend.testsupport.MethodSecurityTestConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
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
 * {@code @WebMvcTest} slice tests for {@link RoomController}.
 *
 * <p>Same pattern as {@code BookingControllerTest}: role enforcement,
 * validation, and exception mapping, with {@link RoomService} mocked
 * throughout. See {@link MethodSecurityTestConfig} for the security setup
 * and why {@code JwtService}/{@code UserRepository} are mocked below despite
 * never being stubbed.
 */
@WebMvcTest(controllers = RoomController.class)
@Import(MethodSecurityTestConfig.class)
class RoomControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private RoomService roomService;
    @MockitoBean private com.leroy.hostelbackend.module.auth.security.JwtService jwtService;
    @MockitoBean private com.leroy.hostelbackend.module.user.repository.UserRepository userRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private static final UUID HOSTEL_ID = UUID.randomUUID();
    private static final UUID ROOM_ID = UUID.randomUUID();

    private MockHttpServletRequestBuilder withJson(MockHttpServletRequestBuilder builder, Object body)
            throws Exception {
        return builder.contentType("application/json").content(objectMapper.writeValueAsString(body));
    }

    private static RoomDto minimalRoomDto() {
        return new RoomDto(
                ROOM_ID, HOSTEL_ID, "Leroy Hostel", "A-101", "SINGLE",
                (short) 1, (short) 0, (short) 1, new BigDecimal("1500.00"),
                "AVAILABLE", 1, "https://example.com/room.jpg", List.of(),
                LocalDateTime.now(), LocalDateTime.now());
    }

    // =========================================================================
    // createRoom — POST /api/manager/hostels/{hostelId}/rooms (MANAGER or ADMIN)
    // =========================================================================

    @Nested
    @DisplayName("POST /api/manager/hostels/{hostelId}/rooms")
    class CreateRoom {

        private final CreateRoomRequest validRequest = new CreateRoomRequest(
                "A-101", RoomType.SINGLE, (short) 1, new BigDecimal("1500.00"),
                "https://example.com/room.jpg", 1, List.of());

        @Test
        @DisplayName("403 when authenticated as STUDENT")
        void wrongRole() throws Exception {
            mockMvc.perform(withJson(post("/api/manager/hostels/{hostelId}/rooms", HOSTEL_ID), validRequest)
                            .with(authentication(authFor(student("Lexa", "Doe")))))
                    .andExpect(status().isForbidden());
            verifyNoInteractions(roomService);
        }

        @Test
        @DisplayName("400 when roomNumber is missing")
        void missingRoomNumber() throws Exception {
            var invalid = new CreateRoomRequest(
                    null, RoomType.SINGLE, (short) 1, new BigDecimal("1500.00"),
                    "https://example.com/room.jpg", 1, List.of());

            mockMvc.perform(withJson(post("/api/manager/hostels/{hostelId}/rooms", HOSTEL_ID), invalid)
                            .with(authentication(authFor(manager("Kwame", "Mensah")))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.roomNumber[0]").value("Room number is required"));
        }

        @Test
        @DisplayName("400 when capacity exceeds the maximum of 20")
        void capacityTooHigh() throws Exception {
            var invalid = new CreateRoomRequest(
                    "A-101", RoomType.SINGLE, (short) 21, new BigDecimal("1500.00"),
                    "https://example.com/room.jpg", 1, List.of());

            mockMvc.perform(withJson(post("/api/manager/hostels/{hostelId}/rooms", HOSTEL_ID), invalid)
                            .with(authentication(authFor(manager("Kwame", "Mensah")))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.capacity[0]").value("Capacity must not exceed 20"));
        }

        @Test
        @DisplayName("201 for MANAGER on success")
        void managerSuccess() throws Exception {
            var manager = manager("Kwame", "Mensah");
            when(roomService.createRoom(eq(HOSTEL_ID), any(), eq(manager.getId())))
                    .thenReturn(minimalRoomDto());

            mockMvc.perform(withJson(post("/api/manager/hostels/{hostelId}/rooms", HOSTEL_ID), validRequest)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.message").value("Room created."));
        }

        @Test
        @DisplayName("403 for ADMIN — RESOLVED: @PreAuthorize was narrowed to hasRole('MANAGER') only, "
                + "so ADMIN is now consistently rejected here and at the assertManagerOwns level in "
                + "RoomServiceTest, instead of the two disagreeing as before")
        void adminNowRejectedAtControllerLevel() throws Exception {
            mockMvc.perform(withJson(post("/api/manager/hostels/{hostelId}/rooms", HOSTEL_ID), validRequest)
                            .with(authentication(authFor(admin("Ama", "Boateng")))))
                    .andExpect(status().isForbidden());
            verifyNoInteractions(roomService);
        }
    }

    // =========================================================================
    // updateStatus — PATCH /api/manager/rooms/{id}/status (MANAGER only)
    // =========================================================================

    @Nested
    @DisplayName("PATCH /api/manager/rooms/{id}/status")
    class UpdateStatus {

        @Test
        @DisplayName("400 when status is missing")
        void missingStatus() throws Exception {
            var invalid = new UpdateRoomStatusRequest(null);

            mockMvc.perform(withJson(patch("/api/manager/rooms/{id}/status", ROOM_ID), invalid)
                            .with(authentication(authFor(manager("Kwame", "Mensah")))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.status[0]").value("Status is required"));
        }

        @Test
        @DisplayName("200 on success")
        void success() throws Exception {
            var manager = manager("Kwame", "Mensah");
            var request = new UpdateRoomStatusRequest(RoomStatus.UNDER_MAINTENANCE);
            when(roomService.updateRoomStatus(ROOM_ID, RoomStatus.UNDER_MAINTENANCE, manager.getId()))
                    .thenReturn(minimalRoomDto());

            mockMvc.perform(withJson(patch("/api/manager/rooms/{id}/status", ROOM_ID), request)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Room status updated."));
        }
    }

    // =========================================================================
    // deleteRoom — DELETE /api/manager/rooms/{id}
    // =========================================================================

    @Nested
    @DisplayName("DELETE /api/manager/rooms/{id}")
    class DeleteRoom {

        @Test
        @DisplayName("403 when authenticated as STUDENT")
        void rejectsStudent() throws Exception {
            mockMvc.perform(delete("/api/manager/rooms/{id}", ROOM_ID)
                            .with(authentication(authFor(student("Lexa", "Doe")))))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("RESOLVED: 403 for ADMIN — RoomService.deleteRoom's misleading \"ADMIN only\" "
                + "Javadoc claim has since been removed, so the enforced hasRole('MANAGER') "
                + "behavior is no longer contradicted by stale documentation")
        void rejectsAdminAsIntended() throws Exception {
            // Originally flagged: RoomService.deleteRoom's Javadoc read "ADMIN only
            // (managers cannot delete rooms — they deactivate them)" while the actual
            // @PreAuthorize on this endpoint is hasRole('MANAGER') — the opposite of
            // the comment. The misleading claim has since been removed from the
            // Javadoc (it now only documents the active-bookings guard), leaving the
            // enforced MANAGER-only behavior as the single source of truth. Keeping
            // this test to confirm that enforced behavior directly.
            mockMvc.perform(delete("/api/manager/rooms/{id}", ROOM_ID)
                            .with(authentication(authFor(admin("Ama", "Boateng")))))
                    .andExpect(status().isForbidden());
            verifyNoInteractions(roomService);
        }

        @Test
        @DisplayName("200 for MANAGER")
        void managerSuccess() throws Exception {
            mockMvc.perform(delete("/api/manager/rooms/{id}", ROOM_ID)
                            .with(authentication(authFor(manager("Kwame", "Mensah")))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Room deleted."));
            verify(roomService).deleteRoom(ROOM_ID);
        }
    }

    // =========================================================================
    // getRoom — GET /api/rooms/{id} (public — permitAll in production)
    // =========================================================================

    @Nested
    @DisplayName("GET /api/rooms/{id}")
    class GetRoom {

        @Test
        @DisplayName("200 for an authenticated role too")
        void successAuthenticated() throws Exception {
            when(roomService.getRoomById(ROOM_ID)).thenReturn(minimalRoomDto());

            mockMvc.perform(get("/api/rooms/{id}", ROOM_ID)
                            .with(authentication(authFor(student("Lexa", "Doe")))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.roomNumber").value("A-101"));
        }

        @Test
        @DisplayName("404 when the room does not exist")
        void notFound() throws Exception {
            when(roomService.getRoomById(ROOM_ID))
                    .thenThrow(new ResourceNotFoundException("Room not found: " + ROOM_ID));

            mockMvc.perform(get("/api/rooms/{id}", ROOM_ID)
                            .with(authentication(authFor(student("Lexa", "Doe")))))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
        }

        @Test
        @DisplayName("200 even when unauthenticated — GET /api/rooms/** is public (permitAll)")
        void publiclyAccessible() throws Exception {
            when(roomService.getRoomById(ROOM_ID)).thenReturn(minimalRoomDto());

            mockMvc.perform(get("/api/rooms/{id}", ROOM_ID))
                    .andExpect(status().isOk());
        }
    }

    // =========================================================================
    // addAmenity — POST /api/manager/rooms/{id}/amenities (MANAGER only)
    // =========================================================================

    @Nested
    @DisplayName("POST /api/manager/rooms/{id}/amenities")
    class AddAmenity {

        @Test
        @DisplayName("400 when the amenity label is blank")
        void blankLabel() throws Exception {
            var invalid = new AmenityRequest("  ", null);

            mockMvc.perform(withJson(post("/api/manager/rooms/{id}/amenities", ROOM_ID), invalid)
                            .with(authentication(authFor(manager("Kwame", "Mensah")))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.amenity[0]").value("Amenity label is required"));
        }

        @Test
        @DisplayName("201 on success")
        void success() throws Exception {
            var manager = manager("Kwame", "Mensah");
            var request = new AmenityRequest("Wi-Fi", null);
            when(roomService.addAmenity(eq(ROOM_ID), any(), eq(manager.getId())))
                    .thenReturn(minimalRoomDto());

            mockMvc.perform(withJson(post("/api/manager/rooms/{id}/amenities", ROOM_ID), request)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.message").value("Amenity added."));
        }
    }
}
