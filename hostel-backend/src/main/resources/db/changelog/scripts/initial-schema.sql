-- =============================================================================
-- Hostel Booking System — Initial Schema
-- University of Cape Coast
-- =============================================================================
-- Stack      : PostgreSQL 18+ with PostGIS extension
-- Naming     : snake_case, plural table names, uuid PKs
-- Enums      : NO PostgreSQL TYPE enums — all enum-like columns use VARCHAR
--              with CHECK constraints. Values are validated in Java via
--              @Enumerated(EnumType.STRING). This makes adding/removing enum
--              values a zero-downtime Liquibase column change, not a painful
--              ALTER TYPE ... ADD VALUE migration.
-- Auditing   : created_at / updated_at on all major entities
-- Locking    : `version` column on `rooms` for JPA @Version optimistic locking
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS postgis;       -- geometry columns for campus map


-- ---------------------------------------------------------------------------
-- 1. Allowed-value constants (documentation only — enforcement is in Java)
-- ---------------------------------------------------------------------------
-- These comments list the values each VARCHAR column is expected to hold.
-- The Java enum is the single source of truth; CHECK constraints are omitted
-- intentionally so that adding a new enum value never requires a DB migration.
--
-- user.role              : ADMIN | MANAGER | STUDENT
-- hostel.gender_policy   : MALE_ONLY | FEMALE_ONLY | MIXED
-- room.room_type         : SINGLE | DOUBLE | TRIPLE | QUAD | DORMITORY
-- room.status            : AVAILABLE | FULLY_OCCUPIED | UNDER_MAINTENANCE | RESERVED
-- booking.status         : PENDING | APPROVED | REJECTED | CHECKED_IN |
--                          CHECKED_OUT | CANCELLED | WAITLISTED
-- complaint.status       : OPEN | IN_PROGRESS | RESOLVED | CLOSED
-- complaint.category     : MAINTENANCE | CLEANLINESS | SECURITY | NOISE |
--                          BILLING | OTHER
-- notification.type      : BOOKING_APPROVED | BOOKING_REJECTED |
--                          BOOKING_CANCELLED | CHECKIN_REMINDER |
--                          WAITLIST_PROMOTED | COMPLAINT_UPDATED | GENERAL
-- landmark.category      : ACADEMIC | LIBRARY | ADMINISTRATIVE | CAFETERIA |
--                          MEDICAL | SPORTS | HOSTEL | OTHER
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 2. Core Tables
-- ---------------------------------------------------------------------------

/**
 * users
 * Stores all system users regardless of role.
 * Managers and Admins are also rows in this table with an elevated role value.
 *
 * Java enum : com.ucc.hostel.module.user.entity.UserRole
 *             (ADMIN, MANAGER, STUDENT)
 */
