package com.leroy.hostelbackend.module.map.dto;

import java.util.UUID;

/**
 * Distance calculation result between a hostel and a landmark.
 *
 * @param hostelId        UUID of the hostel
 * @param hostelName      display name of the hostel
 * @param landmarkId      UUID of the landmark
 * @param landmarkName    display name of the landmark
 * @param distanceMetres  straight-line distance in metres
 * @param distanceKm      same distance in kilometres, rounded to 2 dp
 * @param walkingMinutes  estimated walking time at 5 km/h, rounded up
 */
public record DistanceDto(
        UUID   hostelId,
        String hostelName,
        UUID   landmarkId,
        String landmarkName,
        double distanceMetres,
        double distanceKm,
        int    walkingMinutes
) {}
