package com.travel.planner.repository;

import com.travel.planner.entity.CollaborationStatus;
import com.travel.planner.entity.RouteCollaborator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RouteCollaboratorRepository extends JpaRepository<RouteCollaborator, Long> {
    Optional<RouteCollaborator> findByRouteIdAndUserId(Long routeId, Long userId);
    boolean existsByRouteIdAndUserIdAndStatus(Long routeId, Long userId, CollaborationStatus status);
    List<RouteCollaborator> findByRouteIdAndStatusOrderByAcceptedAtAsc(Long routeId, CollaborationStatus status);
    Page<RouteCollaborator> findByRouteIdAndStatusOrderByAcceptedAtAsc(Long routeId, CollaborationStatus status, Pageable pageable);
    List<RouteCollaborator> findByUserIdAndStatus(Long userId, CollaborationStatus status);
    Page<RouteCollaborator> findByUserIdAndStatus(Long userId, CollaborationStatus status, Pageable pageable);
    long countByUserIdAndStatus(Long userId, CollaborationStatus status);
    long countByRouteIdAndStatus(Long routeId, CollaborationStatus status);
}
