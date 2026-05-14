package com.travel.planner.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImportedStopDTO {
    private String name;
    private Double latitude;
    private Double longitude;
    private boolean resolved;
    private String sourceLabel;
    private String note;
}
