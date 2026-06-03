package com.leroy.hostelbackend.module.notification.mapper;

import com.leroy.hostelbackend.module.notification.dto.NotificationResponse;
import com.leroy.hostelbackend.module.notification.model.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct mapper for {@link Notification} → {@link NotificationResponse}.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface NotificationMapper {
    NotificationResponse toResponse(Notification entity);
}