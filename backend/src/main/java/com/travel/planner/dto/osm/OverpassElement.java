package com.travel.planner.dto.osm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class OverpassElement {
    private String type;
    private long id;
    private Double lat;
    private Double lon;
    private Map<String, String> tags;
}
