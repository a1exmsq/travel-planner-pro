package com.travel.planner.repository;

import com.travel.planner.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByRoute_IdOrderByCreatedAtDesc(Long routeId);
    Page<Comment> findByRoute_IdOrderByCreatedAtDesc(Long routeId, Pageable pageable);
    long countByUserId(Long userId);
}
