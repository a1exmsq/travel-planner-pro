package com.travel.planner.dto;

import lombok.Data;

@Data
public class UserStatsDTO {
    private Long userId;
    private String username;
    private Integer totalPoints;
    private Integer level;
    private String levelTitle;
    private Integer routesCreated;
    private Integer countriesVisited;
    private Integer citiesVisited;
    private Integer poisAdded;
    private Double totalDistanceTraveled;
    private Integer currentStreak;
    private Integer nextLevelPoints;
}
