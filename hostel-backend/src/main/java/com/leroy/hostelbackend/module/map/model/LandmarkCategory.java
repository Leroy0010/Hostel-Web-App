package com.leroy.hostelbackend.module.map.model;

/**
 * Category of a campus landmark.
 * Stored as VARCHAR in {@code landmarks.category}.
 * Used by the map frontend to render the correct icon per point of interest.
 */
public enum LandmarkCategory {

    /** Lecture halls, faculties, departments — e.g. N-Block, Cape Coast Poly. */
    ACADEMIC,

    /** Library buildings — e.g. Sam Jonah Library. */
    LIBRARY,

    /** Administrative offices — Registry, Vice-Chancellor's office, etc. */
    ADMINISTRATIVE,

    /** Cafeterias, restaurants, canteens on campus. */
    CAFETERIA,

    /** Health centre, clinic, hospital. */
    MEDICAL,

    /** Sports facilities — stadium, gym, courts. */
    SPORTS,

    /** Hostel / accommodation blocks displayed on the map. */
    HOSTEL,

    /** ATM, chapel, printing centre, or anything else of interest. */
    OTHER
}