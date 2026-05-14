package com.travel.planner.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class CreateRouteRequestDTO {

    @NotBlank(message = "Route name is required")
    @Size(max = 100, message = "Route name must be shorter than 100 characters")
    private String name;

    @Size(max = 1000, message = "Description must be shorter than 1000 characters")
    private String description;

    private boolean isPublic = false;

    private String mainImageUrl;

    private String routeType;

    private Long primaryCountryId;

    private Long primaryCityId;

    @Size(max = 120, message = "Region label must be shorter than 120 characters")
    private String regionLabel;

    @Size(max = 255, message = "Location summary must be shorter than 255 characters")
    private String locationSummary;

    private List<String> vibeTags;

    private LocalDate startDate;

    private LocalDate endDate;

    private BigDecimal totalBudget;

    private String currency;
}
