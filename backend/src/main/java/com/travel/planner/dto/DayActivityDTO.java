package com.travel.planner.dto;

import lombok.Data;

import java.time.LocalTime;

@Data
public class DayActivityDTO {
    private Long id;
    private Long routePoiId;
    private String name;
    private Integer orderIndex;
    private LocalTime startTime;
    private Integer durationMinutes;
    private String activityType;
    private String notes;
    private Double latitude;
    private Double longitude;
}
