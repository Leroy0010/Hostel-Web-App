package com.leroy.hostelbackend.module.hostel.repository;

import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.hostel.projection.AvailablePeriodProjection;
import com.leroy.hostelbackend.module.hostel.projection.HostelDetailFlatProjection;
import com.leroy.hostelbackend.module.hostel.projection.HostelRoomFlatProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Hostel} entities.
 *
 * <p><strong>N+1 prevention:</strong> All queries that load the {@code manager}
 * association use {@code JOIN FETCH} so Hibernate issues one query, not one per hostel.
 */
public interface HostelRepository extends JpaRepository<Hostel, UUID>, JpaSpecificationExecutor<Hostel> {

    /**
     * Paginated list of active hostels with their manager eagerly loaded.
     * Used by the public hostel listing endpoint.
     */
    @Query("SELECT h FROM Hostel h LEFT JOIN FETCH h.manager WHERE h.isActive = true")
    Page<Hostel> findAllActiveWithManager(Pageable pageable);

    /**
     * Paginated list of ALL hostels (active + inactive) for the admin dashboard.
     */
    @Query("""
       SELECT h FROM Hostel h
       LEFT JOIN FETCH h.manager
       WHERE (CAST(:search AS string) IS NULL
              OR LOWER(h.name) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))
              OR LOWER(h.address) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))
         AND (CAST(:genderPolicy AS string) IS NULL
              OR CAST(h.genderPolicy AS string) = CAST(:genderPolicy AS string))
       """)
    Page<Hostel> findAllWithManager(
            @Param("search") String search,
            @Param("genderPolicy") String genderPolicy,
            Pageable pageable
    );



    /**
     * Full hostel detail by ID — always fetches manager in the same query.
     */
    @Query("SELECT h FROM Hostel h LEFT JOIN FETCH h.manager WHERE h.id = :id")
    Optional<Hostel> findByIdWithManager(@Param("id") UUID id);

    /**
     * All hostels managed by a specific manager. Used to validate manager access.
     */
    @Query("SELECT h FROM Hostel h WHERE h.manager.id = :managerId AND h.isActive = true")
    Page<Hostel> findByManagerId(@Param("managerId") UUID managerId, Pageable pageable);

    /**
     * Existence check for name uniqueness (case-insensitive).
     */
    boolean existsByNameIgnoreCase(String name);

    /**
     * Counts the total number of distinct active hostels matching filters.
     */
    @Query(value = """
            WITH RoomPeriodOccupancy AS (
                SELECT 
                    room_id, academic_year,
                    COUNT(CASE WHEN semester IN ('FIRST', 'FULL') THEN 1 END) as occupancy_first,
                    COUNT(CASE WHEN semester IN ('SECOND', 'FULL') THEN 1 END) as occupancy_second,
                    COUNT(CASE WHEN semester = 'FULL' THEN 1 END) + 
                    GREATEST(
                        COUNT(CASE WHEN semester = 'FIRST' THEN 1 END),
                        COUNT(CASE WHEN semester = 'SECOND' THEN 1 END)
                    ) as occupancy_full
                FROM bookings
                WHERE status IN ('APPROVED', 'CHECKED_IN')
                GROUP BY room_id, academic_year
            ),
            ValidPeriods AS (
                SELECT y.year_str AS academic_year, s.sem_str AS semester
                FROM (VALUES (cast(:yearMinus1 as text)), (cast(:yearCurrent as text)), (cast(:yearPlus1 as text))) AS y(year_str)
                CROSS JOIN (VALUES ('FIRST'), ('SECOND'), ('FULL')) AS s(sem_str)
            ),
            RoomAvailability AS (
                SELECT r.hostel_id
                FROM rooms r
                CROSS JOIN ValidPeriods vp
                LEFT JOIN RoomPeriodOccupancy rpo 
                    ON r.id = rpo.room_id 
                   AND vp.academic_year = rpo.academic_year
                WHERE COALESCE(
                    CASE 
                        WHEN vp.semester = 'FIRST' THEN rpo.occupancy_first
                        -- SECOND semester is only open if FIRST semester is already fully booked
                        WHEN vp.semester = 'SECOND' THEN 
                            CASE WHEN rpo.occupancy_first >= r.capacity THEN rpo.occupancy_second ELSE r.capacity END
                        WHEN vp.semester = 'FULL' THEN rpo.occupancy_full
                    END, 0) < r.capacity
                  AND (cast(:roomType as text) IS NULL OR r.room_type = cast(:roomType as text))
                  AND (cast(:maxPrice as numeric) IS NULL OR r.price_per_semester <= cast(:maxPrice as numeric))
            )
            SELECT COUNT(DISTINCT h.id)
            FROM hostels h
            INNER JOIN RoomAvailability ra ON h.id = ra.hostel_id
            WHERE h.is_active = true
              AND (cast(:search as text) IS NULL OR LOWER(h.name) LIKE LOWER(CONCAT('%', cast(:search as text), '%')) OR LOWER(h.address) LIKE LOWER(CONCAT('%', cast(:search as text), '%')))
              AND (cast(:genderPolicy as text) IS NULL OR h.gender_policy = cast(:genderPolicy as text))
            """, nativeQuery = true)
    long countHostelsWithRoomPreviews(
            @Param("search") String search,
            @Param("genderPolicy") String genderPolicy,
            @Param("roomType") String roomType,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("yearMinus1") String yearMinus1,
            @Param("yearCurrent") String yearCurrent,
            @Param("yearPlus1") String yearPlus1
    );

