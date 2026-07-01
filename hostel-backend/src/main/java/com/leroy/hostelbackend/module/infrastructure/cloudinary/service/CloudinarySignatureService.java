package com.leroy.hostelbackend.module.infrastructure.cloudinary.service;

import com.cloudinary.Cloudinary;
import com.leroy.hostelbackend.module.infrastructure.cloudinary.dto.CloudinarySignatureDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CloudinarySignatureService {
    private final Cloudinary cloudinary;

    @Value("${cloudinary.api-key}")
    private String apiKey;

    @Value("${cloudinary.api-secret}")
    private String apiSecret;

    /**
     * Generates a signature for client-side uploads.
     * @param folder The target folder in Cloudinary (e.g., "rooms", "hostels")
     */
    public CloudinarySignatureDto generateSignature(String folder) {
        long timestamp = Instant.now().getEpochSecond();

        // Parameters to sign MUST match exactly what the frontend sends
        Map<String, Object> paramsToSign = new HashMap<>();
        paramsToSign.put("folder", folder);
        paramsToSign.put("timestamp", timestamp);

        // Generate the SHA-1 signature using your secret
        String signature = cloudinary.apiSignRequest(paramsToSign, apiSecret);

        return new CloudinarySignatureDto(signature, timestamp, apiKey, folder);
    }
}