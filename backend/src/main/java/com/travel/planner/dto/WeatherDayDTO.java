package com.travel.planner.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class WeatherDayDTO {
    private LocalDate date;
    private String condition;
    private Integer highTempC;
    private Integer lowTempC;
    private Integer precipitationChance;
    private Integer windKph;
    private String note;
}
