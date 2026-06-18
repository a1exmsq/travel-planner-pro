package com.travel.planner.repository;

import com.travel.planner.entity.RoutePOI;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public interface RoutePOIRepository extends JpaRepository<RoutePOI, Long> {

    void deleteByRouteId(Long routeId);

    List<RoutePOI> findByRouteIdOrderByOrderIndexAsc(Long routeId);

    long countByRouteId(Long routeId);

    @Query("SELECT rp.route.id, COUNT(rp) FROM RoutePOI rp WHERE rp.route.id IN :routeIds GROUP BY rp.route.id")
    List<Object[]> countByRouteIdIn(@Param("routeIds") Collection<Long> routeIds);

    default Map<Long, Long> countByRouteIdInAsMap(Collection<Long> routeIds) {
        return countByRouteIdIn(routeIds).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
    }
}
