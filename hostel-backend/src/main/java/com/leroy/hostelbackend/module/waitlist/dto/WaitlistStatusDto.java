package com.leroy.hostelbackend.module.waitlist.dto;

/**
 * Waitlist status response for a student checking their own position.
 *
 * @param onWaitlist   whether the student is on this queue
 * @param position     their 1-based rank (null if not on the list)
 * @param totalInQueue total entries in this queue
 * @param roomType     the room type they are queued for
 * @param academicYear the period
 * @param semester     the semester
 */
public record WaitlistStatusDto(
        boolean onWaitlist,
        Integer position,
        long    totalInQueue,
        String  roomType,
        String  academicYear,
        String  semester
) {}