package com.leroy.hostelbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class HostelBackendApplication {

    static void main(String[] args) {
        SpringApplication.run(HostelBackendApplication.class, args);
    }

}
