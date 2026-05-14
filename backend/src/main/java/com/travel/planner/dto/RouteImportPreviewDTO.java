package com.travel.planner.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class RouteImportPreviewDTO {
    private String provider;
    private String sourceUrl;
    private String suggestedTitle;
    private String summary;
    private List<String> warnings = new ArrayList<>();
    private List<ImportedStopDTO> stops = new ArrayList<>();
}
