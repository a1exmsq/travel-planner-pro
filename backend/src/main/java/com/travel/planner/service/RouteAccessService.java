package com.travel.planner.service;

import com.travel.planner.entity.*;
import com.travel.planner.exception.ForbiddenException;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.RouteCollaboratorRepository;
import com.travel.planner.repository.RouteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RouteAccessService {

    private final RouteRepository routeRepository;
    private final RouteCollaboratorRepository collaboratorRepository;

    public Route getRouteOrThrow(Long routeId) {
        return routeRepository.findById(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found"));
    }

    public Route findViewableRoute(Long routeId, User currentUser) {
        Route route = getRouteOrThrow(routeId);
        checkCanView(route, currentUser);
        return route;
    }

    public Route findEditableRoute(Long routeId, User currentUser) {
        Route route = getRouteOrThrow(routeId);
        checkCanEdit(route, currentUser);
        return route;
    }

    public void checkCanView(Route route, User currentUser) {
        if (!canView(route, currentUser)) {
            throw new ForbiddenException("This route is private");
        }
    }

    public void checkCanEdit(Route route, User currentUser) {
        if (!canEdit(route, currentUser)) {
            throw new ForbiddenException("You do not have edit access to this route");
        }
    }

    public void checkCanManageCollaborators(Route route, User currentUser) {
        if (!canManageCollaborators(route, currentUser)) {
            throw new ForbiddenException("Only the route owner can manage collaborators");
        }
    }

    public void checkCanDelete(Route route, User currentUser) {
        if (!canDelete(route, currentUser)) {
            throw new ForbiddenException("No rights to delete this route");
        }
    }

    public boolean canView(Route route, User currentUser) {
        if (route.isPublic()) {
            return true;
        }
        if (isOwner(route, currentUser) || isAdmin(currentUser)) {
            return true;
        }
        return getAcceptedCollaborator(route.getId(), currentUser) != null;
    }

    public boolean canEdit(Route route, User currentUser) {
        if (isOwner(route, currentUser) || isAdmin(currentUser)) {
            return true;
        }
        RouteCollaborator collaborator = getAcceptedCollaborator(route.getId(), currentUser);
        if (collaborator == null) {
            return false;
        }
        return collaborator.getRole() == CollaboratorRole.EDITOR || collaborator.getRole() == CollaboratorRole.OWNER;
    }

    public boolean canManageCollaborators(Route route, User currentUser) {
        return isOwner(route, currentUser) || isAdmin(currentUser);
    }

    public boolean canDelete(Route route, User currentUser) {
        return isOwner(route, currentUser) || isAdmin(currentUser);
    }

    public String resolveAccessRole(Route route, User currentUser) {
        if (isOwner(route, currentUser) || isAdmin(currentUser)) {
            return CollaboratorRole.OWNER.name();
        }

        RouteCollaborator collaborator = getAcceptedCollaborator(route.getId(), currentUser);
        if (collaborator != null) {
            return collaborator.getRole().name();
        }

        if (route.isPublic()) {
            return "PUBLIC";
        }

        return null;
    }

    private boolean isOwner(Route route, User currentUser) {
        return currentUser != null
                && route.getUser() != null
                && route.getUser().getId().equals(currentUser.getId());
    }

    private boolean isAdmin(User currentUser) {
        return currentUser != null && "ADMIN".equals(currentUser.getRole());
    }

    private RouteCollaborator getAcceptedCollaborator(Long routeId, User currentUser) {
        if (currentUser == null) {
            return null;
        }
        return collaboratorRepository.findByRouteIdAndUserId(routeId, currentUser.getId())
                .filter(collaborator -> collaborator.getStatus() == CollaborationStatus.ACCEPTED)
                .orElse(null);
    }
}
