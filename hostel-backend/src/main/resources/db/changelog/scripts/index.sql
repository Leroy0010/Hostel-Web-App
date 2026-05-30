-- =============================================================================
-- Hostel Booking System — Indexes
-- University of Cape Coast
-- =============================================================================
-- Run AFTER schema.sql.
-- Strategy:
--   1. Foreign key columns — always index FKs that appear in JOIN conditions.
--   2. Filter/WHERE columns — status VARCHARs (formerly enums), boolean flags, date ranges.
--      All "enum-like" columns are VARCHAR enforced by Java enums (@Enumerated(EnumType.STRING)).
--      B-Tree indexes on these VARCHAR columns work identically to enum-typed columns.
--   3. Unique-constraint columns — already indexed by the UNIQUE constraint;
--      do NOT create a separate index (PostgreSQL does it automatically).
--   4. Spatial columns — use GiST for PostGIS GEOGRAPHY queries.
--   5. Full-text columns — GIN index on text arrays (tags).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

-- Fast login lookup by email (most common auth query)
CREATE INDEX idx_users_email
    ON users (email);

-- Role-based filtering (admin panels listing all students or managers)
CREATE INDEX idx_users_role
    ON users (role);

-- Lookup by student ID (e.g. self-service portal search)
CREATE INDEX idx_users_student_id
    ON users (student_id)
    WHERE student_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- hostels
-- ---------------------------------------------------------------------------

-- Spatial index: fast ST_Distance / ST_DWithin queries (map feature)
-- GiST is required for PostGIS geography columns
CREATE INDEX idx_hostels_location
    ON hostels USING GIST (location);

-- Filter active hostels (most queries exclude inactive ones)
CREATE INDEX idx_hostels_is_active
    ON hostels (is_active)
    WHERE is_active = TRUE;

-- FK: join to manager user
CREATE INDEX idx_hostels_manager_id
    ON hostels (manager_id);


-- ---------------------------------------------------------------------------
-- rooms
-- ---------------------------------------------------------------------------

-- FK: most queries filter rooms by hostel first
CREATE INDEX idx_rooms_hostel_id
    ON rooms (hostel_id);

-- Status filtering: students search for AVAILABLE rooms
CREATE INDEX idx_rooms_status
    ON rooms (status);

-- Composite: hostel + status — the most common availability query
-- "Give me all AVAILABLE rooms in hostel X"
CREATE INDEX idx_rooms_hostel_status
    ON rooms (hostel_id, status);

-- Room type filtering (students browse by type)
CREATE INDEX idx_rooms_room_type
    ON rooms (room_type);

-- Price range filtering (students sort/filter by price)
CREATE INDEX idx_rooms_price
    ON rooms (price_per_semester);


-- ---------------------------------------------------------------------------
-- room_amenities
-- ---------------------------------------------------------------------------

-- FK: look up amenities for a given room
CREATE INDEX idx_room_amenities_room_id
    ON room_amenities (room_id);


-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------

-- FK: student's booking history
CREATE INDEX idx_bookings_student_id
    ON bookings (student_id);

