package com.travel.planner.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OsmImportResultDTO {
    private Long cityId;
    private String cityName;
    private int imported;
    private int skipped;
    private int total;
}
