package com.travel.planner.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateRouteCollectionRequestDTO {

    @NotBlank(message = "Collection name is required")
    @Size(max = 80, message = "Collection name must be shorter than 80 characters")
    private String name;

    @Size(max = 255, message = "Collection description must be shorter than 255 characters")
    private String description;
}
