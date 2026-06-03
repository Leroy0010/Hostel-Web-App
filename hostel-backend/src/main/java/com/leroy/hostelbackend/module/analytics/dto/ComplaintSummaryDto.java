package com.leroy.hostelbackend.module.analytics.dto;

import com.leroy.hostelbackend.module.complaint.model.ComplaintCategory;

import java.util.List;

/**
 * Complaint analytics — helps managers spot recurring issues.
 *
 * @param totalOpen        complaints with status OPEN
 * @param totalInProgress  complaints being worked on
 * @param totalResolved    resolved complaints
 * @param totalClosed      closed complaints
 * @param byCategory       breakdown by complaint category
 */
public record ComplaintSummaryDto(
        long                        totalOpen,
        long                        totalInProgress,
        long                        totalResolved,
        long                        totalClosed,
        List<CategoryBreakdownDto>  byCategory
) {
    /**
     * Number of complaints per category.
     *
     * @param category   complaint category name
     * @param count      total complaints in this category (all statuses)
     * @param openCount  still-open complaints in this category
     */
    public record CategoryBreakdownDto(ComplaintCategory category, long count, long openCount) {}
}
