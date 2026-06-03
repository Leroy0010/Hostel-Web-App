package com.leroy.hostelbackend.module.analytics.dto;

/**
 * Waitlist depth per hostel — shows demand signal for capacity planning.
 *
 * @param hostelId    hostel UUID (as String for JSON serialisation convenience)
 * @param hostelName  hostel display name
 * @param queueDepth  number of students currently waiting
 */
public record WaitlistDepthDto(
        String hostelId,
        String hostelName,
        long   queueDepth
) {}
