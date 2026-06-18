package com.travel.planner.repository;

import com.travel.planner.entity.RouteJournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public interface RouteJournalEntryRepository extends JpaRepository<RouteJournalEntry, Long> {

    List<RouteJournalEntry> findByRouteIdOrderByEntryDateDescCreatedAtDesc(Long routeId);

    long countByRouteId(Long routeId);

    List<RouteJournalEntry> findTop3ByRouteIdOrderByFavoriteDescEntryDateDescCreatedAtDesc(Long routeId);

    @Query("SELECT r.route.id, COUNT(r) FROM RouteJournalEntry r WHERE r.route.id IN :routeIds GROUP BY r.route.id")
    List<Object[]> countByRouteIdIn(@Param("routeIds") Collection<Long> routeIds);

    default Map<Long, Long> countByRouteIdInAsMap(Collection<Long> routeIds) {
        return countByRouteIdIn(routeIds).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
    }
}
