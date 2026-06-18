package com.travel.planner.dto.ai;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class AiGenerateRouteRequestDTO {

    private Long cityId;
    private int days = 1;
    private List<String> interests = new ArrayList<>();
    private String pace = "normal";
}
