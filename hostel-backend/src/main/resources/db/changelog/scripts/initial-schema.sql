-- =============================================================================
-- Hostel Booking System — Final Consolidated Indexes
-- University of Cape Coast — Leroy Hostels
-- =============================================================================
-- Run AFTER initial-schema.sql.
-- Note: unique constraint indexes that enforce business rules
-- (idx_unique_active_room_booking, idx_unique_waitlist_entry) live in the
-- schema file next to the tables they constrain — not duplicated here.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role  ON users (role);

-- ---------------------------------------------------------------------------
-- auth_tokens / refresh_tokens
-- ---------------------------------------------------------------------------
CREATE INDEX idx_auth_tokens_user_id     ON auth_tokens (user_id);
CREATE INDEX idx_auth_tokens_expires_at  ON auth_tokens (expires_at);

CREATE INDEX idx_refresh_tokens_token       ON refresh_tokens (token);
CREATE INDEX idx_refresh_tokens_user_id     ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at  ON refresh_tokens (expires_at);

-- ---------------------------------------------------------------------------
-- hostels
-- ---------------------------------------------------------------------------
CREATE INDEX idx_hostels_location   ON hostels USING GIST (location);
CREATE INDEX idx_hostels_is_active  ON hostels (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_hostels_manager_id ON hostels (manager_id);

-- ---------------------------------------------------------------------------
-- rooms
-- ---------------------------------------------------------------------------
CREATE INDEX idx_rooms_hostel_id     ON rooms (hostel_id);
CREATE INDEX idx_rooms_status        ON rooms (status);
CREATE INDEX idx_rooms_hostel_status ON rooms (hostel_id, status);
CREATE INDEX idx_rooms_room_type     ON rooms (room_type);
CREATE INDEX idx_rooms_price         ON rooms (price_per_semester);

-- ---------------------------------------------------------------------------
-- room_amenities
-- ---------------------------------------------------------------------------
CREATE INDEX idx_room_amenities_room_id ON room_amenities (room_id);

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
CREATE INDEX idx_bookings_student_id ON bookings (student_id);
CREATE INDEX idx_bookings_room_id    ON bookings (room_id);
CREATE INDEX idx_bookings_status     ON bookings (status);

CREATE INDEX idx_bookings_student_status
    ON bookings (student_id, status)
    WHERE status IN ('PENDING', 'APPROVED', 'CHECKED_IN');

CREATE INDEX idx_bookings_room_year_semester
    ON bookings (room_id, academic_year, semester);

-- Backs the countReservedBeds query — the most-called query in the system.
CREATE INDEX idx_bookings_room_period_status
    ON bookings (room_id, academic_year, semester, status);

CREATE INDEX idx_bookings_requested_at ON bookings (requested_at DESC);

CREATE INDEX idx_bookings_approved_by
    ON bookings (approved_by)
    WHERE approved_by IS NOT NULL;

-- Sweep 1: APPROVED bookings with elapsed payment deadline
CREATE INDEX idx_bookings_payment_expires
    ON bookings (payment_expires_at)
    WHERE status = 'APPROVED' AND payment_expires_at IS NOT NULL;

-- Sweep 2: waitlist-draft PENDING bookings with elapsed manager window
CREATE INDEX idx_bookings_pending_expires
    ON bookings (pending_expires_at)
    WHERE status = 'PENDING'
        AND is_waitlist_draft = TRUE
        AND pending_expires_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- waitlists
-- ---------------------------------------------------------------------------
CREATE INDEX idx_waitlists_hostel_id  ON waitlists (hostel_id);
CREATE INDEX idx_waitlists_student_id ON waitlists (student_id);

-- Backs findNextInLine and count queries — called on every bed-release event.
CREATE INDEX idx_waitlists_period_type_position
    ON waitlists (hostel_id, room_type, academic_year, semester, position)
    WHERE notified = FALSE;

-- ---------------------------------------------------------------------------
-- complaints
-- ---------------------------------------------------------------------------
CREATE INDEX idx_complaints_hostel_id ON complaints (hostel_id);
CREATE INDEX idx_complaints_author_id ON complaints (author_id);

CREATE INDEX idx_complaints_room_id
    ON complaints (room_id)
    WHERE room_id IS NOT NULL;

CREATE INDEX idx_complaints_status        ON complaints (status);
CREATE INDEX idx_complaints_category      ON complaints (category);
CREATE INDEX idx_complaints_hostel_status ON complaints (hostel_id, status);
CREATE INDEX idx_complaints_created_at    ON complaints (created_at DESC);

-- ---------------------------------------------------------------------------
-- complaint_reactions / complaint_attachments
-- ---------------------------------------------------------------------------
CREATE INDEX idx_complaint_reactions_complaint_id ON complaint_reactions (complaint_id);
CREATE INDEX idx_complaint_reactions_user_id      ON complaint_reactions (user_id);
CREATE INDEX idx_complaint_attachments_complaint_id ON complaint_attachments (complaint_id);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
CREATE INDEX idx_reviews_hostel_id  ON reviews (hostel_id);
CREATE INDEX idx_reviews_author_id  ON reviews (author_id);
CREATE INDEX idx_reviews_booking_id ON reviews (booking_id);
CREATE INDEX idx_reviews_rating     ON reviews (rating);

-- ---------------------------------------------------------------------------
-- landmarks
-- ---------------------------------------------------------------------------
CREATE INDEX idx_landmarks_location  ON landmarks USING GIST (location);
CREATE INDEX idx_landmarks_category  ON landmarks (category);
CREATE INDEX idx_landmarks_hostel_id ON landmarks (hostel_id);

-- ---------------------------------------------------------------------------
-- student_preferences
-- ---------------------------------------------------------------------------
CREATE INDEX idx_student_preferences_student_id ON student_preferences (student_id);
CREATE INDEX idx_student_preferences_tags ON student_preferences USING GIN (tags);

-- ---------------------------------------------------------------------------
-- notifications / push_subscriptions
-- ---------------------------------------------------------------------------
CREATE INDEX idx_notifications_recipient_id ON notifications (recipient_id);

CREATE INDEX idx_notifications_recipient_unread
    ON notifications (recipient_id, is_read)
    WHERE is_read = FALSE;

CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);
CREATE INDEX idx_notifications_type       ON notifications (type);

CREATE INDEX idx_push_subs_user_active ON push_subscriptions (user_id) WHERE is_active = TRUE;