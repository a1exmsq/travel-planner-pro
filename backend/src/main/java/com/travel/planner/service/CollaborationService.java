package com.travel.planner.service;

import com.travel.planner.config.CollaborationConstants;
import com.travel.planner.dto.CollaboratorDTO;
import com.travel.planner.dto.InvitationDTO;
import com.travel.planner.dto.UserSearchResultDTO;
import com.travel.planner.entity.CollaborationStatus;
import com.travel.planner.entity.CollaboratorRole;
import com.travel.planner.entity.InvitationStatus;
import com.travel.planner.entity.Route;
import com.travel.planner.entity.RouteCollaborator;
import com.travel.planner.entity.RouteInvitation;
import com.travel.planner.entity.User;
import com.travel.planner.exception.ForbiddenException;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.RouteCollaboratorRepository;
import com.travel.planner.repository.RouteInvitationRepository;
import com.travel.planner.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CollaborationService {

    private final RouteAccessService routeAccessService;
    private final RouteInvitationRepository invitationRepository;
    private final RouteCollaboratorRepository collaboratorRepository;
    private final UserRepository userRepository;
    private final GamificationService gamificationService;

    private final ConcurrentHashMap<String, Object> invitationLocks = new ConcurrentHashMap<>();

    @Transactional
    public InvitationDTO inviteUserToRoute(Long routeId, String username, CollaboratorRole role, User currentUser) {
        Route route = routeAccessService.getRouteOrThrow(routeId);
        routeAccessService.checkCanManageCollaborators(route, currentUser);

        User invitedUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (route.getUser().getId().equals(invitedUser.getId())) {
            throw new IllegalArgumentException("The owner is already part of the route");
        }

        String lockKey = routeId + ":" + invitedUser.getId();
        synchronized (invitationLocks.computeIfAbsent(lockKey, k -> new Object())) {
            try {
                return doInvite(route, currentUser, invitedUser, role);
            } finally {
                invitationLocks.remove(lockKey);
            }
        }
    }

    private InvitationDTO doInvite(Route route, User currentUser, User invitedUser, CollaboratorRole role) {
        collaboratorRepository.findByRouteIdAndUserId(route.getId(), invitedUser.getId()).ifPresent(existing -> {
            if (existing.getStatus() == CollaborationStatus.ACCEPTED) {
                throw new IllegalStateException("User is already a collaborator");
            }
        });

        RouteInvitation invitation = invitationRepository
                .findByRouteIdAndInvitedUserIdAndStatus(route.getId(), invitedUser.getId(), InvitationStatus.PENDING)
                .orElseGet(RouteInvitation::new);
        invitation.setRoute(route);
        invitation.setInvitedBy(currentUser);
        invitation.setInvitedUser(invitedUser);
        invitation.setRole(role != null ? role : CollaboratorRole.VIEWER);
        invitation.setInviteCode(UUID.randomUUID().toString());
        invitation.setExpiresAt(LocalDateTime.now().plusDays(CollaborationConstants.INVITATION_EXPIRATION_DAYS));
        invitation.setStatus(InvitationStatus.PENDING);

        try {
            invitationRepository.save(invitation);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalStateException("Pending invitation already exists for this user");
        }

        updateOrCreateCollaborator(route, invitedUser, invitation.getRole());
        return mapInvitation(invitation);
    }

    private void updateOrCreateCollaborator(Route route, User invitedUser, CollaboratorRole role) {
        RouteCollaborator collaborator = collaboratorRepository.findByRouteIdAndUserId(
                route.getId(), invitedUser.getId()
        ).orElseGet(() -> {
            RouteCollaborator c = new RouteCollaborator();
            c.setRoute(route);
            c.setUser(invitedUser);
            return c;
        });
        collaborator.setRole(role);
        collaborator.setInvitedAt(LocalDateTime.now());
        collaborator.setStatus(CollaborationStatus.PENDING);
        try {
            collaboratorRepository.save(collaborator);
        } catch (DataIntegrityViolationException e) {
            log.debug("Collaborator row already exists for route={} user={}", route.getId(), invitedUser.getId());
        }
    }

    public List<CollaboratorDTO> getCollaborators(Long routeId, User currentUser) {
        Route route = routeAccessService.findViewableRoute(routeId, currentUser);

        List<CollaboratorDTO> collaborators = new ArrayList<>();
        collaborators.add(mapOwner(route));

        collaboratorRepository.findByRouteIdAndStatusOrderByAcceptedAtAsc(routeId, CollaborationStatus.ACCEPTED).stream()
                .filter(collaborator -> !collaborator.getUser().getId().equals(route.getUser().getId()))
                .map(this::mapCollaborator)
                .forEach(collaborators::add);

        return collaborators;
    }

    public Page<CollaboratorDTO> getCollaborators(Long routeId, int page, int size, User currentUser) {
        Route route = routeAccessService.findViewableRoute(routeId, currentUser);
        Pageable pageable = PageRequest.of(page, Math.min(size, CollaborationConstants.MAX_COLLABORATOR_PAGE_SIZE));
        return collaboratorRepository.findByRouteIdAndStatusOrderByAcceptedAtAsc(routeId, CollaborationStatus.ACCEPTED, pageable)
                .map(this::mapCollaborator);
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
            throw new IllegalStateException("Invitation has expired");
        }

        String lockKey = invitation.getRoute().getId() + ":" + currentUser.getId();
        synchronized (invitationLocks.computeIfAbsent(lockKey, k -> new Object())) {
            try {
                return doAccept(invitation, currentUser);
            } finally {
                invitationLocks.remove(lockKey);
            }
        }
    }

    private InvitationDTO doAccept(RouteInvitation invitation, User currentUser) {
        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitationRepository.save(invitation);

        RouteCollaborator collaborator = collaboratorRepository.findByRouteIdAndUserId(
                invitation.getRoute().getId(), currentUser.getId()
        ).orElseGet(RouteCollaborator::new);
        collaborator.setRoute(invitation.getRoute());
        collaborator.setUser(currentUser);
        collaborator.setRole(invitation.getRole());
        collaborator.setInvitedAt(collaborator.getInvitedAt() != null ? collaborator.getInvitedAt() : LocalDateTime.now());
        collaborator.setAcceptedAt(LocalDateTime.now());
        collaborator.setStatus(CollaborationStatus.ACCEPTED);
        try {
            collaboratorRepository.save(collaborator);
        } catch (DataIntegrityViolationException e) {
            RouteCollaborator existing = collaboratorRepository.findByRouteIdAndUserId(
                    invitation.getRoute().getId(), currentUser.getId()
            ).orElseThrow(() -> new IllegalStateException("Failed to accept invitation"));
            existing.setStatus(CollaborationStatus.ACCEPTED);
            existing.setAcceptedAt(LocalDateTime.now());
            collaboratorRepository.save(existing);
        }

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
        return invitationRepository.findByInvitedUserIdAndStatusAndExpiresAtAfterOrderByExpiresAtAsc(
                        currentUser.getId(), InvitationStatus.PENDING, LocalDateTime.now(), Pageable.unpaged())
                .map(this::mapInvitation)
                .getContent();
    }

    public Page<InvitationDTO> getPendingInvitations(User currentUser, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, CollaborationConstants.MAX_INVITATION_PAGE_SIZE));
        return invitationRepository.findByInvitedUserIdAndStatusAndExpiresAtAfterOrderByExpiresAtAsc(
                currentUser.getId(), InvitationStatus.PENDING, LocalDateTime.now(), pageable)
                .map(this::mapInvitation);
    }

    public List<UserSearchResultDTO> searchUsers(String query, User currentUser) {
        if (currentUser == null) {
            throw new ForbiddenException("Authentication required");
        }

        String safeQuery = query == null ? "" : query.trim();
        if (safeQuery.length() < CollaborationConstants.MIN_USER_SEARCH_QUERY_LENGTH) {
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
            throw new IllegalStateException("Invitation is no longer pending");
        }
        return invitation;
    }

    private CollaboratorDTO mapOwner(Route route) {
        CollaboratorDTO dto = new CollaboratorDTO();
        dto.setUserId(route.getUser().getId());
        dto.setUsername(route.getUser().getDisplayUsername());
        dto.setRole(CollaboratorRole.OWNER.name());
        dto.setStatus(CollaborationStatus.ACCEPTED.name());
        dto.setAcceptedAt(null);
        dto.setOwner(true);
        return dto;
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
