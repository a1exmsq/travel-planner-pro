package com.travel.planner.service;

import com.travel.planner.dto.UserAchievementDTO;
import com.travel.planner.dto.UserStatsDTO;
import com.travel.planner.entity.*;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.*;
import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class GamificationService {

    private final AchievementRepository achievementRepository;
    private final UserAchievementRepository userAchievementRepository;
    private final UserStatsRepository userStatsRepository;
    private final UserRepository userRepository;
    private final RouteRepository routeRepository;
    private final PointOfInterestRepository pointOfInterestRepository;
    private final RouteCollaboratorRepository collaboratorRepository;
    private final CommentRepository commentRepository;

    @PostConstruct
    @Transactional
    public void ensureCatalog() {
        seed("FIRST_ROUTE", "First Steps", "Created your first route", "🎯", 10, AchievementRarity.COMMON, AchievementType.ROUTE_BASED);
        seed("ROUTE_MASTER", "Route Master", "Created 10 routes", "🗺️", 50, AchievementRarity.RARE, AchievementType.ROUTE_BASED);
        seed("POPULAR_CREATOR", "Popular Creator", "Reached 100 total route likes", "🌟", 100, AchievementRarity.EPIC, AchievementType.SOCIAL);
        seed("DISCOVERER", "Discoverer", "Added 10 personal POIs", "📍", 25, AchievementRarity.COMMON, AchievementType.POI_BASED);
        seed("SECRET_KEEPER", "Secret Keeper", "Saved 5 hidden places", "🔒", 50, AchievementRarity.RARE, AchievementType.POI_BASED);
        seed("GLOBE_TROTTER", "Globe Trotter", "Built routes across 5 countries", "🌍", 50, AchievementRarity.RARE, AchievementType.TRAVEL);
        seed("TEAM_PLAYER", "Team Player", "Joined 5 collaborative routes", "👥", 40, AchievementRarity.RARE, AchievementType.SOCIAL);
        seed("HELPFUL", "Helpful", "Wrote 50 comments", "💬", 30, AchievementRarity.COMMON, AchievementType.SOCIAL);
    }

    @Transactional
    public void checkAndUnlockAchievements(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        refreshStats(user);

        UserStats stats = ensureStats(user);
        int totalRouteLikes = routeRepository.findByUserId(userId).stream()
                .mapToInt(Route::getLikeCount)
                .sum();
        int hiddenPlaces = (int) pointOfInterestRepository.countByUserIdAndIsGlobalFalse(userId);
        long commentsCount = commentRepository.countByUserId(userId);
        long collaborativeRoutes = collaboratorRepository.countByUserIdAndStatus(userId, CollaborationStatus.ACCEPTED);

        unlockIfEligible(user, "FIRST_ROUTE", stats.getRoutesCreated() >= 1, stats.getRoutesCreated());
        unlockIfEligible(user, "ROUTE_MASTER", stats.getRoutesCreated() >= 10, stats.getRoutesCreated());
        unlockIfEligible(user, "POPULAR_CREATOR", totalRouteLikes >= 100, totalRouteLikes);
        unlockIfEligible(user, "DISCOVERER", stats.getPoisAdded() >= 10, stats.getPoisAdded());
        unlockIfEligible(user, "SECRET_KEEPER", hiddenPlaces >= 5, hiddenPlaces);
        unlockIfEligible(user, "GLOBE_TROTTER", stats.getCountriesVisited() >= 5, stats.getCountriesVisited());
        unlockIfEligible(user, "TEAM_PLAYER", collaborativeRoutes >= 5, (int) collaborativeRoutes);
        unlockIfEligible(user, "HELPFUL", commentsCount >= 50, (int) commentsCount);

        refreshStats(user);
    }

    public List<UserAchievementDTO> getUserAchievements(Long userId) {
        ensureUser(userId);
        return userAchievementRepository.findByUserIdOrderByUnlockedAtDesc(userId).stream()
                .map(this::mapAchievement)
                .toList();
    }

    @Transactional
    public UserStatsDTO getUserStats(Long userId) {
        User user = ensureUser(userId);
        refreshStats(user);
        return mapStats(ensureStats(user));
    }

    public List<UserAchievementDTO> getAchievementCatalog() {
        return achievementRepository.findAll().stream()
                .sorted(Comparator.comparing(Achievement::getPoints))
                .map(achievement -> {
                    UserAchievementDTO dto = new UserAchievementDTO();
                    dto.setId(achievement.getId());
                    dto.setCode(achievement.getCode());
                    dto.setName(achievement.getName());
                    dto.setDescription(achievement.getDescription());
                    dto.setIcon(achievement.getIcon());
                    dto.setPoints(achievement.getPoints());
                    dto.setRarity(achievement.getRarity().name());
                    dto.setType(achievement.getType().name());
                    dto.setProgress(0);
                    return dto;
                })
                .toList();
    }

    public List<UserStatsDTO> getLeaderboard(int limit) {
        List<UserStatsDTO> leaderboard = new ArrayList<>();
        for (UserStats stats : userStatsRepository.findAll()) {
            leaderboard.add(mapStats(stats));
        }
        return leaderboard.stream()
                .sorted(Comparator.comparing(UserStatsDTO::getTotalPoints).reversed())
                .limit(Math.max(limit, 1))
                .toList();
    }

    public int calculateLevel(int points) {
        int level = 1;
        while (points >= thresholdForLevel(level + 1)) {
            level++;
        }
        return level;
    }

    public int thresholdForLevel(int level) {
        if (level <= 1) {
            return 0;
        }
        return 100 * level * (level - 1) / 2;
    }

    public String getLevelTitle(int level) {
        if (level <= 5) return "Novice Traveler";
        if (level <= 10) return "Explorer";
        if (level <= 15) return "Adventurer";
        if (level <= 20) return "Wanderer";
        if (level <= 25) return "Globe Trotter";
        if (level <= 30) return "World Traveler";
        return "Legendary Explorer";
    }

    private void seed(String code, String name, String description, String icon, int points,
                      AchievementRarity rarity, AchievementType type) {
        if (achievementRepository.findByCode(code).isPresent()) {
            return;
        }
        Achievement achievement = new Achievement();
        achievement.setCode(code);
        achievement.setName(name);
        achievement.setDescription(description);
        achievement.setIcon(icon);
        achievement.setPoints(points);
        achievement.setRarity(rarity);
        achievement.setType(type);
        achievementRepository.save(achievement);
    }

    private void unlockIfEligible(User user, String code, boolean eligible, int progress) {
        if (!eligible || userAchievementRepository.existsByUserIdAndAchievementCode(user.getId(), code)) {
            return;
        }

        Achievement achievement = achievementRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Achievement catalog entry not found"));

        UserAchievement unlocked = new UserAchievement();
        unlocked.setUser(user);
        unlocked.setAchievement(achievement);
        unlocked.setUnlockedAt(LocalDateTime.now());
        unlocked.setProgress(progress);
        userAchievementRepository.save(unlocked);
        log.info("Achievement unlocked: user={} code={} points={}", user.getUsername(), code, achievement.getPoints());
    }

    private UserAchievementDTO mapAchievement(UserAchievement userAchievement) {
        UserAchievementDTO dto = new UserAchievementDTO();
        dto.setId(userAchievement.getId());
        dto.setCode(userAchievement.getAchievement().getCode());
        dto.setName(userAchievement.getAchievement().getName());
        dto.setDescription(userAchievement.getAchievement().getDescription());
        dto.setIcon(userAchievement.getAchievement().getIcon());
        dto.setPoints(userAchievement.getAchievement().getPoints());
        dto.setRarity(userAchievement.getAchievement().getRarity().name());
        dto.setType(userAchievement.getAchievement().getType().name());
        dto.setUnlockedAt(userAchievement.getUnlockedAt());
        dto.setProgress(userAchievement.getProgress());
        return dto;
    }

    private UserStatsDTO mapStats(UserStats stats) {
        UserStatsDTO dto = new UserStatsDTO();
        dto.setUserId(stats.getUser().getId());
        dto.setUsername(stats.getUser().getDisplayUsername());
        dto.setTotalPoints(stats.getTotalPoints());
        dto.setLevel(stats.getLevel());
        dto.setLevelTitle(getLevelTitle(stats.getLevel()));
        dto.setRoutesCreated(stats.getRoutesCreated());
        dto.setCountriesVisited(stats.getCountriesVisited());
        dto.setCitiesVisited(stats.getCitiesVisited());
        dto.setPoisAdded(stats.getPoisAdded());
        dto.setTotalDistanceTraveled(stats.getTotalDistanceTraveled());
        dto.setCurrentStreak(stats.getCurrentStreak());
        dto.setNextLevelPoints(thresholdForLevel(stats.getLevel() + 1));
        return dto;
    }

    private User ensureUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private UserStats ensureStats(User user) {
        return userStatsRepository.findByUserId(user.getId()).orElseGet(() -> {
            UserStats stats = new UserStats();
            stats.setUser(user);
            stats.setTotalPoints(0);
            stats.setLevel(1);
            stats.setRoutesCreated(0);
            stats.setCountriesVisited(0);
            stats.setCitiesVisited(0);
            stats.setPoisAdded(0);
            stats.setTotalDistanceTraveled(0.0);
            stats.setCurrentStreak(0);
            return userStatsRepository.save(stats);
        });
    }

    private void refreshStats(User user) {
        List<Route> routes = routeRepository.findByUserId(user.getId());
        UserStats stats = ensureStats(user);
        stats.setRoutesCreated(routes.size());
        stats.setCountriesVisited((int) routes.stream()
                .map(Route::getPrimaryCountry)
                .filter(java.util.Objects::nonNull)
                .map(country -> country.getId())
                .distinct()
                .count());
        stats.setCitiesVisited((int) routes.stream()
                .map(Route::getPrimaryCity)
                .filter(java.util.Objects::nonNull)
                .map(city -> city.getId())
                .distinct()
                .count());
        stats.setPoisAdded((int) pointOfInterestRepository.countByUserId(user.getId()));
        stats.setTotalDistanceTraveled(routes.stream()
                .map(Route::getTotalDistanceKm)
                .filter(java.util.Objects::nonNull)
                .reduce(0.0, Double::sum));

        Set<Long> unlockedCodes = userAchievementRepository.findByUserIdOrderByUnlockedAtDesc(user.getId()).stream()
                .map(userAchievement -> userAchievement.getAchievement().getId())
                .collect(java.util.stream.Collectors.toSet());
        int totalPoints = achievementRepository.findAll().stream()
                .filter(achievement -> unlockedCodes.contains(achievement.getId()))
                .mapToInt(Achievement::getPoints)
                .sum();

        stats.setTotalPoints(totalPoints);
        stats.setLevel(calculateLevel(totalPoints));
        stats.setCurrentStreak(stats.getRoutesCreated() > 0 ? 1 : 0);
        userStatsRepository.save(stats);

        user.setPoints(totalPoints);
        userRepository.save(user);
    }
}
