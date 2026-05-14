package com.travel.planner.controller;

import com.travel.planner.dto.InvitationDTO;
import com.travel.planner.entity.User;
import com.travel.planner.service.CollaborationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InvitationController {

    private final CollaborationService collaborationService;

    @PostMapping("/invitations/{code}/accept")
    public InvitationDTO acceptInvitation(
            @PathVariable String code,
            @AuthenticationPrincipal User currentUser
    ) {
        return collaborationService.acceptInvitation(code, currentUser);
    }

    @PostMapping("/invitations/{code}/decline")
    public InvitationDTO declineInvitation(
            @PathVariable String code,
            @AuthenticationPrincipal User currentUser
    ) {
        return collaborationService.declineInvitation(code, currentUser);
    }

    @GetMapping("/users/me/invitations")
    public List<InvitationDTO> getPendingInvitations(@AuthenticationPrincipal User currentUser) {
        return collaborationService.getPendingInvitations(currentUser);
    }

    @GetMapping("/users/search")
    public List<com.travel.planner.dto.UserSearchResultDTO> searchUsers(
            @RequestParam String username,
            @AuthenticationPrincipal User currentUser
    ) {
        return collaborationService.searchUsers(username, currentUser);
    }
}
