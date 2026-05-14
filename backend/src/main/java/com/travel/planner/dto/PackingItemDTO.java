package com.travel.planner.dto;

import lombok.Data;

@Data
public class PackingItemDTO {
    private Long id;
    private String title;
    private String category;
    private String notes;
    private Integer quantity;
    private Boolean packed;
    private String requiredFor;
    private Integer orderIndex;
}
