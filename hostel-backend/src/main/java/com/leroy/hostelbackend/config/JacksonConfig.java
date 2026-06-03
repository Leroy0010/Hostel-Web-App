package com.leroy.hostelbackend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.TimeZone;

@Configuration
public class JacksonConfig {

    @Bean
    @Primary // Ensures this ObjectMapper is the default one used throughout the app
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();

        // 1. Register the JavaTimeModule (JSR310 support)
        mapper.registerModule(new JavaTimeModule());

        // 2. Disable writing dates as timestamps globally (affects java.util.Date)
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // 3. Configure JSR310 types (LocalDateTime, etc.) to serialize as ISO-8601 strings
        // This explicitly ensures array format is not used for LocalDateTime
        mapper.disable(SerializationFeature.WRITE_DATE_TIMESTAMPS_AS_NANOSECONDS);
        mapper.enable(SerializationFeature.WRITE_DATES_WITH_ZONE_ID); // Optional: adds TimeZone info to the string

        // 4. Set TimeZone to UTC for consistency
        mapper.setTimeZone(TimeZone.getTimeZone("UTC"));

        // If you need a specific, non-ISO format for java.util.Date, you could set:
        // mapper.setDateFormat(new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"));
        // Otherwise, the default ISO-8601 string format is used, which is generally best practice.

        System.out.println("=== Custom ObjectMapper Bean Created with ISO-8601 string format ===");
        return mapper;
    }
}
