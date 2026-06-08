package com.leroy.hostelbackend.module.email.service;


import com.leroy.hostelbackend.module.email.dto.EmailRequest;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.nio.charset.StandardCharsets;
import java.time.Year;
import java.util.*;

@Log4j2
@Service
@RequiredArgsConstructor
public class EmailService  {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String senderEmail;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @Value("${app.frontend.password-setup-url}")
    private String frontendPasswordSetupUrl;

    @Value("${app.frontend.verify-email-url}")
    private String frontendEmailVerificationUrl;


    @Async("notificationExecutor")
    public void sendStudentVerificationEmail(String toEmail, String userName, String token) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("userName", userName);
        variables.put("currentYear", Year.now());
        // Point this directly to a simple verification page or backend endpoint
        variables.put("secureLink", buildFrontendUrl(frontendEmailVerificationUrl + "?token=" + token));

        EmailRequest emailRequest = EmailRequest.builder()
                .toEmail(toEmail)
                .subject("Please Verify Your Student Account")
                .templateName("student-verification") // Customize text to say "Verify Email"
                .contextVariables(variables)
                .isHtml(true)
                .build();

        sendEmail(emailRequest);
    }

    @Async("notificationExecutor")
    public void sendStaffActivationEmail(String toEmail, String userName, String token) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("userName", userName);
        variables.put("currentYear", Year.now());
        // Point this to a password setup page
        variables.put("secureLink", buildFrontendUrl(frontendPasswordSetupUrl + "?token=" + token + "&type=activation"));

        EmailRequest emailRequest = EmailRequest.builder()
                .toEmail(toEmail)
                .subject("Welcome! Setup Your Staff Account")
                .templateName("staff-activation") // Customize text to say "Setup Password"
                .contextVariables(variables)
                .isHtml(true)
                .build();

        sendEmail(emailRequest);
    }


    @Async
    public void sendPasswordResetEmail(String toEmail, String userName, String token) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("userName", userName);
        variables.put("resetLink", buildFrontendUrl(frontendPasswordSetupUrl + "?token=" + token + "&type=reset"));

        sendTemplatedEmail(toEmail,
                "Password Reset Request for Hostel Management System",
                "password-reset",
                variables
        );
    }

    
    @Async("notificationExecutor")
    public void sendGeneralNotificationEmail(String toEmail, String subject, String messageContent, String recipientName) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("recipientName", recipientName);
        variables.put("subject", subject);
        variables.put("messageContent", messageContent);
        variables.put("currentYear", Year.now());

        sendTemplatedEmail(toEmail, subject, "general-notification", variables);
    }


    @Async
    public void sendTemplatedEmail(String toEmail, String subject, String templateName, Object contextVariables) {
        EmailRequest emailRequest = EmailRequest.builder()
                .toEmail(toEmail)
                .subject(subject)
                .templateName(templateName)
                .contextVariables(contextVariables instanceof Map ? (Map<String, Object>) contextVariables : new HashMap<>())
                .isHtml(true)
                .build();

        sendEmail(emailRequest);
    }

    
    @Async
    public void sendSimpleEmail(String toEmail, String subject, String textContent, boolean isHtml) {
        EmailRequest emailRequest = EmailRequest.builder()
                .toEmail(toEmail)
                .subject(subject)
                .textContent(textContent)
                .isHtml(isHtml)
                .build();

        sendEmail(emailRequest);
    }

    // UPDATED: Now uses List<Resource>
    
    @Async
    public void sendEmailWithAttachments(String toEmail, String subject, String templateName,
                                         Map<String, Object> contextVariables, List<Resource> attachments) {
        EmailRequest emailRequest = EmailRequest.builder()
                .toEmail(toEmail)
                .subject(subject)
                .templateName(templateName)
                .contextVariables(contextVariables != null ? contextVariables : new HashMap<>())
                .attachments(attachments)
                .isHtml(true)
                .build();

        sendEmail(emailRequest);
    }

    
    @Async("notificationExecutor")
    public void sendBulkEmail(List<String> toEmails, String subject, String templateName,
                              Map<String, Object> contextVariables) {
        if (toEmails == null || toEmails.isEmpty()) {
            log.warn("No recipients provided for bulk email");
            return;
        }

        for (String toEmail : toEmails) {
            sendTemplatedEmail(toEmail, subject, templateName, contextVariables);
        }

        log.info("Sent bulk email to {} recipients with subject: {}", Optional.of(toEmails.size()), subject);
    }

    
    @Async
    public void sendEmailWithCcBcc(String toEmail, String subject, String templateName,
                                   Map<String, Object> contextVariables, String[] cc, String[] bcc) {
        EmailRequest emailRequest = EmailRequest.builder()
                .toEmail(toEmail)
                .subject(subject)
                .templateName(templateName)
                .contextVariables(contextVariables != null ? contextVariables : new HashMap<>())
                .cc(cc)
                .bcc(bcc)
                .isHtml(true)
                .build();

        sendEmail(emailRequest);
    }

    
    @Async
    public void sendEmail(EmailRequest emailRequest) {
        try {
            MimeMessage mimeMessage = createMimeMessage();
            MimeMessageHelper helper = prepareMimeMessageHelper(mimeMessage);

            helper.setTo(emailRequest.getToEmail());
            helper.setFrom(senderEmail, "Hostel Management System - UCC");
            helper.setSubject(emailRequest.getSubject());

            if (emailRequest.getCc() != null && emailRequest.getCc().length > 0) {
                helper.setCc(emailRequest.getCc());
            }
            if (emailRequest.getBcc() != null && emailRequest.getBcc().length > 0) {
                helper.setBcc(emailRequest.getBcc());
            }

            if (emailRequest.getTemplateName() != null && !emailRequest.getTemplateName().trim().isEmpty()) {
                Map<String, Object> contextVariables = emailRequest.getContextVariables() != null ?
                        emailRequest.getContextVariables() : new HashMap<>();
                String htmlContent = processTemplate(emailRequest.getTemplateName(), contextVariables);
                helper.setText(htmlContent, true);
            } else if (emailRequest.getTextContent() != null) {
                helper.setText(emailRequest.getTextContent(), emailRequest.isHtml());
            } else {
                throw new IllegalArgumentException("Either templateName or textContent must be provided");
            }

            // UPDATED: Process attachments as Spring Resources
            if (emailRequest.getAttachments() != null && !emailRequest.getAttachments().isEmpty()) {
                for (Resource attachment : emailRequest.getAttachments()) {
                    if (attachment.exists() && attachment.isReadable()) {
                        // getFilename() extracts the name with extension to display in the email
                        helper.addAttachment(Objects.requireNonNull(attachment.getFilename()), attachment);
                    } else {
                        log.warn("Attachment not found or not readable: {}", attachment.getFilename());
                    }
                }
            }

            sendEmail(mimeMessage);
            log.info("Async: Email sent successfully to {} with subject: {}", emailRequest.getToEmail(), emailRequest.getSubject());

        } catch (MailException e) {
            log.error("Async: Failed to send email to {}: {}", emailRequest.getToEmail(), e.getMessage());
        } catch (Exception e) {
            log.error("Async: Error preparing or sending email to {}: {}", emailRequest.getToEmail(), e.getMessage(), e);
        }
    }

    private MimeMessage createMimeMessage() {
        return mailSender.createMimeMessage();
    }

    private MimeMessageHelper prepareMimeMessageHelper(MimeMessage mimeMessage) throws MessagingException {
        return new MimeMessageHelper(mimeMessage,
                MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                StandardCharsets.UTF_8.name()
        );
    }

    private String processTemplate(String templateName, Map<String, Object> contextVariables) {
        Context context = new Context();
        contextVariables.forEach(context::setVariable);
        if (!contextVariables.containsKey("currentYear")) {
            context.setVariable("currentYear", Optional.of(Year.now().getValue()));
        }
        return templateEngine.process(templateName, context);
    }

    private void sendEmail(MimeMessage mimeMessage) {
        mailSender.send(mimeMessage);
    }

    private String buildFrontendUrl(String path) {
        return frontendBaseUrl + path;
    }
}