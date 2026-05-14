package com.travel.planner.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoogleMapsImportRequestDTO {

    @NotBlank(message = "Google Maps link is required")
    private String url;
}