CREATE TABLE users (
                       id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                       email          VARCHAR(255) NOT NULL UNIQUE,
                       password_hash  VARCHAR(255) NOT NULL,
                       first_name     VARCHAR(100) NOT NULL,
                       last_name      VARCHAR(100) NOT NULL,
                       phone          VARCHAR(20),

    -- Values: ADMIN | MANAGER | STUDENT  (enforced by UserRole Java enum)
                       role           VARCHAR(20)  NOT NULL DEFAULT 'STUDENT',

    -- Firebase Cloud Messaging device token. Updated on every login.
                       fcm_token      TEXT,

                       is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
                       created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                       updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users IS 'All system users — students, managers, and admins.';
COMMENT ON COLUMN users.role       IS 'Java enum UserRole: ADMIN | MANAGER | STUDENT';
COMMENT ON COLUMN users.fcm_token  IS 'Firebase device token for offline push notifications. Updated on each login.';


/**
 * hostels
 * Represents a hostel / accommodation block.
 *
 * The `location` column is a PostGIS Geography Point (SRID 4326 = WGS 84).
 * Use ST_Distance(h.location, l.location) to compute metre-accurate distances.
 *
 * Java enum : com.ucc.hostel.module.hostel.entity.GenderPolicy
 *             (MALE_ONLY, FEMALE_ONLY, MIXED)
 */
CREATE TABLE hostels (
                         id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                         name           VARCHAR(150) NOT NULL,
                         address        VARCHAR(300) NOT NULL,
                         description    TEXT,

    -- PostGIS geometry point stored as WGS 84 lat/lon.
                         location       GEOMETRY(POINT, 4326),

    -- Values: MALE_ONLY | FEMALE_ONLY | MIXED  (enforced by GenderPolicy Java enum)
                         gender_policy  VARCHAR(15)  NOT NULL DEFAULT 'MIXED',

                         image_url      TEXT,
                         is_active      BOOLEAN      NOT NULL DEFAULT TRUE,

    -- FK to the MANAGER user responsible for this hostel.
                         manager_id     UUID         REFERENCES users(id) ON DELETE SET NULL,

                         created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                         updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  hostels IS 'Physical hostel / accommodation blocks on or near campus.';
COMMENT ON COLUMN hostels.location      IS 'PostGIS geometry point (WGS 84). Enables distance queries with ST_Distance.';
COMMENT ON COLUMN hostels.gender_policy IS 'Java enum GenderPolicy: MALE_ONLY | FEMALE_ONLY | MIXED';
COMMENT ON COLUMN hostels.manager_id    IS 'The manager user assigned to this hostel.';


/**
 * rooms
 * Individual bookable rooms within a hostel.
 *
 * Concurrency control:
 *   `version` is mapped to JPA @Version. Hibernate increments it on every
 *   UPDATE and throws OptimisticLockException if two transactions race.
 *   Catch that exception in BookingService and surface a "room just became
 *   unavailable" response — this is what prevents double-booking.
 *
 * Java enums:
 *   com.ucc.hostel.module.room.entity.RoomType
 *     (SINGLE, DOUBLE, TRIPLE, QUAD, DORMITORY)
 *   com.ucc.hostel.module.room.entity.RoomStatus
 *     (AVAILABLE, FULLY_OCCUPIED, UNDER_MAINTENANCE, RESERVED)
 */
CREATE TABLE rooms (
                       id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
                       hostel_id           UUID          NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
                       room_number         VARCHAR(20)   NOT NULL,

    -- Values: SINGLE | DOUBLE | TRIPLE | QUAD | DORMITORY
                       room_type           VARCHAR(15)   NOT NULL,

                       capacity            SMALLINT      NOT NULL CHECK (capacity > 0),
                       current_occupancy   SMALLINT      NOT NULL DEFAULT 0 CHECK (current_occupancy >= 0),
                       price_per_semester  DECIMAL(10,2) NOT NULL CHECK (price_per_semester >= 0),

    -- Values: AVAILABLE | FULLY_OCCUPIED | UNDER_MAINTENANCE | RESERVED
                       status              VARCHAR(20)   NOT NULL DEFAULT 'AVAILABLE',

                       floor_number        SMALLINT,
                        image_url TEXT NOT NULL,

    -- JPA @Version field. Never set or update this manually.
                       version             INTEGER       NOT NULL DEFAULT 0,

                       created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                       updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

                       UNIQUE (hostel_id, room_number),
                       CHECK  (current_occupancy <= capacity)
);

COMMENT ON TABLE  rooms IS 'Individual bookable rooms. One room can have multiple occupants up to capacity.';
COMMENT ON COLUMN rooms.room_type         IS 'Java enum RoomType: SINGLE | DOUBLE | TRIPLE | QUAD | DORMITORY';
COMMENT ON COLUMN rooms.status            IS 'Java enum RoomStatus: AVAILABLE | FULLY_OCCUPIED | UNDER_MAINTENANCE | RESERVED';
COMMENT ON COLUMN rooms.version           IS 'JPA @Version optimistic lock counter. Prevents concurrent double-booking.';
COMMENT ON COLUMN rooms.current_occupancy IS 'Incremented/decremented transactionally on booking approval and checkout.';


/**
 * room_amenities
 * Tag-like amenities attached to a room (e.g., "WiFi", "Air Conditioning").
 * Kept as separate rows so the frontend can filter rooms by amenity easily.
 */
CREATE TABLE room_amenities (
                                id       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                                room_id  UUID         NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                                amenity  VARCHAR(100) NOT NULL,
                                image_url TEXT,

                                UNIQUE (room_id, amenity)
);


/**
 * bookings
 * The heart of the system — tracks the full lifecycle of a room booking.
 *
 * State machine (enforced in Java BookingService):
 *   PENDING  → APPROVED   (manager action)
 *   PENDING  → REJECTED   (manager action)
 *   PENDING  → CANCELLED  (student self-cancels)
 *   APPROVED → CHECKED_IN (admin/manager checks student in)
 *   CHECKED_IN → CHECKED_OUT
 *
 * The UNIQUE constraint on (student_id, academic_year, semester) ensures a
 * student can hold only one booking slot per semester at the database level.
 *
 * Java enum : com.ucc.hostel.module.booking.entity.BookingStatus
 *   (PENDING, APPROVED, REJECTED, CHECKED_IN, CHECKED_OUT, CANCELLED, WAITLISTED)
 */
CREATE TABLE bookings (
                          id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
                          student_id      UUID          NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
                          room_id         UUID          NOT NULL REFERENCES rooms(id)    ON DELETE RESTRICT,

    -- Values: PENDING | APPROVED | REJECTED | CHECKED_IN | CHECKED_OUT | CANCELLED | WAITLISTED
                          status          VARCHAR(15)   NOT NULL DEFAULT 'PENDING',

                          academic_year   VARCHAR(9)    NOT NULL,  -- e.g. "2024/2025"
                          semester        VARCHAR(20)   NOT NULL,  -- e.g. "FIRST" | "SECOND"

                          requested_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                          approved_at     TIMESTAMPTZ,
                          approved_by     UUID          REFERENCES users(id) ON DELETE SET NULL,
                          rejected_at     TIMESTAMPTZ,
                          rejected_reason TEXT,
                          checked_in_at   TIMESTAMPTZ,
                          checked_out_at  TIMESTAMPTZ,

    -- Simulated payment fields — no real gateway integrated.
                          amount_paid     DECIMAL(10,2),
                          payment_ref     VARCHAR(100),

                          created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                          updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- One active booking slot per student per semester.
                          UNIQUE (student_id, academic_year, semester)
);

COMMENT ON TABLE  bookings IS 'Booking request lifecycle. A student may have only one booking per semester.';
COMMENT ON COLUMN bookings.status      IS 'Java enum BookingStatus: PENDING|APPROVED|REJECTED|CHECKED_IN|CHECKED_OUT|CANCELLED|WAITLISTED';
COMMENT ON COLUMN bookings.approved_by IS 'Manager or admin who actioned the booking.';
COMMENT ON COLUMN bookings.amount_paid IS 'Simulated payment — no real payment gateway is integrated.';


/**
 * waitlists
 * Students queued for a hostel that is currently fully booked.
 * `position` is the 1-based rank; position 1 is first in line.
 * When a slot opens, the service promotes position 1, notifies them via FCM,
 * and re-ranks the remaining entries.
 */
CREATE TABLE waitlists (
                           id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
                           student_id  UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
                           hostel_id   UUID        NOT NULL REFERENCES hostels(id)  ON DELETE CASCADE,
                           position    INTEGER     NOT NULL CHECK (position > 0),
                           joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Set to TRUE once a Firebase push notification has been dispatched.
                           notified    BOOLEAN     NOT NULL DEFAULT FALSE,

                           UNIQUE (student_id, hostel_id)
);

COMMENT ON TABLE  waitlists IS 'Ordered waitlist per hostel. Position 1 is promoted first when a vacancy appears.';


-- ---------------------------------------------------------------------------
-- 3. Complaints & Ticketing
-- ---------------------------------------------------------------------------

/**
 * complaints
 * Room- or hostel-level tickets raised by students.
 * `room_id` is nullable — some complaints are hostel-wide (e.g., generator issues).
 *
 * Java enums:
 *   com.ucc.hostel.module.complaint.entity.ComplaintStatus
 *     (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
 *   com.ucc.hostel.module.complaint.entity.ComplaintCategory
 *     (MAINTENANCE, CLEANLINESS, SECURITY, NOISE, BILLING, OTHER)
 */
CREATE TABLE complaints (
                            id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                            author_id    UUID         NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
                            hostel_id    UUID         NOT NULL REFERENCES hostels(id)  ON DELETE CASCADE,

    -- NULL when the complaint applies to the whole hostel, not a specific room.
                            room_id      UUID         REFERENCES rooms(id) ON DELETE SET NULL,

                            title        VARCHAR(200) NOT NULL,
                            description  TEXT         NOT NULL,

    -- Values: OPEN | IN_PROGRESS | RESOLVED | CLOSED
                            status       VARCHAR(15)  NOT NULL DEFAULT 'OPEN',

    -- Values: MAINTENANCE | CLEANLINESS | SECURITY | NOISE | BILLING | OTHER
                            category     VARCHAR(15)  NOT NULL DEFAULT 'OTHER',

                            created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                            updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                            resolved_at  TIMESTAMPTZ
);

COMMENT ON TABLE  complaints IS 'Student-raised complaint tickets. May target a room or a hostel broadly.';
COMMENT ON COLUMN complaints.status   IS 'Java enum ComplaintStatus: OPEN | IN_PROGRESS | RESOLVED | CLOSED';
COMMENT ON COLUMN complaints.category IS 'Java enum ComplaintCategory: MAINTENANCE | CLEANLINESS | SECURITY | NOISE | BILLING | OTHER';
COMMENT ON COLUMN complaints.room_id  IS 'NULL for hostel-wide complaints (e.g., power outage, generator fault).';


/**
 * complaint_reactions
 * Upvote / downvote per user per complaint.
 * The UNIQUE constraint enforces one reaction per (complaint, user) pair.
 * Toggling is handled in the service layer: re-submitting flips `is_upvote`.
 */
CREATE TABLE complaint_reactions (
                                     id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
                                     complaint_id  UUID        NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
                                     user_id       UUID        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,

    -- TRUE = upvote, FALSE = downvote.
                                     is_upvote     BOOLEAN     NOT NULL,

                                     created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One reaction per user per complaint. Re-voting UPSERTs this row.
                                     UNIQUE (complaint_id, user_id)
);


/**
 * complaint_attachments
 * Photos or documents uploaded as evidence for a complaint.
 * `file_url` stores the path returned by the file-upload service.
 */
CREATE TABLE complaint_attachments (
                                       id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
                                       complaint_id  UUID        NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
                                       file_url      TEXT        NOT NULL,
                                       file_type     VARCHAR(50),             -- e.g. "image/jpeg" | "application/pdf"
                                       uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- 4. Reviews
-- ---------------------------------------------------------------------------

/**
 * reviews
 * Hostel reviews gated by a real booking.
 *
 * The `booking_id` FK is the authenticity guarantee: the service checks that
 * the referenced booking has status CHECKED_IN or CHECKED_OUT and belongs to
 * the same student before allowing a review to be created.
 *
 * UNIQUE (author_id, hostel_id) means one review per student per hostel, ever.
 */
CREATE TABLE reviews (
                         id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
                         author_id   UUID        NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
                         hostel_id   UUID        NOT NULL REFERENCES hostels(id)  ON DELETE CASCADE,

    -- Authenticity anchor: proves the reviewer actually stayed here.
                         booking_id  UUID        NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,

                         rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
                         comment     TEXT,
                         created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                         UNIQUE (author_id, hostel_id)
);

COMMENT ON TABLE  reviews IS 'Hostel reviews. booking_id FK guarantees the reviewer actually stayed there.';


-- ---------------------------------------------------------------------------
-- 5. Campus Map
-- ---------------------------------------------------------------------------

/**
 * landmarks
 * Major UCC campus points of interest stored as PostGIS geometry points.
 * Seeded by an admin via the /admin/landmarks endpoint.
 *
 * Distance query pattern:
 *   SELECT ST_Distance(h.location, l.location) AS metres
 *   FROM hostels h, landmarks l
 *   WHERE h.id = :hostelId AND l.id = :landmarkId
 *
 * Java enum : com.ucc.hostel.module.map.entity.LandmarkCategory
 *   (ACADEMIC, LIBRARY, ADMINISTRATIVE, CAFETERIA, MEDICAL, SPORTS, HOSTEL, OTHER)
 */
CREATE TABLE landmarks (
                           id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                           name         VARCHAR(200) NOT NULL,

    -- Values: ACADEMIC | LIBRARY | ADMINISTRATIVE | CAFETERIA | MEDICAL | SPORTS | HOSTEL | OTHER
                           category     VARCHAR(20)  NOT NULL DEFAULT 'OTHER',

    -- PostGIS geometry point, WGS 84.
                           location     GEOMETRY(POINT, 4326) NOT NULL,

                           description  TEXT,
                           created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  landmarks IS 'UCC campus landmarks with PostGIS coordinates for map distance queries.';
COMMENT ON COLUMN landmarks.category IS 'Java enum LandmarkCategory: ACADEMIC|LIBRARY|ADMINISTRATIVE|CAFETERIA|MEDICAL|SPORTS|HOSTEL|OTHER';


-- ---------------------------------------------------------------------------
-- 6. Roommate Matching
-- ---------------------------------------------------------------------------

/**
 * student_preferences
 * Lifestyle tags used for roommate matching suggestions.
 *
 * Stored as a PostgreSQL TEXT ARRAY. The GIN index in indexes.sql makes the
 * overlap operator (&&) fast:
 *   SELECT * FROM student_preferences WHERE tags && ARRAY['Quiet', 'Neat']
 *
 * One row per student, created automatically on first profile save.
 */
CREATE TABLE student_preferences (
                                     id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
                                     student_id  UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                                     tags        TEXT[]      NOT NULL DEFAULT '{}',  -- e.g. ARRAY['Night Owl', 'Quiet']
                                     updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  student_preferences IS 'Lifestyle tags for roommate matching. One row per student.';


-- ---------------------------------------------------------------------------
-- 7. Notifications
-- ---------------------------------------------------------------------------

/**
 * notifications
 * Persisted notification records for the in-app notification centre.
 *
 * Delivery path:
 *   1. NotificationService creates a row here.
 *   2. WebSocket (STOMP) pushes it live to the connected client.
 *   3. Firebase FCM delivers it offline via the user's fcm_token.
 *
 * `ref_id` is an optional UUID pointing to the related entity
 * (booking id, complaint id, etc.) so the frontend can deep-link.
 *
 * Java enum : com.ucc.hostel.module.notification.entity.NotificationType
 *   (BOOKING_APPROVED, BOOKING_REJECTED, BOOKING_CANCELLED,
 *    CHECKIN_REMINDER, WAITLIST_PROMOTED, COMPLAINT_UPDATED, GENERAL)
 */
CREATE TABLE notifications (
                               id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
                               recipient_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                               title       VARCHAR(200) NOT NULL,
                               message        TEXT         NOT NULL,

    -- Values: BOOKING_APPROVED | BOOKING_REJECTED | BOOKING_CANCELLED |
    --         CHECKIN_REMINDER | WAITLIST_PROMOTED | COMPLAINT_UPDATED | GENERAL
                               type        VARCHAR(100)  NOT NULL DEFAULT 'GENERAL',

                               is_read     BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Optional reference to the related domain entity (booking, complaint, etc.)
                               entity_id      UUID,
                               entity_type VARCHAR(200),
    navigate_url TEXT,
    read_at TIMESTAMPTZ,

                               created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  notifications IS 'Persisted notification records delivered via WebSocket and Firebase FCM.';
COMMENT ON COLUMN notifications.type   IS 'Java enum NotificationType: BOOKING_APPROVED|BOOKING_REJECTED|BOOKING_CANCELLED|CHECKIN_REMINDER|WAITLIST_PROMOTED|COMPLAINT_UPDATED|GENERAL';
COMMENT ON COLUMN notifications.entity_id IS 'Optional UUID of the related booking, complaint, or other entity for frontend deep-linking.';

CREATE TABLE push_subscriptions
(
    id         UUID PRIMARY KEY   DEFAULT gen_random_uuid(),
    user_id    UUID      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    endpoint   TEXT      NOT NULL UNIQUE,
    p256dh     TEXT      NOT NULL,   -- client public key
    auth       TEXT      NOT NULL,   -- client auth secret
    user_agent TEXT,
    is_active  BOOLEAN   NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

