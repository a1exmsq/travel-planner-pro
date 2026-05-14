package com.travel.planner.repository;

import com.travel.planner.entity.RouteDay;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RouteDayRepository extends JpaRepository<RouteDay, Long> {
    List<RouteDay> findByRouteIdOrderByDayNumberAsc(Long routeId);
}
