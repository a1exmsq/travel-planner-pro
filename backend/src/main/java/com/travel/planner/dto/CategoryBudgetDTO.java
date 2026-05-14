package com.travel.planner.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class CategoryBudgetDTO {
    private String category;
    private BigDecimal planned;
    private BigDecimal actual;
}
