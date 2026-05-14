package com.travel.planner.repository;

import com.travel.planner.entity.RouteJournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RouteJournalEntryRepository extends JpaRepository<RouteJournalEntry, Long> {
    List<RouteJournalEntry> findByRouteIdOrderByEntryDateDescCreatedAtDesc(Long routeId);
    long countByRouteId(Long routeId);
    List<RouteJournalEntry> findTop3ByRouteIdOrderByFavoriteDescEntryDateDescCreatedAtDesc(Long routeId);
}
