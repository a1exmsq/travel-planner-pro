package com.travel.planner.controller;

import com.travel.planner.dto.AuthResponseDTO;
import com.travel.planner.dto.LoginRequestDTO;
import com.travel.planner.dto.RegisterRequestDTO;
import com.travel.planner.dto.UserDTO;
import com.travel.planner.entity.User;
import com.travel.planner.security.JwtService;
import com.travel.planner.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDTO> register(@Valid @RequestBody RegisterRequestDTO request) {
        User user = userService.register(request);
        String token = jwtService.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponseDTO(token, mapToDTO(user)));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        User user = userService.login(request.getEmail(), request.getPassword());
        String token = jwtService.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponseDTO(token, mapToDTO(user)));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(mapToDTO(user));
    }

    private UserDTO mapToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getDisplayUsername());
        dto.setEmail(user.getEmail());
        dto.setPoints(user.getPoints() != null ? user.getPoints() : 0);
        dto.setRole(user.getRole() != null ? user.getRole() : "USER");
        return dto;
    }
}