ALTER TABLE bookings
DROP CONSTRAINT bookings_student_id_academic_year_semester_key;

ALTER TABLE users
DROP COLUMN fcm_token;