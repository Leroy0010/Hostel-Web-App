package com.leroy.hostelbackend.module.email.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.core.io.Resource;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailRequest {
    private String toEmail;
    private String subject;
    private String templateName;

    @Builder.Default
    private Map<String, Object> contextVariables = new HashMap<>();

    private String textContent;

    @Builder.Default
    private boolean isHtml = true;

    @Builder.Default
    private List<Resource> attachments = new ArrayList<>();

    private String[] cc;
    private String[] bcc;
}