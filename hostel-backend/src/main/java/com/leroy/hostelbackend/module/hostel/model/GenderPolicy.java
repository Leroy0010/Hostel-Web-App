package com.leroy.hostelbackend.module.hostel.model;

/**
 * Gender occupancy policy of a hostel.<p>
 * Maps to: hostels.gender_policy (VARCHAR 15)
 */
public enum GenderPolicy {
    /** Accommodation restricted to male students only. */
    MALE_ONLY,

    /** Accommodation restricted to female students only. */
    FEMALE_ONLY,

    /** Open to students of any gender. */
    MIXED
}