package com.travel.planner.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class RouteDayDTO {
    private Long id;
    private Integer dayNumber;
    private LocalDate date;
    private String title;
    private String notes;
    private Double totalDistanceKm;
    private Integer totalDurationMinutes;
    private Integer activityCount;
    private BigDecimal totalBudget;
    private List<DayActivityDTO> activities;
}
