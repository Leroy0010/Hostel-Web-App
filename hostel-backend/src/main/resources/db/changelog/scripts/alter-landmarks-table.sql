-- 1. Add the foreign key column to link landmarks to hostels
ALTER TABLE landmarks
    ADD COLUMN hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE;

-- 2. Add an index to keep lookups fast
CREATE INDEX idx_landmarks_hostel_id ON landmarks(hostel_id);

-- 3. Add a comment for future-proofing documentation
COMMENT ON COLUMN landmarks.hostel_id IS 'Links a landmark directly to its primary hostel entity to eliminate self-distance calculations and data duplication.';