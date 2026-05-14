package com.travel.planner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_stats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserStats {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    private Integer totalPoints = 0;

    private Integer level = 1;

    private Integer routesCreated = 0;

    private Integer countriesVisited = 0;

    private Integer citiesVisited = 0;

    private Integer poisAdded = 0;

    private Double totalDistanceTraveled = 0.0;

    private Integer currentStreak = 0;
}
