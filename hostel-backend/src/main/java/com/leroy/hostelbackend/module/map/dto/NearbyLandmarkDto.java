package com.leroy.hostelbackend.module.map.dto;

/**
 * A nearby landmark with its distance from a reference hostel.
 * Used in the "nearby landmarks" card on the hostel detail page.
 *
 * @param landmark        the landmark detail
 * @param distanceMetres  distance from the hostel in metres
 * @param distanceKm      distance in kilometres, rounded to 2 dp
 * @param walkingMinutes  estimated walking time at 5 km/h, rounded up
 */
public record NearbyLandmarkDto(
        LandmarkDto landmark,
        double distanceMetres,
        double distanceKm,
        int    walkingMinutes
) {}
