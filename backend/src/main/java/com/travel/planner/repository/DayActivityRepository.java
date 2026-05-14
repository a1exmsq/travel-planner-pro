package com.travel.planner.repository;

import com.travel.planner.entity.DayActivity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DayActivityRepository extends JpaRepository<DayActivity, Long> {
    List<DayActivity> findByRouteDayIdOrderByOrderIndexAsc(Long routeDayId);
}
