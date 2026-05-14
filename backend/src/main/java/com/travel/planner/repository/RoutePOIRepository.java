package com.travel.planner.repository;

import com.travel.planner.entity.RoutePOI;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoutePOIRepository extends JpaRepository<RoutePOI, Long> {
    void deleteByRouteId(Long routeId);
    List<RoutePOI> findByRouteIdOrderByOrderIndexAsc(Long routeId);
}
