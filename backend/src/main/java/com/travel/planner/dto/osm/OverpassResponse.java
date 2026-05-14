package com.travel.planner.dto.osm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class OverpassResponse {
    private List<OverpassElement> elements;
}
