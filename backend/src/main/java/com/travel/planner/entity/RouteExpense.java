package com.travel.planner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "route_expenses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "route_id")
    private Route route;

    @ManyToOne
    @JoinColumn(name = "route_poi_id")
    private RoutePOI routePoi;

    @Enumerated(EnumType.STRING)
    private ExpenseCategory category;

    private String name;

    private BigDecimal plannedAmount;

    private BigDecimal actualAmount;

    private String currency;

    private LocalDate date;

    private Boolean isPaid;

    private String notes;
}
