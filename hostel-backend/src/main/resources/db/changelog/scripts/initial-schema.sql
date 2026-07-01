-- 00-init-extensions.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- =============================================================================
-- Hostel Booking System — Final Consolidated Schema
-- University of Cape Coast — Leroy Hostels
-- =============================================================================
-- Naming   : snake_case, plural table names, uuid PKs
-- Enums    : NO PostgreSQL TYPE enums — all enum-like columns use VARCHAR,
--            validated in Java via @Enumerated(EnumType.STRING).
-- Auditing : created_at / updated_at on all major entities
-- Locking  : `version` column on `rooms` for JPA @Version optimistic locking
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Allowed-value constants (documentation only — enforcement is in Java)
-- ---------------------------------------------------------------------------
-- user.role              : ADMIN | MANAGER | STUDENT
-- hostel.gender_policy   : MALE_ONLY | FEMALE_ONLY | MIXED
-- room.room_type         : SINGLE | DOUBLE | TRIPLE | QUAD | DORMITORY
-- room.status            : AVAILABLE | FULLY_OCCUPIED | UNDER_MAINTENANCE | RESERVED
-- booking.status         : PENDING | APPROVED | REJECTED | CHECKED_IN |
--                          CHECKED_OUT | CANCELLED | WAITLISTED | EXPIRED
-- complaint.status       : OPEN | IN_PROGRESS | RESOLVED | CLOSED
-- complaint.category     : MAINTENANCE | CLEANLINESS | SECURITY | NOISE |
--                          BILLING | OTHER
-- notification.type      : BOOKING_APPROVED | BOOKING_REJECTED |
--                          BOOKING_CANCELLED | CHECKIN_REMINDER |
--                          WAITLIST_PROMOTED | COMPLAINT_UPDATED | GENERAL
-- landmark.category      : ACADEMIC | LIBRARY | ADMINISTRATIVE | CAFETERIA |
--                          MEDICAL | SPORTS | HOSTEL | OTHER
-- auth_tokens.type       : EMAIL_VERIFICATION | PASSWORD_RESET
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 2. Core Tables
-- ---------------------------------------------------------------------------

/**
 * users
 * Stores all system users regardless of role.
 * Managers and Admins are also rows in this table with an elevated role value.
 *
 * NOTE: fcm_token was removed — Web Push now uses the dedicated
 * `push_subscriptions` table (VAPID keys per-subscription), which supports
 * multiple devices per user, unlike a single FCM token column.
 *
 * Java enum : com.leroy.hostelbackend.module.user.model.UserRole
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

    -- Avatar / profile picture URL. Nullable — users may not have set one yet.
                       profile_url    TEXT,

                       is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
                       created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                       updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users IS 'All system users — students, managers, and admins.';
COMMENT ON COLUMN users.role        IS 'Java enum UserRole: ADMIN | MANAGER | STUDENT';
COMMENT ON COLUMN users.profile_url IS 'URL of the user''s profile picture, e.g. uploaded to object storage.';


/**
 * auth_tokens
 * Short-lived, single-use security tokens for sensitive actions.
 * Stored as SHA-256 hashes so raw tokens never persist at rest.
 */
