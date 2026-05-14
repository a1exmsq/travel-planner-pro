package com.travel.planner.repository;

import com.travel.planner.entity.InvitationStatus;
import com.travel.planner.entity.RouteInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RouteInvitationRepository extends JpaRepository<RouteInvitation, Long> {
    Optional<RouteInvitation> findByInviteCode(String inviteCode);
    List<RouteInvitation> findByInvitedUserIdAndStatusOrderByExpiresAtAsc(Long userId, InvitationStatus status);
    Optional<RouteInvitation> findByRouteIdAndInvitedUserIdAndStatus(Long routeId, Long userId, InvitationStatus status);
}
