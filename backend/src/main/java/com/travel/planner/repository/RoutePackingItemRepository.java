package com.travel.planner.repository;

import com.travel.planner.entity.RoutePackingItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public interface RoutePackingItemRepository extends JpaRepository<RoutePackingItem, Long> {

    List<RoutePackingItem> findByRouteIdOrderByOrderIndexAscIdAsc(Long routeId);

    long countByRouteId(Long routeId);

    long countByRouteIdAndPackedTrue(Long routeId);

    @Query("SELECT r.route.id, COUNT(r) FROM RoutePackingItem r WHERE r.route.id IN :routeIds GROUP BY r.route.id")
    List<Object[]> countByRouteIdIn(@Param("routeIds") Collection<Long> routeIds);

    default Map<Long, Long> countByRouteIdInAsMap(Collection<Long> routeIds) {
        return countByRouteIdIn(routeIds).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
    }

    @Query("SELECT r.route.id, COUNT(r) FROM RoutePackingItem r WHERE r.route.id IN :routeIds AND r.packed = true GROUP BY r.route.id")
    List<Object[]> countPackedByRouteIdIn(@Param("routeIds") Collection<Long> routeIds);

    default Map<Long, Long> countPackedByRouteIdInAsMap(Collection<Long> routeIds) {
        return countPackedByRouteIdIn(routeIds).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
    }
}
