package com.travel.planner.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateRouteDayRequestDTO {
    private LocalDate date;
    private String title;
    private String notes;
}
