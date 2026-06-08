package com.leroy.hostelbackend.module.auth.dto;

import com.leroy.hostelbackend.module.user.dto.UserResponse;
import lombok.Data;

@Data
public class LoginResponse {
    private UserResponse user;
    private String token;
}
