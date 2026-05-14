package com.travel.planner.service;

import com.travel.planner.dto.CollaboratorDTO;
import com.travel.planner.dto.InvitationDTO;
import com.travel.planner.dto.UserSearchResultDTO;
import com.travel.planner.entity.*;
import com.travel.planner.exception.ForbiddenException;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.RouteCollaboratorRepository;
import com.travel.planner.repository.RouteInvitationRepository;
import com.travel.planner.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CollaborationService {

    private final RouteAccessService routeAccessService;
    private final RouteInvitationRepository invitationRepository;
    private final RouteCollaboratorRepository collaboratorRepository;
    private final UserRepository userRepository;
    private final GamificationService gamificationService;

    @Transactional
    public InvitationDTO inviteUserToRoute(Long routeId, String username, CollaboratorRole role, User currentUser) {
        Route route = routeAccessService.getRouteOrThrow(routeId);
        routeAccessService.checkCanManageCollaborators(route, currentUser);

        User invitedUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (route.getUser().getId().equals(invitedUser.getId())) {
            throw new RuntimeException("The owner is already part of the route");
        }

        collaboratorRepository.findByRouteIdAndUserId(routeId, invitedUser.getId()).ifPresent(existing -> {
            if (existing.getStatus() == CollaborationStatus.ACCEPTED) {
                throw new RuntimeException("User is already a collaborator");
            }
        });

        RouteInvitation invitation = invitationRepository
                .findByRouteIdAndInvitedUserIdAndStatus(routeId, invitedUser.getId(), InvitationStatus.PENDING)
                .orElseGet(RouteInvitation::new);
        invitation.setRoute(route);
        invitation.setInvitedBy(currentUser);
        invitation.setInvitedUser(invitedUser);
        invitation.setRole(role != null ? role : CollaboratorRole.VIEWER);
        invitation.setInviteCode(UUID.randomUUID().toString());
        invitation.setExpiresAt(LocalDateTime.now().plusDays(7));
        invitation.setStatus(InvitationStatus.PENDING);
        invitationRepository.save(invitation);

        collaboratorRepository.findByRouteIdAndUserId(routeId, invitedUser.getId()).ifPresentOrElse(existing -> {
            existing.setRole(invitation.getRole());
            existing.setInvitedAt(LocalDateTime.now());
            existing.setStatus(CollaborationStatus.PENDING);
            collaboratorRepository.save(existing);
        }, () -> {
            RouteCollaborator collaborator = new RouteCollaborator();
            collaborator.setRoute(route);
            collaborator.setUser(invitedUser);
            collaborator.setRole(invitation.getRole());
            collaborator.setInvitedAt(LocalDateTime.now());
            collaborator.setStatus(CollaborationStatus.PENDING);
            collaboratorRepository.save(collaborator);
        });

        return mapInvitation(invitation);
    }

    public List<CollaboratorDTO> getCollaborators(Long routeId, User currentUser) {
        Route route = routeAccessService.findViewableRoute(routeId, currentUser);

        List<CollaboratorDTO> collaborators = new ArrayList<>();
        CollaboratorDTO owner = new CollaboratorDTO();
        owner.setUserId(route.getUser().getId());
        owner.setUsername(route.getUser().getDisplayUsername());
        owner.setRole(CollaboratorRole.OWNER.name());
        owner.setStatus(CollaborationStatus.ACCEPTED.name());
        owner.setAcceptedAt(null);
        owner.setOwner(true);
        collaborators.add(owner);

        collaboratorRepository.findByRouteIdAndStatusOrderByAcceptedAtAsc(routeId, CollaborationStatus.ACCEPTED).stream()
                .filter(collaborator -> !collaborator.getUser().getId().equals(route.getUser().getId()))
                .map(this::mapCollaborator)
                .forEach(collaborators::add);

        return collaborators;
    }

    @Transactional
    public void removeCollaborator(Long routeId, Long userId, User currentUser) {
        Route route = routeAccessService.getRouteOrThrow(routeId);
        routeAccessService.checkCanManageCollaborators(route, currentUser);
        collaboratorRepository.findByRouteIdAndUserId(routeId, userId)
                .ifPresent(collaboratorRepository::delete);
    }

    @Transactional
    public InvitationDTO acceptInvitation(String inviteCode, User currentUser) {
        RouteInvitation invitation = resolveInvitation(inviteCode, currentUser);
        if (invitation.getExpiresAt() != null && invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(invitation);
            throw new RuntimeException("Invitation has expired");
        }

        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitationRepository.save(invitation);

        RouteCollaborator collaborator = collaboratorRepository.findByRouteIdAndUserId(
                invitation.getRoute().getId(),
                currentUser.getId()
        ).orElseGet(RouteCollaborator::new);
        collaborator.setRoute(invitation.getRoute());
        collaborator.setUser(currentUser);
        collaborator.setRole(invitation.getRole());
        collaborator.setInvitedAt(collaborator.getInvitedAt() != null ? collaborator.getInvitedAt() : LocalDateTime.now());
        collaborator.setAcceptedAt(LocalDateTime.now());
        collaborator.setStatus(CollaborationStatus.ACCEPTED);
        collaboratorRepository.save(collaborator);

        gamificationService.checkAndUnlockAchievements(currentUser.getId());
        return mapInvitation(invitation);
    }

    @Transactional
    public InvitationDTO declineInvitation(String inviteCode, User currentUser) {
        RouteInvitation invitation = resolveInvitation(inviteCode, currentUser);
        invitation.setStatus(InvitationStatus.DECLINED);
        invitationRepository.save(invitation);

        collaboratorRepository.findByRouteIdAndUserId(invitation.getRoute().getId(), currentUser.getId())
                .ifPresent(collaborator -> {
                    collaborator.setStatus(CollaborationStatus.DECLINED);
                    collaboratorRepository.save(collaborator);
                });

        return mapInvitation(invitation);
    }

    public List<InvitationDTO> getPendingInvitations(User currentUser) {
        return invitationRepository.findByInvitedUserIdAndStatusOrderByExpiresAtAsc(currentUser.getId(), InvitationStatus.PENDING)
                .stream()
                .filter(invitation -> invitation.getExpiresAt() == null || !invitation.getExpiresAt().isBefore(LocalDateTime.now()))
                .map(this::mapInvitation)
                .toList();
    }

    public List<UserSearchResultDTO> searchUsers(String query, User currentUser) {
        if (currentUser == null) {
            throw new ForbiddenException("Authentication required");
        }

        String safeQuery = query == null ? "" : query.trim();
        if (safeQuery.length() < 2) {
            return List.of();
        }

        return userRepository.findTop8ByUsernameContainingIgnoreCaseOrderByUsernameAsc(safeQuery).stream()
                .filter(user -> !user.getId().equals(currentUser.getId()))
                .map(user -> {
                    UserSearchResultDTO dto = new UserSearchResultDTO();
                    dto.setId(user.getId());
                    dto.setUsername(user.getDisplayUsername());
                    return dto;
                })
                .toList();
    }

    private RouteInvitation resolveInvitation(String inviteCode, User currentUser) {
        RouteInvitation invitation = invitationRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));
        if (!invitation.getInvitedUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("This invitation is not for you");
        }
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new RuntimeException("Invitation is no longer pending");
        }
        return invitation;
    }

    private CollaboratorDTO mapCollaborator(RouteCollaborator collaborator) {
        CollaboratorDTO dto = new CollaboratorDTO();
        dto.setUserId(collaborator.getUser().getId());
        dto.setUsername(collaborator.getUser().getDisplayUsername());
        dto.setRole(collaborator.getRole().name());
        dto.setStatus(collaborator.getStatus().name());
        dto.setInvitedAt(collaborator.getInvitedAt());
        dto.setAcceptedAt(collaborator.getAcceptedAt());
        dto.setOwner(false);
        return dto;
    }

    private InvitationDTO mapInvitation(RouteInvitation invitation) {
        InvitationDTO dto = new InvitationDTO();
        dto.setId(invitation.getId());
        dto.setRouteId(invitation.getRoute().getId());
        dto.setRouteName(invitation.getRoute().getName());
        dto.setInvitedByUsername(invitation.getInvitedBy().getDisplayUsername());
        dto.setInvitedUserUsername(invitation.getInvitedUser().getDisplayUsername());
        dto.setInviteCode(invitation.getInviteCode());
        dto.setRole(invitation.getRole().name());
        dto.setStatus(invitation.getStatus().name());
        dto.setExpiresAt(invitation.getExpiresAt());
        return dto;
    }
}
