package com.leroy.hostelbackend.module.waitlist.dto;

/**
 * Summary returned to a student checking whether they are on a specific hostel's waitlist.
 */
public record WaitlistStatusDto(
        boolean onWaitlist,
        Integer position,        // null if not on waitlist
        long totalInQueue        // total students ahead — helps student gauge wait time
) {}
