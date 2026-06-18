package com.travel.planner.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class RouteResponseDTO extends RouteShortDTO {

    private List<PoiResponseDTO> stops;
    private int totalPoints;
}
