package com.travel.planner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;

@Entity
@Table(name = "day_activities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DayActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version;

    @ManyToOne
    @JoinColumn(name = "route_day_id")
    private RouteDay routeDay;

    @ManyToOne
    @JoinColumn(name = "route_poi_id")
    private RoutePOI routePoi;

    private Integer orderIndex;

    private LocalTime startTime;

    private Integer durationMinutes;

    @Enumerated(EnumType.STRING)
    private ActivityType activityType;

    private String notes;
}
