package com.travel.planner.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class WeatherOverviewDTO {
    private String provider;
    private LocalDateTime generatedAt;
    private String summary;
    private List<WeatherDayDTO> days = new ArrayList<>();
    private List<WeatherStopSnapshotDTO> stopSnapshots = new ArrayList<>();
}
