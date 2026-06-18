package com.travel.planner.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        // Secret must be at least 32 chars for HS256
        jwtService = new JwtService(
                "test-secret-key-at-least-32-characters-long",
                3600000 // 1 hour in ms
        );
    }

    @Test
    void generateToken_shouldProduceNonNullToken() {
        String token = jwtService.generateToken("user@example.com");

        assertNotNull(token);
        assertTrue(token.length() > 20);
        assertEquals(3, token.split("\\.").length); // header.payload.signature
    }

    @Test
    void extractEmail_shouldReturnOriginalEmail() {
        String email = "test@travel.pl";
        String token = jwtService.generateToken(email);

        String extracted = jwtService.extractEmail(token);

        assertEquals(email, extracted);
    }

    @Test
    void isTokenValid_shouldReturnTrue_forFreshToken() {
        String token = jwtService.generateToken("user@example.com");

        assertTrue(jwtService.isTokenValid(token));
    }

    @Test
    void isTokenValid_shouldReturnFalse_forTamperedToken() {
        String token = jwtService.generateToken("user@example.com");
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";

        assertFalse(jwtService.isTokenValid(tampered));
    }

    @Test
    void isTokenValid_shouldReturnFalse_forRandomString() {
        assertFalse(jwtService.isTokenValid("not.a.token"));
    }
}
