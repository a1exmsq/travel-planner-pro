package com.travel.planner.dto;

import lombok.Data;

import java.time.LocalTime;

@Data
public class CreateDayActivityRequestDTO {
    private Long routePoiId;
    private LocalTime startTime;
    private Integer durationMinutes;
    private String notes;
}