    /**
     * Fetches a paginated page of active hostels along with their filtered rooms.
     */
    @Query(value = """
            WITH RoomPeriodOccupancy AS (
                SELECT 
                    room_id, academic_year,
                    COUNT(CASE WHEN semester IN ('FIRST', 'FULL') THEN 1 END) as occupancy_first,
                    COUNT(CASE WHEN semester IN ('SECOND', 'FULL') THEN 1 END) as occupancy_second,
                    COUNT(CASE WHEN semester = 'FULL' THEN 1 END) + 
                    GREATEST(
                        COUNT(CASE WHEN semester = 'FIRST' THEN 1 END),
                        COUNT(CASE WHEN semester = 'SECOND' THEN 1 END)
                    ) as occupancy_full
                FROM bookings
                WHERE status IN ('APPROVED', 'CHECKED_IN')
                GROUP BY room_id, academic_year
            ),
            ValidPeriods AS (
                SELECT y.year_str AS academic_year, s.sem_str AS semester
                FROM (VALUES (cast(:yearMinus1 as text)), (cast(:yearCurrent as text)), (cast(:yearPlus1 as text))) AS y(year_str)
                CROSS JOIN (VALUES ('FIRST'), ('SECOND'), ('FULL')) AS s(sem_str)
            ),
            RoomAvailability AS (
                SELECT r.*, vp.academic_year, vp.semester
                FROM rooms r
                CROSS JOIN ValidPeriods vp
                LEFT JOIN RoomPeriodOccupancy rpo 
                    ON r.id = rpo.room_id 
                   AND vp.academic_year = rpo.academic_year
                WHERE COALESCE(
                    CASE 
                        WHEN vp.semester = 'FIRST' THEN rpo.occupancy_first
                        -- SECOND semester is only open if FIRST semester is already fully booked
                        WHEN vp.semester = 'SECOND' THEN 
                            CASE WHEN rpo.occupancy_first >= r.capacity THEN rpo.occupancy_second ELSE r.capacity END
                        WHEN vp.semester = 'FULL' THEN rpo.occupancy_full
                    END, 0) < r.capacity
                  AND (cast(:roomType as text) IS NULL OR r.room_type = cast(:roomType as text))
                  AND (cast(:maxPrice as numeric) IS NULL OR r.price_per_semester <= cast(:maxPrice as numeric))
            ),
            MatchedHostels AS (
                SELECT DISTINCT h.id, h.name, h.address, h.gender_policy, h.image_url, h.is_active
                FROM hostels h
                INNER JOIN RoomAvailability ra ON h.id = ra.hostel_id
                WHERE h.is_active = true
                  AND (cast(:search as text) IS NULL OR LOWER(h.name) LIKE LOWER(CONCAT('%', cast(:search as text), '%')) OR LOWER(h.address) LIKE LOWER(CONCAT('%', cast(:search as text), '%')))
                  AND (cast(:genderPolicy as text) IS NULL OR h.gender_policy = cast(:genderPolicy as text))
            ),
            PaginatedHostels AS (
                SELECT * FROM MatchedHostels
                ORDER BY 
                    CASE WHEN cast(:sortBy as text) = 'name' AND cast(:sortOrder as text) = 'ASC' THEN name END ASC,
                    CASE WHEN cast(:sortBy as text) = 'name' AND cast(:sortOrder as text) = 'DESC' THEN name END DESC,
                    CASE WHEN cast(:sortBy as text) = 'address' AND cast(:sortOrder as text) = 'ASC' THEN address END ASC,
                    CASE WHEN cast(:sortBy as text) = 'address' AND cast(:sortOrder as text) = 'DESC' THEN address END DESC,
                    id ASC
                LIMIT cast(:limit as integer) OFFSET cast(:offset as integer)
            ),
            RankedRooms AS (
                SELECT room_id, hostel_id,
                       ROW_NUMBER() OVER (PARTITION BY hostel_id ORDER BY price_per_semester ASC, room_id ASC) as rn
                FROM (SELECT DISTINCT id AS room_id, hostel_id, price_per_semester FROM RoomAvailability) distinct_rooms
            )
            SELECT 
                h.id AS hostelId, h.name AS hostelName, h.address AS hostelAddress, 
                h.gender_policy AS hostelGenderPolicy, h.image_url AS hostelImageUrl, h.is_active AS hostelIsActive,
                ra.id AS roomId, ra.room_number AS roomNumber, ra.room_type AS roomType, 
                ra.capacity AS capacity, ra.price_per_semester AS pricePerSemester, ra.floor_number AS floorNumber, 
                ra.image_url AS roomImageUrl, ra.academic_year AS academicYear, ra.semester AS semester
            FROM PaginatedHostels h
            INNER JOIN RankedRooms rr ON h.id = rr.hostel_id AND rr.rn <= 6
            INNER JOIN RoomAvailability ra ON rr.room_id = ra.id
            ORDER BY 
                CASE WHEN cast(:sortBy as text) = 'name' AND cast(:sortOrder as text) = 'ASC' THEN h.name END ASC,
                CASE WHEN cast(:sortBy as text) = 'name' AND cast(:sortOrder as text) = 'DESC' THEN h.name END DESC,
                CASE WHEN cast(:sortBy as text) = 'address' AND cast(:sortOrder as text) = 'ASC' THEN h.address END ASC,
                CASE WHEN cast(:sortBy as text) = 'address' AND cast(:sortOrder as text) = 'DESC' THEN h.address END DESC,
                ra.price_per_semester ASC, 
                ra.id ASC
            """, nativeQuery = true)
    List<HostelRoomFlatProjection> findHostelsWithRoomPreviews(
            @Param("search") String search,
            @Param("genderPolicy") String genderPolicy,
            @Param("roomType") String roomType,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("yearMinus1") String yearMinus1,
            @Param("yearCurrent") String yearCurrent,
            @Param("yearPlus1") String yearPlus1,
            @Param("sortBy") String sortBy,
            @Param("sortOrder") String sortOrder,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    /**
     * Counts the total number of rooms matching filters for a specific hostel.
     */
    @Query(value = """
        WITH RoomPeriodOccupancy AS (
            SELECT 
                room_id, academic_year,
                COUNT(CASE WHEN semester IN ('FIRST', 'FULL') THEN 1 END) as occupancy_first,
                COUNT(CASE WHEN semester IN ('SECOND', 'FULL') THEN 1 END) as occupancy_second,
                COUNT(CASE WHEN semester = 'FULL' THEN 1 END) + 
                GREATEST(
                    COUNT(CASE WHEN semester = 'FIRST' THEN 1 END),
                    COUNT(CASE WHEN semester = 'SECOND' THEN 1 END)
                ) as occupancy_full
            FROM bookings
            WHERE status IN ('APPROVED', 'CHECKED_IN')
            GROUP BY room_id, academic_year
        ),
        ValidPeriods AS (
            SELECT y.year_str AS academic_year, s.sem_str AS semester
            FROM (VALUES (cast(:yearMinus1 as text)), (cast(:yearCurrent as text)), (cast(:yearPlus1 as text))) AS y(year_str)
            CROSS JOIN (VALUES ('FIRST'), ('SECOND'), ('FULL')) AS s(sem_str)
        ),
        RoomAvailability AS (
            SELECT DISTINCT r.id
            FROM rooms r
            CROSS JOIN ValidPeriods vp
            LEFT JOIN RoomPeriodOccupancy rpo 
                ON r.id = rpo.room_id 
               AND vp.academic_year = rpo.academic_year
            WHERE r.hostel_id = cast(:hostelId as uuid)
              AND COALESCE(
                  CASE 
                      WHEN vp.semester = 'FIRST' THEN rpo.occupancy_first
                      WHEN vp.semester = 'SECOND' THEN 
                          CASE WHEN rpo.occupancy_first >= r.capacity THEN rpo.occupancy_second ELSE r.capacity END
                      WHEN vp.semester = 'FULL' THEN rpo.occupancy_full
                  END, 0) < r.capacity
              AND (cast(:roomType as text) IS NULL OR r.room_type = cast(:roomType as text))
              AND (cast(:maxPrice as numeric) IS NULL OR r.price_per_semester <= cast(:maxPrice as numeric))
        )
        SELECT COUNT(*) FROM RoomAvailability
        """, nativeQuery = true)
    long countHostelRoomsWithFilters(
            @Param("hostelId") UUID hostelId,
            @Param("roomType") String roomType,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("yearMinus1") String yearMinus1,
            @Param("yearCurrent") String yearCurrent,
            @Param("yearPlus1") String yearPlus1
    );

    /**
     * Fetches details of a single hostel with a filtered, paginated list of its rooms and available periods.
     */
    @Query(value = """
        WITH RoomPeriodOccupancy AS (
            SELECT
                room_id, academic_year,
                COUNT(CASE WHEN semester IN ('FIRST', 'FULL') THEN 1 END) as occupancy_first,
                COUNT(CASE WHEN semester IN ('SECOND', 'FULL') THEN 1 END) as occupancy_second,
                COUNT(CASE WHEN semester = 'FULL' THEN 1 END) +
                GREATEST(
                    COUNT(CASE WHEN semester = 'FIRST' THEN 1 END),
                    COUNT(CASE WHEN semester = 'SECOND' THEN 1 END)
                ) as occupancy_full
            FROM bookings
            WHERE status IN ('APPROVED', 'CHECKED_IN')
            GROUP BY room_id, academic_year
        ),
        ValidPeriods AS (
            SELECT y.year_str AS academic_year, s.sem_str AS semester
            FROM (VALUES (cast(:yearMinus1 as text)), (cast(:yearCurrent as text)), (cast(:yearPlus1 as text))) AS y(year_str)
            CROSS JOIN (VALUES ('FIRST'), ('SECOND'), ('FULL')) AS s(sem_str)
        ),
        RoomAvailability AS (
            SELECT r.*, vp.academic_year, vp.semester
            FROM rooms r
            CROSS JOIN ValidPeriods vp
            LEFT JOIN RoomPeriodOccupancy rpo 
                ON r.id = rpo.room_id 
               AND vp.academic_year = rpo.academic_year
            WHERE r.hostel_id = cast(:hostelId as uuid)
              AND COALESCE(
                  CASE 
                      WHEN vp.semester = 'FIRST' THEN rpo.occupancy_first
                      WHEN vp.semester = 'SECOND' THEN 
                          CASE WHEN rpo.occupancy_first >= r.capacity THEN rpo.occupancy_second ELSE r.capacity END
                      WHEN vp.semester = 'FULL' THEN rpo.occupancy_full
                  END, 0) < r.capacity
              AND (cast(:roomType as text) IS NULL OR r.room_type = cast(:roomType as text))
              AND (cast(:maxPrice as numeric) IS NULL OR r.price_per_semester <= cast(:maxPrice as numeric))
        ),
        DistinctRooms AS (
            SELECT DISTINCT id, room_number, price_per_semester, floor_number, capacity, image_url, room_type
            FROM RoomAvailability
        ),
        PaginatedRooms AS (
            SELECT * FROM DistinctRooms
            ORDER BY 
                CASE WHEN cast(:sortBy as text) = 'pricePerSemester' AND cast(:sortOrder as text) = 'ASC' THEN price_per_semester END ,
                CASE WHEN cast(:sortBy as text) = 'pricePerSemester' AND cast(:sortOrder as text) = 'DESC' THEN price_per_semester END DESC,
                CASE WHEN cast(:sortBy as text) = 'roomNumber' AND cast(:sortOrder as text) = 'ASC' THEN room_number END ,
                CASE WHEN cast(:sortBy as text) = 'roomNumber' AND cast(:sortOrder as text) = 'DESC' THEN room_number END DESC,
                id
            LIMIT cast(:limit as integer) OFFSET cast(:offset as integer)
        )
        SELECT 
            h.id AS hostelId, h.name AS hostelName, h.address AS hostelAddress, 
            h.description AS hostelDescription, h.gender_policy AS hostelGenderPolicy, 
            h.image_url AS hostelImageUrl, h.is_active AS hostelIsActive,
            ST_Y(h.location) AS hostelLatitude, ST_X(h.location) AS hostelLongitude,
            h.created_at AS hostelCreatedAt, h.updated_at AS hostelUpdatedAt,
            m.id AS managerId, m.first_name AS managerFirstName, m.last_name AS managerLastName, 
            m.email AS managerEmail, m.phone AS managerPhone,
            pr.id AS roomId, pr.room_number AS roomNumber, pr.room_type AS roomType, 
            pr.capacity AS capacity, pr.price_per_semester AS pricePerSemester, pr.floor_number AS floorNumber, 
            pr.image_url AS roomImageUrl, ra.academic_year AS academicYear, ra.semester AS semester
        FROM hostels h
        LEFT JOIN users m ON h.manager_id = m.id
        LEFT JOIN PaginatedRooms pr ON h.id = cast(:hostelId as uuid)
        LEFT JOIN RoomAvailability ra ON pr.id = ra.id
        WHERE h.id = cast(:hostelId as uuid)
        ORDER BY 
            CASE WHEN cast(:sortBy as text) = 'pricePerSemester' AND cast(:sortOrder as text) = 'ASC' THEN pr.price_per_semester END ,
            CASE WHEN cast(:sortBy as text) = 'pricePerSemester' AND cast(:sortOrder as text) = 'DESC' THEN pr.price_per_semester END DESC,
            CASE WHEN cast(:sortBy as text) = 'roomNumber' AND cast(:sortOrder as text) = 'ASC' THEN pr.room_number END ,
            CASE WHEN cast(:sortBy as text) = 'roomNumber' AND cast(:sortOrder as text) = 'DESC' THEN pr.room_number END DESC,
            pr.id
        """, nativeQuery = true)
    List<HostelDetailFlatProjection> findHostelDetailsWithRooms(
            @Param("hostelId") UUID hostelId,
            @Param("roomType") String roomType,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("yearMinus1") String yearMinus1,
            @Param("yearCurrent") String yearCurrent,
            @Param("yearPlus1") String yearPlus1,
            @Param("sortBy") String sortBy,
            @Param("sortOrder") String sortOrder,
            @Param("limit") int limit,
            @Param("offset") int offset
    );


    /**
     * Fetches distinct available academic years and semesters for a hostel.
     * Can be optionally narrowed down by a specific room or room type.
     */
    @Query(value = """
    WITH RoomPeriodOccupancy AS (
        SELECT 
            room_id, academic_year,
            COUNT(CASE WHEN semester IN ('FIRST', 'FULL') THEN 1 END) as occupancy_first,
            COUNT(CASE WHEN semester IN ('SECOND', 'FULL') THEN 1 END) as occupancy_second,
            COUNT(CASE WHEN semester = 'FULL' THEN 1 END) + 
            GREATEST(
                COUNT(CASE WHEN semester = 'FIRST' THEN 1 END),
                COUNT(CASE WHEN semester = 'SECOND' THEN 1 END)
            ) as occupancy_full
        FROM bookings
        WHERE room_id = cast(:roomId as uuid) AND status IN ('APPROVED', 'CHECKED_IN')
        GROUP BY room_id, academic_year
    ),
    ValidPeriods AS (
        SELECT y.year_str AS academic_year, s.sem_str AS semester
        FROM (VALUES (cast(:yearMinus1 as text)), (cast(:yearCurrent as text)), (cast(:yearPlus1 as text))) AS y(year_str)
        CROSS JOIN (VALUES ('FIRST'), ('SECOND'), ('FULL')) AS s(sem_str)
    )
    SELECT vp.academic_year AS academicYear, vp.semester AS semester
    FROM rooms r
    CROSS JOIN ValidPeriods vp
    LEFT JOIN RoomPeriodOccupancy rpo ON r.id = rpo.room_id AND vp.academic_year = rpo.academic_year
    WHERE r.id = cast(:roomId as uuid)
      AND COALESCE(
          CASE 
              WHEN vp.semester = 'FIRST' THEN rpo.occupancy_first
              WHEN vp.semester = 'SECOND' THEN 
                  CASE WHEN rpo.occupancy_first >= r.capacity THEN rpo.occupancy_second ELSE r.capacity END
              WHEN vp.semester = 'FULL' THEN rpo.occupancy_full
          END, 0) < r.capacity
    ORDER BY 
        academicYear, 
        CASE semester 
            WHEN 'FIRST' THEN 1 
            WHEN 'SECOND' THEN 2 
            WHEN 'FULL' THEN 3 
        END
    """, nativeQuery = true)
    List<AvailablePeriodProjection> findBookingPeriods(
            @Param("roomId") UUID roomId,
            @Param("yearMinus1") String yearMinus1,
            @Param("yearCurrent") String yearCurrent,
            @Param("yearPlus1") String yearPlus1
    );


    /**
     * Fetches distinct academic periods for a hostel's waitlist.
     * ONLY returns periods where the requested room type is 100% FULL (sold out)
     * based on actual bookings, ensuring every waitlist entry is backed by active bookings.
     */
    @Query(value = """
        WITH RoomPeriodOccupancy AS (
            SELECT 
                room_id, academic_year,
                COUNT(CASE WHEN semester IN ('FIRST', 'FULL') THEN 1 END) as occupancy_first,
                COUNT(CASE WHEN semester IN ('SECOND', 'FULL') THEN 1 END) as occupancy_second,
                COUNT(CASE WHEN semester = 'FULL' THEN 1 END) + 
                GREATEST(
                    COUNT(CASE WHEN semester = 'FIRST' THEN 1 END),
                    COUNT(CASE WHEN semester = 'SECOND' THEN 1 END)
                ) as occupancy_full
            FROM bookings
            WHERE status IN ('APPROVED', 'CHECKED_IN')
            GROUP BY room_id, academic_year
        ),
        ValidPeriods AS (
            SELECT y.year_str AS academic_year, s.sem_str AS semester
            FROM (VALUES (cast(:yearMinus1 as text)), (cast(:yearCurrent as text)), (cast(:yearPlus1 as text))) AS y(year_str)
            CROSS JOIN (VALUES ('FIRST'), ('SECOND'), ('FULL')) AS s(sem_str)
        ),
        RoomStatusPerPeriod AS (
            SELECT 
                r.id AS room_id,
                vp.academic_year,
                vp.semester,
                CASE 
                    WHEN COALESCE(
                        CASE 
                            WHEN vp.semester = 'FIRST' THEN rpo.occupancy_first
                            -- FIX: Use actual second semester occupancy instead of defaulting to capacity
                            WHEN vp.semester = 'SECOND' THEN rpo.occupancy_second 
                            WHEN vp.semester = 'FULL' THEN rpo.occupancy_full
                        END, 0) >= r.capacity THEN 'FULL'
                    ELSE 'AVAILABLE'
                END as room_status
            FROM rooms r
            CROSS JOIN ValidPeriods vp
            LEFT JOIN RoomPeriodOccupancy rpo 
                ON r.id = rpo.room_id 
               AND vp.academic_year = rpo.academic_year
            WHERE r.hostel_id = cast(:hostelId as uuid)
              AND (cast(:roomType as text) IS NULL OR r.room_type = cast(:roomType as text))
        )
        SELECT academic_year AS academicYear, semester AS semester
        FROM RoomStatusPerPeriod
        GROUP BY academic_year, semester
        -- Perfect-fit Guard: Only show the period if NO rooms of this type have available slots
        HAVING COUNT(CASE WHEN room_status = 'AVAILABLE' THEN 1 END) = 0
        ORDER BY 
            academic_year ASC,
            CASE semester 
                WHEN 'FIRST' THEN 1 
                WHEN 'SECOND' THEN 2 
                WHEN 'FULL' THEN 3 
            END ASC
        """, nativeQuery = true)
    List<AvailablePeriodProjection> findValidPeriodsForWaitlist(
            @Param("hostelId") UUID hostelId,
            @Param("roomType") String roomType,
            @Param("yearMinus1") String yearMinus1,
            @Param("yearCurrent") String yearCurrent,
            @Param("yearPlus1") String yearPlus1
    );


}