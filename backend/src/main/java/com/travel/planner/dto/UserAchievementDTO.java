package com.travel.planner.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserAchievementDTO {
    private Long id;
    private String code;
    private String name;
    private String description;
    private String icon;
    private Integer points;
    private String rarity;
    private String type;
    private LocalDateTime unlockedAt;
    private Integer progress;
}
