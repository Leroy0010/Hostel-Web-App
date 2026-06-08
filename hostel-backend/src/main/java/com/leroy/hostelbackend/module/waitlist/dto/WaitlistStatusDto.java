package com.leroy.hostelbackend.module.waitlist.dto;


/**
 * Status check response for a student querying their own waitlist position.
 *
 * @param onWaitlist   whether the student is on the list for this hostel+period
 * @param position     their position (null if not on waitlist)
 * @param totalInQueue total students ahead of position 1 — helps gauge wait time
 * @param academicYear the period this status applies to
 * @param semester     the semester this status applies to
 */
public record WaitlistStatusDto(
        boolean onWaitlist,
        Integer position,
        long    totalInQueue,
        String  academicYear,
        String  semester
) {}