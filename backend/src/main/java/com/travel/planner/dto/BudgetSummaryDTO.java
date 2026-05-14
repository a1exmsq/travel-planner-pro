package com.travel.planner.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class BudgetSummaryDTO {
    private BigDecimal totalBudget;
    private BigDecimal totalPlanned;
    private BigDecimal totalActual;
    private BigDecimal remaining;
    private String currency;
    private List<CategoryBudgetDTO> categories;
}
