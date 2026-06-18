package com.travel.planner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "route_invitations",
        uniqueConstraints = @UniqueConstraint(name = "uq_route_invitation_user_status", columnNames = {"route_id", "invited_user_id", "status"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "route_id")
    private Route route;

    @ManyToOne
    @JoinColumn(name = "invited_by_id")
    private User invitedBy;

    @ManyToOne
    @JoinColumn(name = "invited_user_id")
    private User invitedUser;

    @Enumerated(EnumType.STRING)
    private CollaboratorRole role;

    private String inviteCode;

    private LocalDateTime expiresAt;

    @Enumerated(EnumType.STRING)
    private InvitationStatus status;
}
