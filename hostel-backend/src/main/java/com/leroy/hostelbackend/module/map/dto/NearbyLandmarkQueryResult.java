package com.leroy.hostelbackend.module.map.dto;

import com.leroy.hostelbackend.module.map.model.LandmarkCategory;
import java.util.UUID;

public interface NearbyLandmarkQueryResult {
    UUID getId();
    String getName();
    LandmarkCategory getCategory();
    String getDescription();
    Double getLatitude();
    Double getLongitude();
    UUID getHostelId();
    Double getDistanceMetres();
}