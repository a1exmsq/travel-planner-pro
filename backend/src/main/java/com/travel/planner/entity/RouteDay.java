package com.travel.planner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "route_days")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "route_id")
    private Route route;

    private Integer dayNumber;

    private LocalDate date;

    private String title;

    private String notes;

    @OneToMany(mappedBy = "routeDay", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DayActivity> activities = new ArrayList<>();
}
