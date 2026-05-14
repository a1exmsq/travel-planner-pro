package com.travel.planner.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class UpdateStopRequestDTO {
    @Min(value = 0, message = "Time cannot be negative")
    private int travelTimeMinutes;
}