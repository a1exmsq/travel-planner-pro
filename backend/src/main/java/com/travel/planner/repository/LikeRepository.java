package com.travel.planner.repository;

import com.travel.planner.entity.Like;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LikeRepository extends JpaRepository<Like, Long> {
    boolean existsByUser_IdAndRoute_Id(Long userId, Long routeId);
    Optional<Like> findByUser_IdAndRoute_Id(Long userId, Long routeId);
    long countByRoute_User_Id(Long userId);
}
