package com.travel.planner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "route_pois")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoutePOI {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "route_id")
    private Route route;

    @ManyToOne
    @JoinColumn(name = "poi_id", nullable = true)
    private PointOfInterest poi;

    private Integer orderIndex;
    private Integer travelTimeMinutes;

    private String customName;
    private Double customLatitude;
    private Double customLongitude;

    public String getEffectiveName() {
        return poi != null ? poi.getName() : customName;
    }

    public Double getEffectiveLatitude() {
        return poi != null ? poi.getLatitude() : customLatitude;
    }

    public Double getEffectiveLongitude() {
        return poi != null ? poi.getLongitude() : customLongitude;
    }

    private Double distanceMeters;
    private Integer durationSeconds;
}