-- FK: all bookings for a room (manager's view, occupancy check)
CREATE INDEX idx_bookings_room_id
    ON bookings (room_id);

-- Status filtering: managers filter PENDING bookings to act on
CREATE INDEX idx_bookings_status
    ON bookings (status);

-- Composite: student + status — "Does this student have an active booking?"
-- Used by the concurrency guard before creating a new booking
CREATE INDEX idx_bookings_student_status
    ON bookings (student_id, status)
    WHERE status IN ('PENDING', 'APPROVED', 'CHECKED_IN');

-- Composite: room + academic period — prevents duplicate allocations per semester
CREATE INDEX idx_bookings_room_year_semester
    ON bookings (room_id, academic_year, semester);

-- Time-based queries (admin analytics, dashboard date filters)
CREATE INDEX idx_bookings_requested_at
    ON bookings (requested_at DESC);

-- FK: who approved the booking
CREATE INDEX idx_bookings_approved_by
    ON bookings (approved_by)
    WHERE approved_by IS NOT NULL;


-- ---------------------------------------------------------------------------
-- waitlists
-- ---------------------------------------------------------------------------

-- FK: all waitlist entries for a hostel (ordered by position for promotion)
CREATE INDEX idx_waitlists_hostel_id
    ON waitlists (hostel_id);

-- FK: a student's waitlist entries
CREATE INDEX idx_waitlists_student_id
    ON waitlists (student_id);

-- Composite: next-in-line query — "WHO is position 1 on hostel X, not yet notified?"
CREATE INDEX idx_waitlists_hostel_position
    ON waitlists (hostel_id, position)
    WHERE notified = FALSE;


-- ---------------------------------------------------------------------------
-- complaints
-- ---------------------------------------------------------------------------

-- FK: complaints raised against a hostel (manager's dashboard)
CREATE INDEX idx_complaints_hostel_id
    ON complaints (hostel_id);

-- FK: complaints by a student (student's my-complaints page)
CREATE INDEX idx_complaints_author_id
    ON complaints (author_id);

-- FK: complaints for a specific room
CREATE INDEX idx_complaints_room_id
    ON complaints (room_id)
    WHERE room_id IS NOT NULL;

-- Status filtering: managers filter OPEN / IN_PROGRESS complaints
CREATE INDEX idx_complaints_status
    ON complaints (status);

-- Category filtering: route complaints to the right handler
CREATE INDEX idx_complaints_category
    ON complaints (category);

-- Composite: hostel + status — the manager's primary dashboard query
CREATE INDEX idx_complaints_hostel_status
    ON complaints (hostel_id, status);

-- Time ordering (most recent complaints first)
CREATE INDEX idx_complaints_created_at
    ON complaints (created_at DESC);


-- ---------------------------------------------------------------------------
-- complaint_reactions
-- ---------------------------------------------------------------------------

-- FK: all reactions on a complaint (vote-count aggregation)
CREATE INDEX idx_complaint_reactions_complaint_id
    ON complaint_reactions (complaint_id);

-- FK: all reactions by a user (check if user has already voted)
CREATE INDEX idx_complaint_reactions_user_id
    ON complaint_reactions (user_id);


-- ---------------------------------------------------------------------------
-- complaint_attachments
-- ---------------------------------------------------------------------------

-- FK: attachments for a complaint
CREATE INDEX idx_complaint_attachments_complaint_id
    ON complaint_attachments (complaint_id);


-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

-- FK: all reviews for a hostel (public review feed)
CREATE INDEX idx_reviews_hostel_id
    ON reviews (hostel_id);

-- FK: reviews by a student
CREATE INDEX idx_reviews_author_id
    ON reviews (author_id);

-- FK: lookup by booking (enforce one-review-per-booking)
CREATE INDEX idx_reviews_booking_id
    ON reviews (booking_id);

-- Rating distribution queries (analytics)
CREATE INDEX idx_reviews_rating
    ON reviews (rating);


-- ---------------------------------------------------------------------------
-- landmarks
-- ---------------------------------------------------------------------------

-- Spatial index: fast ST_Distance queries from the map feature
-- "How far is this hostel from the Sam Jonah Library?"
CREATE INDEX idx_landmarks_location
    ON landmarks USING GIST (location);

-- Category filtering (filter landmarks by type on the map)
CREATE INDEX idx_landmarks_category
    ON landmarks (category);


-- ---------------------------------------------------------------------------
-- student_preferences
-- ---------------------------------------------------------------------------

-- FK: lookup preferences for a student
CREATE INDEX idx_student_preferences_student_id
    ON student_preferences (student_id);

-- GIN index on the tags TEXT array — enables fast overlap queries
-- "Find students whose tags overlap with ARRAY['Quiet', 'Neat']"
-- Used for roommate matching suggestions
CREATE INDEX idx_student_preferences_tags
    ON student_preferences USING GIN (tags);


-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

-- FK: all notifications for a user (notification centre)
CREATE INDEX idx_notifications_user_id
    ON notifications (user_id);

-- Unread notifications filter (badge count, notification dot)
CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id, is_read)
    WHERE is_read = FALSE;

-- Time ordering (most recent first in the notification centre)
CREATE INDEX idx_notifications_created_at
    ON notifications (created_at DESC);

-- Type-based filtering (e.g., only show booking-related notifications)
CREATE INDEX idx_notifications_type
    ON notifications (type);