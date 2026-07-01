package com.leroy.hostelbackend.module.infrastructure.cloudinary.controller;

import com.leroy.hostelbackend.module.infrastructure.cloudinary.dto.CloudinarySignatureDto;
import com.leroy.hostelbackend.module.infrastructure.cloudinary.service.CloudinarySignatureService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cloudinary")
@RequiredArgsConstructor
@Tag(name = "Cloudinary")
public class CloudinaryController {

    private final CloudinarySignatureService signatureService;

    // Ensure only authenticated users (e.g., Managers/Admins) can request signatures
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN', 'STUDENT')")
    @GetMapping("/signature")
    public CloudinarySignatureDto getSignature(@RequestParam String folder) {
        return signatureService.generateSignature(folder);
    }
}