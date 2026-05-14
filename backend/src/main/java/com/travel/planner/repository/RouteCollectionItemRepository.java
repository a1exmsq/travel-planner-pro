package com.travel.planner.repository;

import com.travel.planner.entity.RouteCollectionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RouteCollectionItemRepository extends JpaRepository<RouteCollectionItem, Long> {
    boolean existsByCollectionIdAndRouteId(Long collectionId, Long routeId);

    void deleteByCollectionIdAndRouteId(Long collectionId, Long routeId);
}
