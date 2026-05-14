package com.travel.planner.repository;

import com.travel.planner.entity.CollaborationStatus;
import com.travel.planner.entity.RouteCollaborator;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RouteCollaboratorRepository extends JpaRepository<RouteCollaborator, Long> {
    Optional<RouteCollaborator> findByRouteIdAndUserId(Long routeId, Long userId);
    boolean existsByRouteIdAndUserIdAndStatus(Long routeId, Long userId, CollaborationStatus status);
    List<RouteCollaborator> findByRouteIdAndStatusOrderByAcceptedAtAsc(Long routeId, CollaborationStatus status);
    List<RouteCollaborator> findByUserIdAndStatus(Long userId, CollaborationStatus status);
    long countByUserIdAndStatus(Long userId, CollaborationStatus status);
}
