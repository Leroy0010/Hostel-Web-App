package com.leroy.hostelbackend.module.auth.mapper;

import com.leroy.hostelbackend.module.auth.dto.LoginResponse;
import com.leroy.hostelbackend.module.user.dto.UserResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AuthMapper {
    @Mapping(target = "user", source = "user")
    @Mapping(target = "token", source = "token")
    LoginResponse toLoginResponse(UserResponse user, String token);
}
