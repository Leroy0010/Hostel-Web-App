package com.leroy.hostelbackend.module.booking.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leroy.hostelbackend.module.booking.dto.ActionBookingRequest;
import com.leroy.hostelbackend.module.booking.dto.BookingDto;
import com.leroy.hostelbackend.module.booking.dto.CreateBookingRequest;
import com.leroy.hostelbackend.module.booking.dto.SubmitPaymentRequest;
import com.leroy.hostelbackend.module.booking.service.BookingService;
import com.leroy.hostelbackend.module.booking.service.BookingServiceTest;
import com.leroy.hostelbackend.shared.exception.GlobalExceptionHandler;
import com.leroy.hostelbackend.shared.exception.HostelAccessDeniedException;
import com.leroy.hostelbackend.shared.exception.InvalidBookingTransitionException;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import com.leroy.hostelbackend.shared.exception.RoomFullyOccupiedException;
import com.leroy.hostelbackend.config.JacksonConfig;
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
import java.util.UUID;

import static com.leroy.hostelbackend.testsupport.TestFixtures.*;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * {@code @WebMvcTest} slice tests for {@link BookingController}.
 *
 * <p>Three distinct things are under test here, deliberately kept separate
 * from the pure {@link BookingServiceTest}
 * unit tests:
 * <ol>
 *   <li><strong>{@code @PreAuthorize} role enforcement</strong> — is this
 *       endpoint actually gated to the role its Javadoc claims? See
 *       {@link MethodSecurityTestConfig} for how this is wired without the
 *       production JWT filter.</li>
 *   <li><strong>Request validation</strong> — do the {@code @NotBlank}/
 *       {@code @Pattern}/{@code @DecimalMin} annotations on the request DTOs
 *       actually reject bad input before it reaches the service?</li>
 *   <li><strong>{@link GlobalExceptionHandler} mapping</strong> — does each
 *       service-thrown exception surface as the HTTP status the handler's
 *       own Javadoc promises?</li>
 * </ol>
 *
 * <p>{@link BookingService} is mocked — this class never touches real
 * business logic, only the web layer wrapped around it.
 */
@WebMvcTest(controllers = BookingController.class)
@Import({MethodSecurityTestConfig.class, JacksonConfig.class})
class BookingControllerTest {

    @Autowired private MockMvc mockMvc;
    // Constructed locally rather than @Autowired: this project's @WebMvcTest
    // slice does not reliably expose a Spring-managed ObjectMapper bean (likely
    // a gap in how the newer modular *-test starters compose Jackson
    // autoconfiguration for MockMvc slices here). A plain ObjectMapper with
    // auto-discovered modules (e.g. jackson-datatype-jsr310, definitely on the
    // classpath) is all that's needed to serialize these request DTOs to JSON.
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    @MockitoBean private BookingService bookingService;

    // JwtAuthenticationFilter is @Component-annotated, so @WebMvcTest auto-detects
    // and wires it into the filter chain regardless of which security config is
    // @Import-ed — these mocks exist purely to satisfy its constructor. They're
    // never stubbed/invoked here: every test below either sends no Authorization
    // header (the filter's no-op passthrough path) or authenticates via
    // SecurityMockMvcRequestPostProcessors, which pre-seeds the SecurityContext
    // before the chain runs — the filter's own "already authenticated" check
    // (see JwtAuthenticationFilterTest) means it never reaches these either way.
    @MockitoBean private com.leroy.hostelbackend.module.auth.security.JwtService jwtService;
    @MockitoBean private com.leroy.hostelbackend.module.user.repository.UserRepository userRepository;

    private static final UUID ROOM_ID = UUID.randomUUID();
    private static final UUID BOOKING_ID = UUID.randomUUID();

    private MockHttpServletRequestBuilder withJson(MockHttpServletRequestBuilder builder, Object body)
            throws Exception {
        return builder.contentType("application/json").content(objectMapper.writeValueAsString(body));
    }

    // =========================================================================
    // createBooking — POST /api/bookings (STUDENT only)
    // =========================================================================

    @Nested
    @DisplayName("POST /api/bookings")
    class CreateBooking {

        private final CreateBookingRequest validRequest =
                new CreateBookingRequest(ROOM_ID, "2025/2026", "FIRST");

        @Test
        @DisplayName("401 when no authentication is present")
        void unauthenticated() throws Exception {
            mockMvc.perform(withJson(post("/api/bookings"), validRequest))
                    .andExpect(status().isUnauthorized());
            verifyNoInteractions(bookingService);
        }