CREATE TABLE auth_tokens (
                             id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                             user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                             token_hash  VARCHAR(64)  NOT NULL UNIQUE, -- SHA-256 hash of the hex token
                             type        VARCHAR(30)  NOT NULL,        -- EMAIL_VERIFICATION | PASSWORD_RESET
                             expires_at  TIMESTAMPTZ  NOT NULL,
                             created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE auth_tokens IS 'Secure token storage for email verification and password resets.';


/**
 * refresh_tokens
 * Long-lived JWT refresh tokens, stored so they can be revoked server-side.
 */
CREATE TABLE refresh_tokens (
                                id          BIGSERIAL    PRIMARY KEY,
                                token       TEXT         NOT NULL UNIQUE,
                                user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                expires_at  TIMESTAMPTZ  NOT NULL,
                                is_revoked  BOOLEAN      NOT NULL DEFAULT FALSE,
                                created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                                updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE refresh_tokens IS 'Server-side registry of issued JWT refresh tokens, enabling revocation.';


/**
 * hostels
 * Represents a hostel / accommodation block.
 *
 * The `location` column is a PostGIS geometry Point (SRID 4326 = WGS 84).
 * Use ST_Distance(h.location, l.location) to compute metre-accurate distances.
 *
 * Java enum : com.leroy.hostelbackend.module.hostel.model.GenderPolicy
 *             (MALE_ONLY, FEMALE_ONLY, MIXED)
 */
CREATE TABLE hostels (
                         id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                         name           VARCHAR(150) NOT NULL,
                         address        VARCHAR(300) NOT NULL,
                         description    TEXT,

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
 *
 * Java enums:
 *   com.leroy.hostelbackend.module.room.model.RoomType
 *     (SINGLE, DOUBLE, TRIPLE, QUAD, DORMITORY)
 *   com.leroy.hostelbackend.module.room.model.RoomStatus
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
                       image_url           TEXT          NOT NULL,

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
 */
CREATE TABLE room_amenities (
                                id        UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                                room_id   UUID         NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                                amenity   VARCHAR(100) NOT NULL,
                                image_url TEXT,

                                UNIQUE (room_id, amenity)
);


/**
 * bookings
 * The heart of the system — tracks the full lifecycle of a room booking.
 *
 * State machine (enforced in Java BookingService):
 *   PENDING    → APPROVED    (manager action)
 *   PENDING    → REJECTED    (manager action)
 *   PENDING    → CANCELLED   (student self-cancels)
 *   APPROVED   → CHECKED_IN  (admin/manager checks student in)
 *   APPROVED   → EXPIRED     (payment window elapsed — BookingExpiredSweeper)
 *   PENDING    → EXPIRED     (waitlist-draft manager window elapsed — sweeper)
 *   CHECKED_IN → CHECKED_OUT
 *
 * NOTE: the old hard UNIQUE(student_id, academic_year, semester) constraint
 * has been dropped — a student may now hold bookings for multiple rooms
 * across a rejection/re-apply cycle. Concurrency-safety is instead provided
 * by the partial unique index `idx_unique_active_room_booking` below, which
 * only blocks duplicate *active* bookings for the same room + period.
 *
 * Java enum : com.leroy.hostelbackend.module.booking.model.BookingStatus
 *   (PENDING, APPROVED, REJECTED, CHECKED_IN, CHECKED_OUT, CANCELLED,
 *    WAITLISTED, EXPIRED)
 */
CREATE TABLE bookings (
                          id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
                          student_id          UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                          room_id             UUID          NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,

    -- Values: PENDING|APPROVED|REJECTED|CHECKED_IN|CHECKED_OUT|CANCELLED|WAITLISTED|EXPIRED
                          status              VARCHAR(15)   NOT NULL DEFAULT 'PENDING',

                          academic_year       VARCHAR(9)    NOT NULL,  -- e.g. "2024/2025"
                          semester            VARCHAR(20)   NOT NULL,  -- e.g. "FIRST" | "SECOND" | "FULL"

                          requested_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                          approved_at         TIMESTAMPTZ,
                          approved_by         UUID          REFERENCES users(id) ON DELETE SET NULL,
                          rejected_at         TIMESTAMPTZ,
                          rejected_reason     TEXT,
                          checked_in_at       TIMESTAMPTZ,
                          checked_out_at      TIMESTAMPTZ,

    -- Simulated payment fields — no real gateway integrated.
                          amount_paid         DECIMAL(10,2),
                          payment_ref         VARCHAR(100),

    -- APPROVED bookings: deadline for student to submit paymentRef.
    -- Set by manager at approval. Swept by BookingExpiredSweeper.
                          payment_expires_at  TIMESTAMPTZ,

    -- Auto-drafted PENDING bookings: deadline before the system auto-rejects
    -- and advances the waitlist. Set only when is_waitlist_draft = TRUE.
                          pending_expires_at  TIMESTAMPTZ,

    -- TRUE if this booking was auto-created by the waitlist promotion flow.
                          is_waitlist_draft   BOOLEAN       NOT NULL DEFAULT FALSE,

                          created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                          updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  bookings IS 'Booking request lifecycle.';
COMMENT ON COLUMN bookings.status              IS 'Java enum BookingStatus: PENDING|APPROVED|REJECTED|CHECKED_IN|CHECKED_OUT|CANCELLED|WAITLISTED|EXPIRED';
COMMENT ON COLUMN bookings.approved_by         IS 'Manager or admin who actioned the booking.';
COMMENT ON COLUMN bookings.amount_paid         IS 'Simulated payment — no real payment gateway is integrated.';
COMMENT ON COLUMN bookings.payment_expires_at  IS 'APPROVED bookings: deadline for student to submit paymentRef. Set by manager at approval.';
COMMENT ON COLUMN bookings.pending_expires_at  IS 'Auto-drafted PENDING bookings: deadline before the system rejects and advances the waitlist.';
COMMENT ON COLUMN bookings.is_waitlist_draft   IS 'TRUE if this booking was auto-created by the waitlist promotion flow.';

-- Partial unique index — prevents a student booking the same room twice in
-- the same period while a prior booking is still active. Replaces the
-- dropped hard UNIQUE constraint; CANCELLED/REJECTED/EXPIRED rows are exempt
-- so students can re-apply.
CREATE UNIQUE INDEX idx_unique_active_room_booking
    ON bookings (student_id, room_id, academic_year, semester)
    WHERE status IN ('PENDING', 'APPROVED', 'CHECKED_IN');


/**
 * waitlists
 * Students queued for a (hostel, room_type, academic_year, semester) combo
 * that is currently fully booked — the "Goldilocks" scope prevents a student
 * waiting for a Single room being auto-drafted into a Double.
 *
 * `position` is the 1-based rank; position 1 is first in line. When a slot
 * opens, the service promotes position 1, notifies them via push, and
 * re-ranks the remaining entries.
 */
CREATE TABLE waitlists (
                           id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
                           student_id     UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
                           hostel_id      UUID        NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,

    -- Room type the student is waiting for: SINGLE | DOUBLE | TRIPLE | QUAD | DORMITORY
                           room_type      VARCHAR(15),

    -- Target academic year, e.g. "2025/2026".
                           academic_year  VARCHAR(9),

    -- Target semester: FIRST | SECOND | FULL.
                           semester       VARCHAR(20),

                           position       INTEGER     NOT NULL CHECK (position > 0),
                           joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Set to TRUE once a push notification has been dispatched.
                           notified       BOOLEAN     NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE  waitlists IS 'Ordered waitlist per (hostel, room_type, academic_year, semester). Position 1 is promoted first when a vacancy appears.';
COMMENT ON COLUMN waitlists.academic_year IS 'The target academic year this student is waiting for, e.g. "2025/2026".';
COMMENT ON COLUMN waitlists.semester      IS 'The target semester: FIRST | SECOND | FULL.';
COMMENT ON COLUMN waitlists.room_type     IS 'Room type the student is waiting for.';

-- Composite unique key: one active wait entry per student per exact scope.
CREATE UNIQUE INDEX idx_unique_waitlist_entry
    ON waitlists (student_id, hostel_id, room_type, academic_year, semester);


-- ---------------------------------------------------------------------------
-- 3. Complaints & Ticketing
-- ---------------------------------------------------------------------------

/**
 * complaints
 * Room- or hostel-level tickets raised by students.
 * `room_id` is nullable — some complaints are hostel-wide (e.g., generator issues).
 *
 * Java enums:
 *   com.leroy.hostelbackend.module.complaint.model.ComplaintStatus
 *     (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
 *   com.leroy.hostelbackend.module.complaint.model.ComplaintCategory
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
 * Upvote / downvote per user per complaint. Toggling is handled in the
 * service layer: re-submitting flips `is_upvote`.
 */
CREATE TABLE complaint_reactions (
                                     id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
                                     complaint_id  UUID        NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
                                     user_id       UUID        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,

    -- TRUE = upvote, FALSE = downvote.
                                     is_upvote     BOOLEAN     NOT NULL,

                                     created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                                     UNIQUE (complaint_id, user_id)
);


/**
 * complaint_attachments
 * Photos or documents uploaded as evidence for a complaint.
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
 * Hostel reviews gated by a real booking. The `booking_id` FK is the
 * authenticity guarantee — the service checks that the referenced booking
 * has status CHECKED_IN or CHECKED_OUT and belongs to the same student
 * before allowing a review to be created.
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
 *
 * `hostel_id` links a landmark directly to its primary hostel entity where
 * applicable (e.g., the hostel itself listed as a map pin), eliminating
 * self-distance calculations and data duplication.
 *
 * Java enum : com.leroy.hostelbackend.module.map.model.LandmarkCategory
 *   (ACADEMIC, LIBRARY, ADMINISTRATIVE, CAFETERIA, MEDICAL, SPORTS, HOSTEL, OTHER)
 */
CREATE TABLE landmarks (
                           id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                           name         VARCHAR(200) NOT NULL,

    -- Values: ACADEMIC | LIBRARY | ADMINISTRATIVE | CAFETERIA | MEDICAL | SPORTS | HOSTEL | OTHER
                           category     VARCHAR(20)  NOT NULL DEFAULT 'OTHER',

                           location     GEOMETRY(POINT, 4326) NOT NULL,

    -- Links this landmark directly to its primary hostel, if any.
                           hostel_id    UUID         REFERENCES hostels(id) ON DELETE CASCADE,

                           description  TEXT,
                           created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  landmarks IS 'UCC campus landmarks with PostGIS coordinates for map distance queries.';
COMMENT ON COLUMN landmarks.category  IS 'Java enum LandmarkCategory: ACADEMIC|LIBRARY|ADMINISTRATIVE|CAFETERIA|MEDICAL|SPORTS|HOSTEL|OTHER';
COMMENT ON COLUMN landmarks.hostel_id IS 'Links a landmark directly to its primary hostel entity to eliminate self-distance calculations and data duplication.';


-- ---------------------------------------------------------------------------
-- 6. Roommate Matching
-- ---------------------------------------------------------------------------

/**
 * student_preferences
 * Lifestyle tags used for roommate matching suggestions.
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
-- 7. Notifications & Push
-- ---------------------------------------------------------------------------

/**
 * notifications
 * Persisted notification records for the in-app notification centre.
 *
 * Delivery path:
 *   1. NotificationService creates a row here.
 *   2. WebSocket (STOMP) pushes it live to the connected client.
 *   3. Web Push (via push_subscriptions) delivers it offline.
 *
 * Java enum : com.leroy.hostelbackend.module.notification.model.NotificationType
 *   (BOOKING_APPROVED, BOOKING_REJECTED, BOOKING_CANCELLED,
 *    CHECKIN_REMINDER, WAITLIST_PROMOTED, COMPLAINT_UPDATED, GENERAL)
 */
CREATE TABLE notifications (
                               id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                               recipient_id UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                               title        VARCHAR(200) NOT NULL,
                               message      TEXT         NOT NULL,

    -- Values: BOOKING_APPROVED | BOOKING_REJECTED | BOOKING_CANCELLED |
    --         CHECKIN_REMINDER | WAITLIST_PROMOTED | COMPLAINT_UPDATED | GENERAL
                               type         VARCHAR(100) NOT NULL DEFAULT 'GENERAL',

                               is_read      BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Optional reference to the related domain entity (booking, complaint, etc.)
                               entity_id    UUID,
                               entity_type  VARCHAR(200),
                               navigate_url TEXT,
                               read_at      TIMESTAMPTZ,

                               created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  notifications IS 'Persisted notification records delivered via WebSocket and Web Push.';
COMMENT ON COLUMN notifications.type      IS 'Java enum NotificationType: BOOKING_APPROVED|BOOKING_REJECTED|BOOKING_CANCELLED|CHECKIN_REMINDER|WAITLIST_PROMOTED|COMPLAINT_UPDATED|GENERAL';
COMMENT ON COLUMN notifications.entity_id IS 'Optional UUID of the related booking, complaint, or other entity for frontend deep-linking.';


/**
 * push_subscriptions
 * Web Push API subscriptions (per browser/device) for offline notification
 * delivery. Replaces the old single fcm_token column on users — a user can
 * have many active subscriptions (multiple browsers/devices).
 */
CREATE TABLE push_subscriptions (
                                    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
                                    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                    endpoint   TEXT        NOT NULL UNIQUE,
                                    p256dh     TEXT        NOT NULL,   -- client public key
                                    auth       TEXT        NOT NULL,   -- client auth secret
                                    user_agent TEXT,
                                    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
                                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE push_subscriptions IS 'Web Push API subscriptions, one row per browser/device per user.';