package com.travel.planner.repository;

import com.travel.planner.entity.UserAchievement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {
    @Query("SELECT COUNT(ua) > 0 FROM UserAchievement ua WHERE ua.user.id = :userId AND ua.achievement.code = :code")
    boolean existsByUserIdAndAchievementCode(@Param("userId") Long userId, @Param("code") String code);

    List<UserAchievement> findByUserIdOrderByUnlockedAtDesc(Long userId);

    Page<UserAchievement> findByUserIdOrderByUnlockedAtDesc(Long userId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(a.points), 0) FROM UserAchievement ua JOIN ua.achievement a WHERE ua.user.id = :userId")
    int sumPointsByUserId(@Param("userId") Long userId);
}
