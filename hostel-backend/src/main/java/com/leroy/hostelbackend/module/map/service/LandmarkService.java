package com.leroy.hostelbackend.module.map.service;

import com.leroy.hostelbackend.module.hostel.repository.HostelRepository;
import com.leroy.hostelbackend.module.map.specification.LandmarkSpecification;
import com.leroy.hostelbackend.module.map.dto.*;
import com.leroy.hostelbackend.module.map.mapper.LandmarkMapper;
import com.leroy.hostelbackend.module.map.model.Landmark;
import com.leroy.hostelbackend.module.map.model.LandmarkCategory;
import com.leroy.hostelbackend.module.map.repository.LandmarkRepository;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

/**
 * Manages campus landmarks and PostGIS distance calculations.
 *
 * <p><strong>Distance calculation:</strong> All distance queries use the native
 * {@code ST_Distance(...::geography, ...::geography)} PostGIS function which
 * returns metres along the surface of the earth (geodetic distance). This is
 * more accurate than flat Cartesian distance, especially important near the
 * equator where UCC is located.
 *
 * <p><strong>Walking time estimate:</strong> Assumes an average walking speed of
 * 5 km/h (83.3 m/min), rounded up to the nearest minute.
 *
 * <p><strong>Coordinate extraction:</strong> JTS {@code Point} stores coordinates
 * as {@code (X=longitude, Y=latitude)} — the opposite of the intuitive lat/lon
 * order. Always use {@code point.getY()} for latitude and {@code point.getX()}
 * for longitude.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LandmarkService {

    private static final double WALKING_SPEED_MPS = 5000.0 / 60.0; // 5 km/h in metres/min
    private static final int    SRID              = 4326;
    private static final float DEFAULT_NEARBY_RADIUS_METRES = 1000.0F;

    private final LandmarkRepository landmarkRepository;
    private final HostelRepository   hostelRepository;
    private final LandmarkMapper     landmarkMapper;

    // -------------------------------------------------------------------------
    // Read operations — open to all authenticated users
    // -------------------------------------------------------------------------

    /**
     * All landmarks for the campus map initial load.
     * Sorted alphabetically for consistent display.
     */
    @Transactional(readOnly = true)
    public List<LandmarkDto> getAllLandmarks(LandmarkCategory category, String search) {
        Specification<Landmark> spec = LandmarkSpecification.filterLandmarks(category != null ? category.name() : null, search);
        return landmarkRepository.findAll(spec)
                .stream()
                .map(this::buildLandmarkDto)
                .toList();
    }



    /**
     * Single landmark detail by UUID.
     */
    @Transactional(readOnly = true)
    public LandmarkDto getLandmarkById(UUID landmarkId) {
        return buildLandmarkDto(requireLandmark(landmarkId));
    }

    /**
     * Calculates the straight-line distance between a hostel and a landmark.
     *
     * <p>Returns a {@link DistanceDto} with:
     * <ul>
     *   <li>Raw distance in metres</li>
     *   <li>Distance in kilometres (2 dp)</li>
     *   <li>Estimated walking time in minutes (rounded up, at 5 km/h)</li>
     * </ul>
     *
     * @param hostelId   UUID of the hostel
     * @param landmarkId UUID of the landmark
     * @throws IllegalStateException if either the hostel or landmark has no coordinates set
     */
    @Transactional(readOnly = true)
    public DistanceDto calculateDistance(UUID hostelId, UUID landmarkId) {
        var hostel   = hostelRepository.findByIdWithManager(hostelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hostel not found: " + hostelId));
        var landmark = requireLandmark(landmarkId);

        Double metres = landmarkRepository.calculateDistanceMetres(hostelId, landmarkId);
        if (metres == null) {
            throw new IllegalStateException(
                    "Cannot calculate distance — one or both locations are not set. " +
                            "Ensure the hostel and landmark both have coordinates.");
        }

        return buildDistanceDto(hostel.getName(), hostelId, landmark.getName(), landmarkId, metres);
    }


    /**
     * All landmarks within a given radius of a hostel, nearest first.<p>
     * Useful for the "nearby landmarks" section on the hostel detail page.<p>
     * High-Performance Fix: Now runs without N+1 queries<p>
     * and filters out self-references on the database layer.
     *
     * @param hostelId     the reference hostel
     * @param radiusMetres search radius in metres (default 1000 m = 1 km)
     */
    @Transactional(readOnly = true)
    public List<NearbyLandmarkDto> getNearbyLandmarks(UUID hostelId, double radiusMetres) {
        if (!hostelRepository.existsById(hostelId)) {
            throw new ResourceNotFoundException("Hostel not found: " + hostelId);
        }

        // Single DB roundtrip fetches data coordinates and spatial calculations transparently
        return landmarkRepository.findNearbyLandmarksWithDistance(hostelId, radiusMetres)
                .stream()
                .map(result -> {
                    double dist = result.getDistanceMetres() != null ? result.getDistanceMetres() : 0.0;

                    // Directly map properties from the flat projection layer
                    var landmarkDto = new LandmarkDto(
                            result.getId(),
                            result.getName(),
                            result.getCategory().name(),
                            result.getLatitude(),
                            result.getLongitude(),
                            result.getDescription(),
                            result.getHostelId()
                    );

                    return new NearbyLandmarkDto(
                            landmarkDto,
                            round2dp(dist),
                            round2dp(dist / DEFAULT_NEARBY_RADIUS_METRES),
                            walkingMinutes(dist)
                    );
                })
                .toList();
    }

    // -------------------------------------------------------------------------
    // Admin writes
    // -------------------------------------------------------------------------

    /**
     * Creates a new campus landmark. ADMIN only.
     *
     * @param request validated creation payload
     * @throws IllegalArgumentException if a landmark with the same name and category already exists
     */
    @Transactional
    public LandmarkDto createLandmark(CreateLandmarkRequest request) {
        if (landmarkRepository.existsByNameIgnoreCaseAndCategory(request.name(), request.category())) {
            throw new IllegalArgumentException(
                    "A " + request.category().name() + " landmark named '" + request.name() + "' already exists.");
        }

        var landmark = new Landmark();
        landmark.setName(request.name().trim());
        landmark.setCategory(request.category());
        landmark.setDescription(request.description());

        // Evaluate coordinate synchronization rules
        if (request.hostelId() != null) {
            var hostelRef = hostelRepository.findById(request.hostelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Linked hostel not found: " + request.hostelId()));

            landmark.setHostel(hostelRef);

            if (hostelRef.getLocation() != null) {
                // Scenario 1: Hostel already has a location -> Snap landmark to match it perfectly
                landmark.setLocation(hostelRef.getLocation());
                log.info("Landmark '{}' coordinates snapped to existing Hostel location.", request.name());
            } else {
                // Scenario 2: Hostel has NO location -> Use provided coords to update BOTH records
                Point providedLocation = buildPoint(request.latitude(), request.longitude());
                landmark.setLocation(providedLocation);

                hostelRef.setLocation(providedLocation);
                hostelRepository.save(hostelRef); // Flushes the location back to the hostels table
                log.info("Hostel '{}' was missing coordinates. Back-populated from landmark entry.", hostelRef.getName());
            }
        } else {
            // Standard landmark with no linked hostel (e.g., Cafeteria, Science Lab)
            landmark.setLocation(buildPoint(request.latitude(), request.longitude()));
        }

        var saved = landmarkRepository.save(landmark);
        return buildLandmarkDto(saved);
    }

    /**
     * Updates landmark details. ADMIN only. Patch semantics — null fields ignored.
     *
     * @param landmarkId UUID of the landmark to update
     * @param request    partial update payload
     */
    @Transactional
    public LandmarkDto updateLandmark(UUID landmarkId, UpdateLandmarkRequest request) {
        var landmark = requireLandmark(landmarkId);

        if (request.name()        != null) landmark.setName(request.name().trim());
        if (request.category()    != null) landmark.setCategory(request.category());
        if (request.description() != null) landmark.setDescription(request.description());

        // Standard fallback coordinate tracking
        Point manualPoint = (request.latitude() != null && request.longitude() != null)
                ? buildPoint(request.latitude(), request.longitude())
                : null;

        if (request.hostelId() != null) {
            var hostelRef = hostelRepository.findById(request.hostelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Linked hostel not found: " + request.hostelId()));
            landmark.setHostel(hostelRef);

            if (hostelRef.getLocation() != null) {
                // Enforce snapping on update
                landmark.setLocation(hostelRef.getLocation());
            } else if (manualPoint != null) {
                // If the hostel is blank, fill it using manual coordinates passed in the update
                landmark.setLocation(manualPoint);
                hostelRef.setLocation(manualPoint);
                hostelRepository.save(hostelRef);
            }
        } else if (manualPoint != null) {
            // No hostel linked, standard manual coordinate override
            landmark.setLocation(manualPoint);
        }

        var saved = landmarkRepository.save(landmark);
        return buildLandmarkDto(saved);
    }

    /**
     * Permanently deletes a landmark. ADMIN only.
     */
    @Transactional
    public void deleteLandmark(UUID landmarkId) {
        var landmark = requireLandmark(landmarkId);
        landmarkRepository.delete(landmark);
        log.info("Landmark deleted: id={}", landmarkId);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private Landmark requireLandmark(UUID id) {
        return landmarkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Landmark not found: " + id));
    }

    /**
     * Builds a {@link LandmarkDto} from a {@link Landmark} entity, extracting
     * lat/lon from the JTS Point.
     *
     * <p>JTS coordinate order: X = longitude, Y = latitude. This is the opposite
     * of the intuitive (lat, lon) order — be careful not to swap them.
     */
    private LandmarkDto buildLandmarkDto(Landmark landmark) {
        var base = landmarkMapper.toDto(landmark);
        Double lat = null, lon = null;
        if (landmark.getLocation() != null) {
            lat = landmark.getLocation().getY(); // Y = latitude
            lon = landmark.getLocation().getX(); // X = longitude
        }

        // Ensure your LandmarkDto signature supports returning the hostelId to the frontend
        UUID linkedHostelId = (landmark.getHostel() != null) ? landmark.getHostel().getId() : null;

        return new LandmarkDto(base.id(), base.name(), base.category(), lat, lon, base.description(), linkedHostelId);
    }

    /**
     * Builds a {@link DistanceDto} from raw distance in metres.
     * Walking time is estimated at 5 km/h and rounded up to the nearest minute.
     */
    private DistanceDto buildDistanceDto(String hostelName, UUID hostelId,
                                         String landmarkName, UUID landmarkId,
                                         double metres) {
        return new DistanceDto(
                hostelId, hostelName,
                landmarkId, landmarkName,
                round2dp(metres),
                round2dp(metres / DEFAULT_NEARBY_RADIUS_METRES),
                walkingMinutes(metres)
        );
    }

    /**
     * Estimated walking time in minutes at 5 km/h, always rounded up.
     * A distance of 0 m returns 0 minutes.
     */
    private int walkingMinutes(double metres) {
        if (metres <= 0) return 0;
        return (int) Math.ceil(metres / WALKING_SPEED_MPS);
    }

    private double round2dp(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    /**
     * Constructs a JTS {@link Point} with SRID 4326.
     * Note: GeometryFactory takes (longitude, latitude) as (X, Y).
     */
    private Point buildPoint(double latitude, double longitude) {
        return new GeometryFactory(new PrecisionModel(), SRID)
                .createPoint(new Coordinate(longitude, latitude));
    }
}