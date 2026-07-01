package com.leroy.hostelbackend.module.hostel.projection;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public interface HostelDetailFlatProjection {
    UUID getHostelId();
    String getHostelName();
    String getHostelAddress();
    String getHostelDescription();
    String getHostelGenderPolicy();
    String getHostelImageUrl();
    Boolean getHostelIsActive();
    Double getHostelLatitude();
    Double getHostelLongitude();
    LocalDateTime getHostelCreatedAt();
    LocalDateTime getHostelUpdatedAt();

    UUID getManagerId();
    String getManagerFirstName();
    String getManagerLastName();
    String getManagerEmail();
    String getManagerPhone();

    UUID getRoomId();
    String getRoomNumber();
    String getRoomType();
    Short getCapacity();
    BigDecimal getPricePerSemester();
    Short getFloorNumber();
    String getRoomImageUrl();
    String getAcademicYear();
    String getSemester();
}