        @Test
        @DisplayName("403 when authenticated as MANAGER instead of STUDENT")
        void wrongRole() throws Exception {
            mockMvc.perform(withJson(post("/api/bookings"), validRequest)
                            .with(authentication(authFor(manager("Kwame", "Mensah")))))
                    .andExpect(status().isForbidden());
            verifyNoInteractions(bookingService);
        }

        @Test
        @DisplayName("400 when roomId is missing")
        void missingRoomId() throws Exception {
            var invalid = new CreateBookingRequest(null, "2025/2026", "FIRST");
            var student = student("Lexa", "Doe");

            mockMvc.perform(withJson(post("/api/bookings"), invalid)
                            .with(authentication(authFor(student))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                    .andExpect(jsonPath("$.details.roomId[0]").value("Room ID is required"));
            verifyNoInteractions(bookingService);
        }

        @Test
        @DisplayName("400 when academicYear does not match YYYY/YYYY")
        void malformedAcademicYear() throws Exception {
            var invalid = new CreateBookingRequest(ROOM_ID, "25/26", "FIRST");
            var student = student("Lexa", "Doe");

            mockMvc.perform(withJson(post("/api/bookings"), invalid)
                            .with(authentication(authFor(student))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.academicYear[0]")
                            .value(containsString("YYYY/YYYY")));
        }

        @Test
        @DisplayName("201 with the created booking on success")
        void success() throws Exception {
            var student = student("Lexa", "Doe");
            when(bookingService.createBooking(eq(student.getId()), any(CreateBookingRequest.class)))
                    .thenReturn(minimalBookingDto());

            mockMvc.perform(withJson(post("/api/bookings"), validRequest)
                            .with(authentication(authFor(student))))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Booking request submitted successfully."))
                    .andExpect(jsonPath("$.data.id").value(BOOKING_ID.toString()));
        }

        @Test
        @DisplayName("409 when the service reports the room is fully occupied")
        void roomFullyOccupied() throws Exception {
            var student = student("Lexa", "Doe");
            when(bookingService.createBooking(any(), any()))
                    .thenThrow(new RoomFullyOccupiedException("A12"));

            mockMvc.perform(withJson(post("/api/bookings"), validRequest)
                            .with(authentication(authFor(student))))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("ROOM_FULLY_OCCUPIED"));
        }
    }

    // =========================================================================
    // cancelBooking — DELETE /api/bookings/{id}/cancel (STUDENT only)
    // =========================================================================

    @Nested
    @DisplayName("DELETE /api/bookings/{id}/cancel")
    class CancelBooking {

        @Test
        @DisplayName("200 on successful cancellation")
        void success() throws Exception {
            var student = student("Lexa", "Doe");
            when(bookingService.cancelBooking(BOOKING_ID, student.getId()))
                    .thenReturn(minimalBookingDto());

            mockMvc.perform(delete("/api/bookings/{id}/cancel", BOOKING_ID)
                            .with(authentication(authFor(student))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Booking cancelled."));
        }

        @Test
        @DisplayName("403 when the service reports the caller doesn't own this booking")
        void notOwner() throws Exception {
            var student = student("Lexa", "Doe");
            when(bookingService.cancelBooking(any(), any()))
                    .thenThrow(new HostelAccessDeniedException("You can only cancel your own bookings."));

            mockMvc.perform(delete("/api/bookings/{id}/cancel", BOOKING_ID)
                            .with(authentication(authFor(student))))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        @DisplayName("409 when the booking is not in a cancellable state")
        void invalidTransition() throws Exception {
            var student = student("Lexa", "Doe");
            when(bookingService.cancelBooking(any(), any()))
                    .thenThrow(new InvalidBookingTransitionException("CHECKED_IN", "CANCELLED"));

            mockMvc.perform(delete("/api/bookings/{id}/cancel", BOOKING_ID)
                            .with(authentication(authFor(student))))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("INVALID_BOOKING_TRANSITION"));
        }
    }

    // =========================================================================
    // submitPayment — POST /api/bookings/{id}/payment (STUDENT only)
    // =========================================================================

    @Nested
    @DisplayName("POST /api/bookings/{id}/payment")
    class SubmitPayment {

        @Test
        @DisplayName("400 when amountPaid is zero")
        void rejectsZeroAmount() throws Exception {
            var student = student("Lexa", "Doe");
            var invalid = new SubmitPaymentRequest("MOMO-REF-1", BigDecimal.ZERO);

            mockMvc.perform(withJson(post("/api/bookings/{id}/payment", BOOKING_ID), invalid)
                            .with(authentication(authFor(student))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.amountPaid[0]")
                            .value(containsString("greater than 0")));
        }

        @Test
        @DisplayName("400 when paymentRef is blank")
        void rejectsBlankReference() throws Exception {
            var student = student("Lexa", "Doe");
            var invalid = new SubmitPaymentRequest("", new BigDecimal("100"));

            mockMvc.perform(withJson(post("/api/bookings/{id}/payment", BOOKING_ID), invalid)
                            .with(authentication(authFor(student))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.paymentRef[0]")
                            .value("Payment reference is required"));
        }

        @Test
        @DisplayName("200 on a valid submission")
        void success() throws Exception {
            var student = student("Lexa", "Doe");
            var valid = new SubmitPaymentRequest("MOMO-REF-1", new BigDecimal("1500.00"));
            when(bookingService.submitPayment(eq(BOOKING_ID), eq(student.getId()), any()))
                    .thenReturn(minimalBookingDto());

            mockMvc.perform(withJson(post("/api/bookings/{id}/payment", BOOKING_ID), valid)
                            .with(authentication(authFor(student))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Payment reference submitted."));
        }
    }

    // =========================================================================
    // actionBooking — POST /api/manager/bookings/{id}/action (MANAGER only)
    // =========================================================================

    @Nested
    @DisplayName("POST /api/manager/bookings/{id}/action")
    class ActionBooking {

        @Test
        @DisplayName("403 when authenticated as STUDENT instead of MANAGER")
        void wrongRole() throws Exception {
            var request = new ActionBookingRequest(true, null, 48);
            mockMvc.perform(withJson(post("/api/manager/bookings/{id}/action", BOOKING_ID), request)
                            .with(authentication(authFor(student("Lexa", "Doe")))))
                    .andExpect(status().isForbidden());
            verifyNoInteractions(bookingService);
        }

        @Test
        @DisplayName("200 with an \"approved\" message when approved=true")
        void approveMessage() throws Exception {
            var manager = manager("Kwame", "Mensah");
            var request = new ActionBookingRequest(true, null, 48);
            when(bookingService.actionBooking(eq(BOOKING_ID), eq(manager.getId()), any()))
                    .thenReturn(minimalBookingDto());

            mockMvc.perform(withJson(post("/api/manager/bookings/{id}/action", BOOKING_ID), request)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Booking approved."));
        }

        @Test
        @DisplayName("200 with a \"rejected\" message when approved=false")
        void rejectMessage() throws Exception {
            var manager = manager("Kwame", "Mensah");
            var request = new ActionBookingRequest(false, "Room reassigned.", null);
            when(bookingService.actionBooking(eq(BOOKING_ID), eq(manager.getId()), any()))
                    .thenReturn(minimalBookingDto());

            mockMvc.perform(withJson(post("/api/manager/bookings/{id}/action", BOOKING_ID), request)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Booking rejected."));
        }

        @Test
        @DisplayName("400 when the decision (approved) field is missing")
        void missingDecision() throws Exception {
            var manager = manager("Kwame", "Mensah");
            var invalid = new ActionBookingRequest(null, null, 48);

            mockMvc.perform(withJson(post("/api/manager/bookings/{id}/action", BOOKING_ID), invalid)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.approved[0]")
                            .value("Decision (approved: true/false) is required"));
        }

        @Test
        @DisplayName("400 when gracePeriodHours exceeds the 720-hour maximum")
        void gracePeriodTooLong() throws Exception {
            var manager = manager("Kwame", "Mensah");
            var invalid = new ActionBookingRequest(true, null, 721);

            mockMvc.perform(withJson(post("/api/manager/bookings/{id}/action", BOOKING_ID), invalid)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.gracePeriodHours[0]")
                            .value(containsString("720 hours")));
        }

        @Test
        @DisplayName("409 when the booking is no longer PENDING")
        void notPending() throws Exception {
            var manager = manager("Kwame", "Mensah");
            var request = new ActionBookingRequest(true, null, 48);
            when(bookingService.actionBooking(any(), any(), any()))
                    .thenThrow(new InvalidBookingTransitionException(
                            "Cannot action a booking that is not PENDING."));

            mockMvc.perform(withJson(post("/api/manager/bookings/{id}/action", BOOKING_ID), request)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("INVALID_BOOKING_TRANSITION"));
        }

        @Test
        @DisplayName("400 when the service rejects a blank rejection reason (IllegalArgumentException)")
        void blankRejectionReasonFromService() throws Exception {
            var manager = manager("Kwame", "Mensah");
            var request = new ActionBookingRequest(false, "   ", null);
            when(bookingService.actionBooking(any(), any(), any()))
                    .thenThrow(new IllegalArgumentException("A rejection reason is required."));

            mockMvc.perform(withJson(post("/api/manager/bookings/{id}/action", BOOKING_ID), request)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("ILLEGAL_ARGUMENT"))
                    .andExpect(jsonPath("$.message").value("A rejection reason is required."));
        }
    }

    // =========================================================================
    // checkIn / checkOut — POST /api/manager/bookings/{id}/checkin|checkout
    // =========================================================================

    @Nested
    @DisplayName("POST /api/manager/bookings/{id}/checkin and /checkout")
    class CheckInOut {

        @Test
        @DisplayName("checkIn: 404 when the booking id does not exist")
        void checkInNotFound() throws Exception {
            var manager = manager("Kwame", "Mensah");
            when(bookingService.checkIn(any(), any()))
                    .thenThrow(new ResourceNotFoundException("Booking", BOOKING_ID));

            mockMvc.perform(post("/api/manager/bookings/{id}/checkin", BOOKING_ID)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
        }

        @Test
        @DisplayName("checkIn: 200 on success")
        void checkInSuccess() throws Exception {
            var manager = manager("Kwame", "Mensah");
            when(bookingService.checkIn(BOOKING_ID, manager.getId())).thenReturn(minimalBookingDto());

            mockMvc.perform(post("/api/manager/bookings/{id}/checkin", BOOKING_ID)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Student checked in."));
        }

        @Test
        @DisplayName("checkOut: 403 when authenticated as STUDENT")
        void checkOutWrongRole() throws Exception {
            mockMvc.perform(post("/api/manager/bookings/{id}/checkout", BOOKING_ID)
                            .with(authentication(authFor(student("Lexa", "Doe")))))
                    .andExpect(status().isForbidden());
            verifyNoInteractions(bookingService);
        }

        @Test
        @DisplayName("checkOut: 200 on success")
        void checkOutSuccess() throws Exception {
            var manager = manager("Kwame", "Mensah");
            when(bookingService.checkOut(BOOKING_ID, manager.getId())).thenReturn(minimalBookingDto());

            mockMvc.perform(post("/api/manager/bookings/{id}/checkout", BOOKING_ID)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Student checked out."));
        }
    }

    // =========================================================================
    // getBooking — GET /api/bookings/{id} (any authenticated role; ownership
    // enforced inside the service, but the controller must compute the
    // "privileged" flag correctly per role before delegating)
    // =========================================================================

    @Nested
    @DisplayName("GET /api/bookings/{id}")
    class GetBooking {

        @Test
        @DisplayName("passes privileged=false for a STUDENT caller")
        void studentIsNotPrivileged() throws Exception {
            var student = student("Lexa", "Doe");
            when(bookingService.getBookingById(eq(BOOKING_ID), eq(student.getId()), eq(false)))
                    .thenReturn(minimalBookingDto());

            mockMvc.perform(get("/api/bookings/{id}", BOOKING_ID)
                            .with(authentication(authFor(student))))
                    .andExpect(status().isOk());

            verify(bookingService).getBookingById(BOOKING_ID, student.getId(), false);
        }

        @Test
        @DisplayName("passes privileged=true for a MANAGER caller")
        void managerIsPrivileged() throws Exception {
            var manager = manager("Kwame", "Mensah");
            when(bookingService.getBookingById(eq(BOOKING_ID), eq(manager.getId()), eq(true)))
                    .thenReturn(minimalBookingDto());

            mockMvc.perform(get("/api/bookings/{id}", BOOKING_ID)
                            .with(authentication(authFor(manager))))
                    .andExpect(status().isOk());

            verify(bookingService).getBookingById(BOOKING_ID, manager.getId(), true);
        }

        @Test
        @DisplayName("401 when unauthenticated")
        void unauthenticated() throws Exception {
            mockMvc.perform(get("/api/bookings/{id}", BOOKING_ID))
                    .andExpect(status().isUnauthorized());
        }
    }

    /** A minimal, valid {@link BookingDto} for endpoints that only need *a* response body. */
    private static BookingDto minimalBookingDto() {
        return new BookingDto(
                BOOKING_ID,
                new BookingDto.StudentSummary(UUID.randomUUID(), "Lexa", "Doe", "lexa.doe@ucc.edu.gh"),
                new BookingDto.RoomSummary(ROOM_ID, "A12", "DOUBLE", UUID.randomUUID(), "Leroy Hostel"),
                "PENDING",
                "2025/2026",
                "FIRST",
                false,
                LocalDateTime.now(),
                null, null, null, null, null, null, null, null, null, null,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }
}
