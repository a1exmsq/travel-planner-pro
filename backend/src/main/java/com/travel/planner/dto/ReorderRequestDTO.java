package com.travel.planner.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class ReorderRequestDTO {

    @NotEmpty(message = "Список точек не может быть пустым")
    private List<Long> orderedRoutePoiIds;
}