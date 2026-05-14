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

    // optional = true — poi может быть null (для свободных точек с карты)
    @ManyToOne
    @JoinColumn(name = "poi_id", nullable = true)
    private PointOfInterest poi;

    private Integer orderIndex;
    private Integer travelTimeMinutes;

    // Поля для "свободных" точек (когда poi = null)
    private String customName;
    private Double customLatitude;
    private Double customLongitude;

    // Удобный метод: получить имя независимо от типа точки
    public String getEffectiveName() {
        return poi != null ? poi.getName() : customName;
    }

    // Удобный метод: получить широту независимо от типа точки
    public Double getEffectiveLatitude() {
        return poi != null ? poi.getLatitude() : customLatitude;
    }

    // Удобный метод: получить долготу независимо от типа точки
    public Double getEffectiveLongitude() {
        return poi != null ? poi.getLongitude() : customLongitude;
    }
    private Double distanceMeters;   // Расстояние от предыдущей точки
    private Integer durationSeconds; // Время в пути от предыдущей точки
}