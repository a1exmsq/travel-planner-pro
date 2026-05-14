package com.travel.planner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "route_collaborators")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteCollaborator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "route_id")
    private Route route;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    private CollaboratorRole role;

    private LocalDateTime invitedAt;

    private LocalDateTime acceptedAt;

    @Enumerated(EnumType.STRING)
    private CollaborationStatus status;
}
