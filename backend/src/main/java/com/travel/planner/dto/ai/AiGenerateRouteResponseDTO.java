package com.travel.planner.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiGenerateRouteResponseDTO {
    private String title;
    private String description;
    private Long cityId;
    private String cityName;
    private int totalDays;
    private List<AiGeneratedDayDTO> days;
    private boolean aiGenerated;
}
