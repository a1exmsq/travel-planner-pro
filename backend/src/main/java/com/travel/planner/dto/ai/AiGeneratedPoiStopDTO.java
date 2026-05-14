package com.travel.planner.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiGeneratedPoiStopDTO {
    private Long poiId;
    private String poiName;
    private String category;
    private String imageUrl;
    private Double latitude;
    private Double longitude;
    private String address;
    private String note;
    private int visitMinutes;
    private int orderInDay;
}
