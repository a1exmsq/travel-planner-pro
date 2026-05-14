package com.travel.planner.dto;

import lombok.Data;

import java.time.LocalTime;

@Data
public class UpdateDayActivityRequestDTO {
    private Long routePoiId;
    private Integer orderIndex;
    private LocalTime startTime;
    private Integer durationMinutes;
    private String notes;
}
