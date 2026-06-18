package com.travel.planner.repository;

import com.travel.planner.entity.InvitationStatus;
import com.travel.planner.entity.RouteInvitation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface RouteInvitationRepository extends JpaRepository<RouteInvitation, Long> {
    Optional<RouteInvitation> findByInviteCode(String inviteCode);
    Optional<RouteInvitation> findByRouteIdAndInvitedUserIdAndStatus(Long routeId, Long userId, InvitationStatus status);
    Page<RouteInvitation> findByInvitedUserIdAndStatusAndExpiresAtAfterOrderByExpiresAtAsc(
            Long userId, InvitationStatus status, LocalDateTime now, Pageable pageable);
}
