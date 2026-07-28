package com.leroy.hostelbackend.module.hostel.projection;

import java.math.BigDecimal;
import java.util.UUID;

public interface HostelRoomFlatProjection {
    // Hostel details
    UUID getHostelId();
    String getHostelName();
    String getHostelAddress();
    String getHostelGenderPolicy();
    String getHostelImageUrl();
    Boolean getHostelIsActive();

    // Room details
    UUID getRoomId();
    String getRoomNumber();
    String getRoomType();
    Short getCapacity();
    BigDecimal getPrice();
    Short getFloorNumber();
    String getRoomImageUrl();

    // Period details
    String getAcademicYear();
    String getSemester();
}