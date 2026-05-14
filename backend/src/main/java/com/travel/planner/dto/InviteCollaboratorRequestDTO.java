package com.travel.planner.dto;

import com.travel.planner.entity.CollaboratorRole;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InviteCollaboratorRequestDTO {
    @NotBlank
    private String username;
    private CollaboratorRole role = CollaboratorRole.VIEWER;
}
