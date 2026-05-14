package com.travel.planner.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateRouteExpenseRequestDTO {
    private Long routePoiId;
    private String category;
    private String name;
    private BigDecimal plannedAmount;
    private BigDecimal actualAmount;
    private String currency;
    private LocalDate date;
    private Boolean isPaid;
    private String notes;
}
