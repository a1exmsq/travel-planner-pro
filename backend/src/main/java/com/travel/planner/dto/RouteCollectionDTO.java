package com.travel.planner.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class RouteCollectionDTO {
    private Long id;
    private String name;
    private String description;
    private int routesCount;
    private List<RouteResponseDTO> routes = new ArrayList<>();
}
