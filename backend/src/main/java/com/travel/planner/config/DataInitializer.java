package com.travel.planner.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

/**
 * Legacy initializer kept as a no-op so the richer DatabaseSeeder remains the
 * single source of truth for demo content.
 */
@Configuration
@Component
public class DataInitializer implements CommandLineRunner {

    @Override
    public void run(String... args) {
        // Intentionally empty.
    }
}
