package com.travel.planner.repository;

import com.travel.planner.entity.RoutePackingItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoutePackingItemRepository extends JpaRepository<RoutePackingItem, Long> {
    List<RoutePackingItem> findByRouteIdOrderByOrderIndexAscIdAsc(Long routeId);
    long countByRouteId(Long routeId);
    long countByRouteIdAndPackedTrue(Long routeId);
}
