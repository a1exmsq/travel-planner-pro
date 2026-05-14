package com.travel.planner.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CollaboratorDTO {
    private Long userId;
    private String username;
    private String role;
    private String status;
    private LocalDateTime invitedAt;
    private LocalDateTime acceptedAt;
    private boolean owner;
}
