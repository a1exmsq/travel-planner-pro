package com.travel.planner.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class InvitationDTO {
    private Long id;
    private Long routeId;
    private String routeName;
    private String invitedByUsername;
    private String invitedUserUsername;
    private String inviteCode;
    private String role;
    private String status;
    private LocalDateTime expiresAt;
}
