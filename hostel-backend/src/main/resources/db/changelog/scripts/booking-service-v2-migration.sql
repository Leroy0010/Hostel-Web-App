-- =============================================================================
-- Hostel Booking System — Schema Migration (Booking Flexibility Update)
-- Run as a Liquibase changeset AFTER the initial schema.sql
-- =============================================================================



-- ---------------------------------------------------------------------------
-- 3. Add pending_expires_at — set when the system auto-drafts a PENDING booking
--    for a waitlisted student. If the student (or manager) does not action it
--    within the window, the sweeper auto-rejects it and moves to the next in line.
-- ---------------------------------------------------------------------------
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS pending_expires_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 4. Mark auto-drafted waitlist bookings so the manager can see context.
-- ---------------------------------------------------------------------------
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS is_waitlist_draft BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN bookings.payment_expires_at IS
    'APPROVED bookings: deadline for student to submit paymentRef. Set by manager at approval.';
COMMENT ON COLUMN bookings.pending_expires_at IS
    'Auto-drafted PENDING bookings: deadline before the system rejects and advances the waitlist.';
COMMENT ON COLUMN bookings.is_waitlist_draft IS
    'TRUE if this booking was auto-created by the waitlist promotion flow.';

-- ---------------------------------------------------------------------------
-- 5. Partial unique index — prevents a student booking the same room twice
--    in the same period while the booking is still active.
--    Replaces the dropped hard UNIQUE constraint.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_room_booking
    ON bookings (student_id, room_id, academic_year, semester)
    WHERE status IN ('PENDING', 'APPROVED', 'CHECKED_IN');

-- ---------------------------------------------------------------------------
-- 6. Add academic_year + semester to waitlists
--    The waitlist is now period-scoped — a student can wait for the same hostel
--    for different semesters simultaneously.
-- ---------------------------------------------------------------------------
ALTER TABLE waitlists
    ADD COLUMN IF NOT EXISTS academic_year VARCHAR(9);

ALTER TABLE waitlists
    ADD COLUMN IF NOT EXISTS semester VARCHAR(20);

COMMENT ON COLUMN waitlists.academic_year IS 'The target academic year this student is waiting for, e.g. "2025/2026".';
COMMENT ON COLUMN waitlists.semester      IS 'The target semester: FIRST | SECOND | FULL.';

-- Drop the old hostel-only unique constraint and replace with period-scoped one
ALTER TABLE waitlists
    DROP CONSTRAINT IF EXISTS waitlists_student_id_hostel_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_waitlist_entry
    ON waitlists (student_id, hostel_id, academic_year, semester);

-- ---------------------------------------------------------------------------
-- 7. Index for the sweeper — quickly find expired APPROVED bookings
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_payment_expires
    ON bookings (payment_expires_at)
    WHERE status = 'APPROVED' AND payment_expires_at IS NOT NULL;

-- Index for auto-draft PENDING expiry sweep
CREATE INDEX IF NOT EXISTS idx_bookings_pending_expires
    ON bookings (pending_expires_at)
    WHERE status = 'PENDING' AND pending_expires_at IS NOT NULL AND is_waitlist_draft = TRUE;

-- ---------------------------------------------------------------------------
-- 8. Period-scoped capacity query index
--    Supports the countReservedBeds query efficiently
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_room_period_status
    ON bookings (room_id, academic_year, semester, status);