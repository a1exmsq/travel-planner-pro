package com.travel.planner.dto.ai;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class AiGenerateRouteRequestDTO {

    /** ID города */
    private Long cityId;

    /** Количество дней (1–7) */
    private int days = 1;

    /**
     * Интересы: history | food | nature | art | nightlife | sport | religion
     */
    private List<String> interests = new ArrayList<>();

    /**
     * Темп: relaxed (~4 остановки/день) | normal (~6) | intense (~8)
     */
    private String pace = "normal";
}
