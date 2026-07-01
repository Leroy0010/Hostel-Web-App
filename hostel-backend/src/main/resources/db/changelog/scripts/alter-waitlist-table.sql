-- =============================================================================
-- Hostel Booking System — Schema Migration v2
-- Run AFTER the initial schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop the hard unique constraint that blocked re-booking after rejection.
--    A student can now hold multiple bookings for different rooms.
-- ---------------------------------------------------------------------------
ALTER TABLE bookings
    DROP CONSTRAINT IF EXISTS bookings_student_id_academic_year_semester_key;

-- ---------------------------------------------------------------------------
-- 2. Add payment_expires_at
--    Set by the manager at approval. If the student does not submit paymentRef
--    before this time, BookingExpiredSweeper moves the booking to EXPIRED.
-- ---------------------------------------------------------------------------
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 3. Add pending_expires_at
--    Set when the system auto-drafts a PENDING booking for a waitlisted student.
--    If the manager does not action it in time, the sweeper rejects it and
--    promotes the next student in the waitlist.
-- ---------------------------------------------------------------------------
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS pending_expires_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 4. Flag auto-drafted waitlist bookings
--    TRUE when this booking was created by the waitlist promotion flow.
--    Surfaced on the manager dashboard so they can prioritise it.
-- ---------------------------------------------------------------------------
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS is_waitlist_draft BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN bookings.payment_expires_at IS
    'APPROVED bookings: payment reference submission deadline set by the manager.';
COMMENT ON COLUMN bookings.pending_expires_at IS
    'Waitlist-draft PENDING bookings: manager action window before auto-rejection.';
COMMENT ON COLUMN bookings.is_waitlist_draft IS
    'TRUE when this booking was auto-created by the waitlist promotion flow.';

-- ---------------------------------------------------------------------------
-- 5. Partial unique index — prevents booking the same room twice in the same
--    period. Replaces the hard UNIQUE constraint dropped above.
--    CANCELLED / REJECTED / EXPIRED rows are exempt so students can re-apply.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_room_booking
    ON bookings (student_id, room_id, academic_year, semester)
    WHERE status IN ('PENDING', 'APPROVED', 'CHECKED_IN');

-- ---------------------------------------------------------------------------
-- 6. Add period + room_type columns to waitlists
--    The waitlist is now scoped to (hostelId, roomType, academicYear, semester).
--    This prevents a student queuing for a Single room being auto-drafted into
--    a Double room when a bed opens up — the "Goldilocks" scope.
-- ---------------------------------------------------------------------------
ALTER TABLE waitlists
    ADD COLUMN IF NOT EXISTS academic_year VARCHAR(9);

ALTER TABLE waitlists
    ADD COLUMN IF NOT EXISTS semester      VARCHAR(20);

ALTER TABLE waitlists
    ADD COLUMN IF NOT EXISTS room_type     VARCHAR(15);

COMMENT ON COLUMN waitlists.academic_year IS 'Target academic year, e.g. "2025/2026".';
COMMENT ON COLUMN waitlists.semester      IS 'Target semester: FIRST | SECOND | FULL.';
COMMENT ON COLUMN waitlists.room_type     IS 'Room type the student is waiting for: SINGLE | DOUBLE | TRIPLE | QUAD | DORMITORY.';

-- Drop old hostel-only unique constraint and replace with the full composite key.
ALTER TABLE waitlists
    DROP CONSTRAINT IF EXISTS waitlists_student_id_hostel_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_waitlist_entry
    ON waitlists (student_id, hostel_id, room_type, academic_year, semester);

-- ---------------------------------------------------------------------------
-- 7. Sweeper indexes — keep both sweep queries fast
-- ---------------------------------------------------------------------------

-- Sweep 1: find APPROVED bookings with elapsed payment deadline
CREATE INDEX IF NOT EXISTS idx_bookings_payment_expires
    ON bookings (payment_expires_at)
    WHERE status = 'APPROVED' AND payment_expires_at IS NOT NULL;

-- Sweep 2: find waitlist-draft PENDING bookings with elapsed manager window
CREATE INDEX IF NOT EXISTS idx_bookings_pending_expires
    ON bookings (pending_expires_at)
    WHERE status = 'PENDING'
        AND is_waitlist_draft = TRUE
        AND pending_expires_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 8. Period-scoped capacity index
--    Backs the countReservedBeds query — the most-called query in the system.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_room_period_status
    ON bookings (room_id, academic_year, semester, status);

-- ---------------------------------------------------------------------------
-- 9. Waitlist composite index
--    Backs findNextInLine and count queries — called on every bed-release event.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_waitlists_period_type_position
    ON waitlists (hostel_id, room_type, academic_year, semester, position)
    WHERE notified = FALSE;