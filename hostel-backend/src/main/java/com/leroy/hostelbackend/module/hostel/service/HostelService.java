package com.leroy.hostelbackend.module.hostel.service;

import com.leroy.hostelbackend.module.hostel.dto.*;
import com.leroy.hostelbackend.module.hostel.mapper.HostelMapper;
import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.hostel.repository.HostelRepository;
import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.model.UserRole;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.shared.exception.HostelAccessDeniedException;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Application service for hostel management.
 *
 * <p><strong>Access rules:</strong>
 * <ul>
 *   <li>ADMIN — full CRUD, create/assign managers.</li>
 *   <li>MANAGER — can view and update their own assigned hostels only.</li>
 *   <li>STUDENT — read-only (active hostels only).</li>
 * </ul>
 *
 * <p>Role guards on write operations are enforced via {@code @PreAuthorize} on the
 * controller methods. The service additionally verifies manager ownership via
 * {@link #assertManagerOwns(UUID, UUID)}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HostelService {

    private final HostelRepository hostelRepository;
    private final UserRepository   userRepository;
    private final HostelMapper     hostelMapper;

    // -------------------------------------------------------------------------
    // Public / Student reads
    // -------------------------------------------------------------------------

    /**
     * Paginated list of active hostels. Open to all authenticated users.
     *
     * @param pageable page/sort params from the controller
     * @return page of {@link HostelSummaryDto}
     */
    @Transactional(readOnly = true)
    public Page<HostelSummaryDto> listActiveHostels(Pageable pageable) {
        return hostelRepository.findAllActiveWithManager(pageable)
                .map(hostelMapper::toSummaryDto);
    }

    /**
     * Full hostel detail for any active hostel. Open to all authenticated users.
     *
     * @param hostelId the hostel UUID
     * @return full {@link HostelDto} with manager summary and coordinates
     */
    @Transactional(readOnly = true)
    public HostelDto getHostelById(UUID hostelId) {
        var hostel = requireHostel(hostelId);
        return buildHostelDto(hostel);
    }

    // -------------------------------------------------------------------------
    // Admin reads
    // -------------------------------------------------------------------------

    /**
     * Admin-only paginated list of ALL hostels (active + inactive).
     */
    @Transactional(readOnly = true)
    public Page<HostelSummaryDto> listAllHostels(Pageable pageable) {
        return hostelRepository.findAllWithManager(pageable)
                .map(hostelMapper::toSummaryDto);
    }

    /**
     * All hostels assigned to a specific manager (admin view).
     */
    @Transactional(readOnly = true)
    public Page<HostelSummaryDto> listHostelsByManager(UUID managerId, Pageable pageable) {
        return hostelRepository.findByManagerId(managerId, pageable)
                .map(hostelMapper::toSummaryDto);
    }

    // -------------------------------------------------------------------------
    // Admin writes
    // -------------------------------------------------------------------------

    /**
     * Creates a new hostel. Admin only.
     *
     * @param request validated creation payload
     * @return the persisted hostel as a {@link HostelDto}
     * @throws IllegalArgumentException if the name is already in use
     */
    @Transactional
    public HostelDto createHostel(CreateHostelRequest request) {
        if (hostelRepository.existsByNameIgnoreCase(request.name())) {
            throw new IllegalArgumentException("A hostel with the name '" + request.name() + "' already exists.");
        }

        var hostel = Hostel.createHostel(request);

        // Assign manager if provided
        if (request.managerId() != null) {
            var manager = requireManager(request.managerId());
            hostel.setManager(manager);
        }

        // PostGIS location — set if both coordinates provided
        if (request.latitude() != null && request.longitude() != null) {
            hostel.setLocation(buildPoint(request.latitude(), request.longitude()));
        }

        var saved = hostelRepository.save(hostel);
        log.info("Hostel created: id={}, name={}", saved.getId(), saved.getName());
        return buildHostelDto(saved);
    }



    /**
     * Updates hostel details. Admin only. Patch semantics — null fields are ignored.
     *
     * @param hostelId the hostel to update
     * @param request  partial update payload
     * @return updated {@link HostelDto}
     */
    @Transactional
    public HostelDto updateHostel(UUID hostelId, UpdateHostelRequest request) {
        var hostel = requireHostel(hostelId);

        if (request.name()         != null) hostel.setName(request.name().trim());
        if (request.address()      != null) hostel.setAddress(request.address().trim());
        if (request.description()  != null) hostel.setDescription(request.description());
        if (request.genderPolicy() != null) hostel.setGenderPolicy(request.genderPolicy());
        if (request.imageUrl()     != null) hostel.setImageUrl(request.imageUrl());
        if (request.latitude() != null && request.longitude() != null) {
            hostel.setLocation(buildPoint(request.latitude(), request.longitude()));
        }

        log.info("Hostel updated: id={}", hostelId);
        return buildHostelDto(hostelRepository.save(hostel));
    }

    /**
     * Assigns or reassigns a manager to a hostel. Admin only.
     *
     * @param hostelId the hostel UUID
     * @param request  contains the manager's UUID
     * @return updated {@link HostelDto}
     * @throws IllegalArgumentException if the target user is not a MANAGER
     */
    @Transactional
    public HostelDto assignManager(UUID hostelId, AssignManagerRequest request) {
        var hostel  = requireHostel(hostelId);
        var manager = requireManager(request.managerId());

        hostel.setManager(manager);
        log.info("Manager {} assigned to hostel {}", manager.getId(), hostelId);
        return buildHostelDto(hostelRepository.save(hostel));
    }

    /**
     * Removes the manager assignment from a hostel (sets manager to null). Admin only.
     */
    @Transactional
    public HostelDto unassignManager(UUID hostelId) {
        var hostel = requireHostel(hostelId);
        hostel.setManager(null);
        log.info("Manager unassigned from hostel {}", hostelId);
        return buildHostelDto(hostelRepository.save(hostel));
    }

    /**
     * Soft-deletes (deactivates) a hostel. Admin only.
     */
    @Transactional
    public void deactivateHostel(UUID hostelId) {
        var hostel = requireHostel(hostelId);
        hostel.setIsActive(false);
        hostelRepository.save(hostel);
        log.info("Hostel deactivated: id={}", hostelId);
    }

    /**
     * Re-activates a previously deactivated hostel. Admin only.
     */
    @Transactional
    public HostelDto activateHostel(UUID hostelId) {
        var hostel = requireHostel(hostelId);
        hostel.setIsActive(true);
        return buildHostelDto(hostelRepository.save(hostel));
    }

    // -------------------------------------------------------------------------
    // Manager writes (own hostel only)
    // -------------------------------------------------------------------------

    /**
     * Allows a manager to update basic details of their own hostel.
     * Managers cannot change gender policy, image, or manager assignment.
     *
     * @param hostelId  the hostel to update
     * @param request   partial update payload
     * @param managerId the requesting manager's UUID (from security context)
     */
    @Transactional
    public HostelDto managerUpdateHostel(UUID hostelId, UpdateHostelRequest request, UUID managerId) {
        assertManagerOwns(hostelId, managerId);
        return updateHostel(hostelId, request);
    }

    // -------------------------------------------------------------------------
    // Package-visible guard (used by RoomService)
    // -------------------------------------------------------------------------

    /**
     * Throws {@link HostelAccessDeniedException} if the manager is not assigned to
     * the specified hostel. Called by {@link com.leroy.hostelbackend.module.room.service.RoomService}
     * before any room mutation.
     *
     * @param hostelId  the hostel being accessed
     * @param managerId the manager requesting access
     */
    public void assertManagerOwns(UUID hostelId, UUID managerId) {
        var hostel = requireHostel(hostelId);
        if (hostel.getManager() == null || !hostel.getManager().getId().equals(managerId)) {
            throw new HostelAccessDeniedException("You don't have permission access this hostel");
        }
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private Hostel requireHostel(UUID id) {
        return hostelRepository.findByIdWithManager(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hostel not found: " + id));
    }

    private User requireManager(UUID managerId) {
        var user = userRepository.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + managerId));
        if (user.getRole() != UserRole.MANAGER) {
            throw new IllegalArgumentException("User " + managerId + " does not have the MANAGER role.");
        }
        return user;
    }

    /**
     * Builds a {@link HostelDto} from a {@link Hostel}, extracting lat/lon cleanly.
     */
    private HostelDto buildHostelDto(Hostel hostel) {
        var dto = hostelMapper.toDto(hostel);

        Double lat = null;
        Double lon = null;

        // No more 'instanceof Object' checks required!
        if (hostel.getLocation() != null) {
            lat = hostel.getLocation().getY();  // PostGIS: Y = latitude
            lon = hostel.getLocation().getX();  // PostGIS: X = longitude
        }

        return new HostelDto(
                dto.id(), dto.name(), dto.address(), dto.description(),
                dto.genderPolicy(), dto.imageUrl(), dto.isActive(),
                lat, lon, dto.manager(),
                dto.createdAt(), dto.updatedAt()
        );
    }

    /**
     * Builds a JTS {@code Point} for Hibernate Spatial from lat/lon values.
     * SRID 4326 = WGS 84 (standard GPS coordinates).
     */
    private Point buildPoint(double lat, double lon) {
        var factory = new GeometryFactory(
                new PrecisionModel(),
                4326
        );
        return factory.createPoint(new Coordinate(lon, lat));
    }
}