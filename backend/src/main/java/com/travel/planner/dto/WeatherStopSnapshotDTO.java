package com.travel.planner.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class WeatherStopSnapshotDTO {
    private String stopName;
    private String cityName;
    private LocalDate date;
    private String condition;
    private Integer temperatureC;
    private Integer precipitationChance;
}
