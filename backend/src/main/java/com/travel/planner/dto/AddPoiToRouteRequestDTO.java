package com.travel.planner.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class AddPoiToRouteRequestDTO {

    private Long poiId;

    @Min(value = 0, message = "Время не может быть отрицательным")
    private int travelTimeMinutes = 15;

    private String customName;
    private Double customLatitude;
    private Double customLongitude;

    public boolean isValid() {
        boolean hasPoi = poiId != null;
        boolean hasCustom = customName != null && customLatitude != null && customLongitude != null;
        return hasPoi || hasCustom;
    }
}