package com.travel.planner.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateRouteDayRequestDTO {
    private Integer dayNumber;
    private LocalDate date;
    private String title;
    private String notes;
}
