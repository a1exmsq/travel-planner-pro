package com.travel.planner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "route_collection_items",
        uniqueConstraints = @UniqueConstraint(columnNames = {"collection_id", "route_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteCollectionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "collection_id", nullable = false)
    private RouteCollection collection;

    @ManyToOne
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;
}
