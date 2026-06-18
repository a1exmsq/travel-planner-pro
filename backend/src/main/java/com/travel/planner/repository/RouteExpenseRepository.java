package com.travel.planner.repository;

import com.travel.planner.entity.RouteExpense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface RouteExpenseRepository extends JpaRepository<RouteExpense, Long> {

    List<RouteExpense> findByRouteIdOrderByDateAscIdAsc(Long routeId);

    List<RouteExpense> findByRouteIdAndDate(Long routeId, LocalDate date);

    List<RouteExpense> findByRouteIdIn(Collection<Long> routeIds);
}
