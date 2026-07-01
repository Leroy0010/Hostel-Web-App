package com.leroy.hostelbackend.module.user.dto;

import com.leroy.hostelbackend.module.user.model.UserRole;
import lombok.Data;

import java.util.UUID;

@Data
public class UserSummary {
    private UUID id;
    private String name;
    private String email;
    private UserRole role;
}
