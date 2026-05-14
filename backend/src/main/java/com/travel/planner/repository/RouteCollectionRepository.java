package com.travel.planner.repository;

import com.travel.planner.entity.RouteCollection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteCollectionRepository extends JpaRepository<RouteCollection, Long> {
    List<RouteCollection> findByUserIdOrderByIdDesc(Long userId);

    Optional<RouteCollection> findByIdAndUserId(Long id, Long userId);
}
