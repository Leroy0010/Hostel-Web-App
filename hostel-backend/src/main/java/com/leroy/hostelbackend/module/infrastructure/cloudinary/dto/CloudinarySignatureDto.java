package com.leroy.hostelbackend.module.infrastructure.cloudinary.dto;

public record CloudinarySignatureDto(
        String signature,
        long timestamp,
        String apiKey,
        String folder
) {}