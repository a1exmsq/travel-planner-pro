package com.travel.planner.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class ReorderItemsRequestDTO {
    @NotEmpty(message = "Ordered ids are required")
    private List<Long> orderedIds;
}
