package com.travel.planner.controller;

import com.travel.planner.dto.UserAchievementDTO;
import com.travel.planner.dto.UserStatsDTO;
import com.travel.planner.service.GamificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class GamificationController {

    private final GamificationService gamificationService;

    @GetMapping("/users/{id}/achievements")
    public List<UserAchievementDTO> getUserAchievements(@PathVariable Long id) {
        return gamificationService.getUserAchievements(id);
    }

    @GetMapping("/users/{id}/stats")
    public UserStatsDTO getUserStats(@PathVariable Long id) {
        return gamificationService.getUserStats(id);
    }

    @GetMapping("/achievements")
    public List<UserAchievementDTO> getAchievementCatalog() {
        return gamificationService.getAchievementCatalog();
    }

    @GetMapping("/leaderboard")
    public List<UserStatsDTO> getLeaderboard(@RequestParam(defaultValue = "50") int limit) {
        return gamificationService.getLeaderboard(limit);
    }
}
