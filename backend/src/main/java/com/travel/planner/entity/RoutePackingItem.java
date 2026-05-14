package com.travel.planner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "route_packing_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoutePackingItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "route_id")
    private Route route;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 64)
    private String category;

    @Column(length = 255)
    private String notes;

    private Integer quantity;

    @Column(name = "is_packed", nullable = false)
    private Boolean packed;

    @Column(length = 64)
    private String requiredFor;

    private Integer orderIndex;

    @PrePersist
    private void ensureDefaults() {
        if (quantity == null || quantity < 1) {
            quantity = 1;
        }
        if (packed == null) {
            packed = Boolean.FALSE;
        }
        if (orderIndex == null) {
            orderIndex = 0;
        }
    }
}
