package com.travel.planner.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RoutePlanDTO {
    private String routeName;
    private Integer totalTimeMinutes;
    private List<PoiResponseDTO> stops;
}
