package com.travel.planner.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiGeneratedDayDTO {
    private int dayNumber;
    private String theme;
    private String description;
    private List<AiGeneratedPoiStopDTO> stops;
}
