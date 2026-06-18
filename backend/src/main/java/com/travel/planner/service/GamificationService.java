package com.travel.planner.service;

import com.travel.planner.config.GamificationConstants;
import com.travel.planner.dto.UserAchievementDTO;
import com.travel.planner.dto.UserStatsDTO;
import com.travel.planner.entity.Achievement;
import com.travel.planner.entity.AchievementRarity;
import com.travel.planner.entity.AchievementType;
import com.travel.planner.entity.CollaborationStatus;
import com.travel.planner.entity.User;
import com.travel.planner.entity.UserAchievement;
import com.travel.planner.entity.UserStats;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.AchievementRepository;
import com.travel.planner.repository.CommentRepository;
import com.travel.planner.repository.PointOfInterestRepository;
import com.travel.planner.repository.RouteCollaboratorRepository;
import com.travel.planner.repository.RouteRepository;
import com.travel.planner.repository.UserAchievementRepository;
import com.travel.planner.repository.UserRepository;
import com.travel.planner.repository.UserStatsRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

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

    private final Map<String, Achievement> achievementCatalog = new ConcurrentHashMap<>();

    @PostConstruct
    public void ensureCatalog() {
        seed("FIRST_ROUTE", "First Steps", "Created your first route", "\uD83C\uDFAF",
                10, AchievementRarity.COMMON, AchievementType.ROUTE_BASED);
        seed("ROUTE_MASTER", "Route Master", "Created 10 routes", "\uD83D\uDDFA\uFE0F",
                50, AchievementRarity.RARE, AchievementType.ROUTE_BASED);
        seed("POPULAR_CREATOR", "Popular Creator", "Reached 100 total route likes", "\uD83C\uDF1F",
                100, AchievementRarity.EPIC, AchievementType.SOCIAL);
        seed("DISCOVERER", "Discoverer", "Added 10 personal POIs", "\uD83D\uDCCD",
                25, AchievementRarity.COMMON, AchievementType.POI_BASED);
        seed("SECRET_KEEPER", "Secret Keeper", "Saved 5 hidden places", "\uD83D\uDD12",
                50, AchievementRarity.RARE, AchievementType.POI_BASED);
        seed("GLOBE_TROTTER", "Globe Trotter", "Built routes across 5 countries", "\uD83C\uDF0D",
                50, AchievementRarity.RARE, AchievementType.TRAVEL);
        seed("TEAM_PLAYER", "Team Player", "Joined 5 collaborative routes", "\uD83D\uDC65",
                40, AchievementRarity.RARE, AchievementType.SOCIAL);
        seed("HELPFUL", "Helpful", "Wrote 50 comments", "\uD83D\uDCAC",
                30, AchievementRarity.COMMON, AchievementType.SOCIAL);
    }

    @Transactional
    public void checkAndUnlockAchievements(Long userId) {
        User user = ensureUser(userId);
        refreshStats(user);

        UserStats stats = ensureStats(user);
        int totalRouteLikes = routeRepository.sumLikeCountByUserId(userId);
        int hiddenPlaces = (int) pointOfInterestRepository.countByUserIdAndIsGlobalFalse(userId);
        long commentsCount = commentRepository.countByUserId(userId);
        long collaborativeRoutes = collaboratorRepository.countByUserIdAndStatus(userId, CollaborationStatus.ACCEPTED);

        unlockIfEligible(user, "FIRST_ROUTE", stats.getRoutesCreated() >= GamificationConstants.ACHIEVEMENT_FIRST_ROUTE_ROUTES, stats.getRoutesCreated());
        unlockIfEligible(user, "ROUTE_MASTER", stats.getRoutesCreated() >= GamificationConstants.ACHIEVEMENT_ROUTE_MASTER_ROUTES, stats.getRoutesCreated());
        unlockIfEligible(user, "POPULAR_CREATOR", totalRouteLikes >= GamificationConstants.ACHIEVEMENT_POPULAR_CREATOR_LIKES, totalRouteLikes);
        unlockIfEligible(user, "DISCOVERER", stats.getPoisAdded() >= GamificationConstants.ACHIEVEMENT_DISCOVERER_POIS, stats.getPoisAdded());
        unlockIfEligible(user, "SECRET_KEEPER", hiddenPlaces >= GamificationConstants.ACHIEVEMENT_SECRET_KEEPER_PLACES, hiddenPlaces);
        unlockIfEligible(user, "GLOBE_TROTTER", stats.getCountriesVisited() >= GamificationConstants.ACHIEVEMENT_GLOBE_TROTTER_COUNTRIES, stats.getCountriesVisited());
        unlockIfEligible(user, "TEAM_PLAYER", collaborativeRoutes >= GamificationConstants.ACHIEVEMENT_TEAM_PLAYER_ROUTES, (int) collaborativeRoutes);
        unlockIfEligible(user, "HELPFUL", commentsCount >= GamificationConstants.ACHIEVEMENT_HELPFUL_COMMENTS, (int) commentsCount);

        refreshStats(user);
    }

    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
    public List<UserAchievementDTO> getAchievementCatalog() {
        return achievementCatalog.values().stream()
                .sorted(Comparator.comparing(Achievement::getPoints))
                .map(this::mapCatalogAchievement)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserStatsDTO> getLeaderboard(int limit) {
        int safeLimit = Math.clamp(limit, GamificationConstants.MIN_LEADERBOARD_LIMIT, GamificationConstants.MAX_LEADERBOARD_LIMIT);
        Pageable pageable = PageRequest.of(0, safeLimit);
        Page<UserStats> page = userStatsRepository.findAllByOrderByTotalPointsDesc(pageable);
        return page.getContent().stream()
                .map(this::mapStats)
                .toList();
    }

    public int calculateLevel(int points) {
        int level = GamificationConstants.BASE_LEVEL;
        while (points >= thresholdForLevel(level + 1)) {
            level++;
        }
        return level;
    }

    public int thresholdForLevel(int level) {
        if (level <= 1) {
            return 0;
        }
        return GamificationConstants.LEVEL_THRESHOLD_MULTIPLIER * level * (level - 1)
                / GamificationConstants.LEVEL_THRESHOLD_DIVISOR;
    }

    public String getLevelTitle(int level) {
        if (level <= GamificationConstants.NOVICE_TRAVELER_MAX_LEVEL) return "Novice Traveler";
        if (level <= GamificationConstants.EXPLORER_MAX_LEVEL) return "Explorer";
        if (level <= GamificationConstants.ADVENTURER_MAX_LEVEL) return "Adventurer";
        if (level <= GamificationConstants.WANDERER_MAX_LEVEL) return "Wanderer";
        if (level <= GamificationConstants.GLOBE_TROTTER_MAX_LEVEL) return "Globe Trotter";
        if (level <= GamificationConstants.WORLD_TRAVELER_MAX_LEVEL) return "World Traveler";
        return "Legendary Explorer";
    }

    private void seed(String code, String name, String description, String icon, int points,
                      AchievementRarity rarity, AchievementType type) {
        Achievement achievement = achievementRepository.findByCode(code).orElseGet(() -> {
            Achievement a = new Achievement();
            a.setCode(code);
            return saveAndCache(a);
        });
        achievement.setName(name);
        achievement.setDescription(description);
        achievement.setIcon(icon);
        achievement.setPoints(points);
        achievement.setRarity(rarity);
        achievement.setType(type);
        achievementCatalog.put(code, saveAndCache(achievement));
    }

    private Achievement saveAndCache(Achievement achievement) {
        Achievement saved = achievementRepository.save(achievement);
        achievementCatalog.put(saved.getCode(), saved);
        return saved;
    }

    private void unlockIfEligible(User user, String code, boolean eligible, int progress) {
        if (!eligible) {
            return;
        }
        Achievement achievement = achievementCatalog.get(code);
        if (achievement == null) {
            return;
        }

        UserAchievement unlocked = new UserAchievement();
        unlocked.setUser(user);
        unlocked.setAchievement(achievement);
        unlocked.setUnlockedAt(LocalDateTime.now());
        unlocked.setProgress(progress);

        try {
            userAchievementRepository.save(unlocked);
            log.info("Achievement unlocked: user={} code={} points={}", user.getUsername(), code, achievement.getPoints());
        } catch (DataIntegrityViolationException e) {
            log.debug("Achievement already unlocked: user={} code={}", user.getUsername(), code);
        }
    }

    private UserAchievementDTO mapAchievement(UserAchievement userAchievement) {
        Achievement achievement = userAchievement.getAchievement();
        UserAchievementDTO dto = new UserAchievementDTO();
        dto.setId(userAchievement.getId());
        dto.setCode(achievement.getCode());
        dto.setName(achievement.getName());
        dto.setDescription(achievement.getDescription());
        dto.setIcon(achievement.getIcon());
        dto.setPoints(achievement.getPoints());
        dto.setRarity(achievement.getRarity().name());
        dto.setType(achievement.getType().name());
        dto.setUnlockedAt(userAchievement.getUnlockedAt());
        dto.setProgress(userAchievement.getProgress());
        return dto;
    }

    private UserAchievementDTO mapCatalogAchievement(Achievement achievement) {
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
            stats.setLevel(GamificationConstants.BASE_LEVEL);
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
        int attempts = 0;
        while (attempts < GamificationConstants.OPTIMISTIC_LOCK_RETRY_ATTEMPTS) {
            try {
                updateStatsWithLock(user);
                return;
            } catch (OptimisticLockingFailureException e) {
                attempts++;
                sleep(GamificationConstants.OPTIMISTIC_LOCK_RETRY_DELAY_MS * attempts);
            }
        }
        log.warn("Failed to refresh stats for user {} after {} attempts", user.getId(), attempts);
    }

    private void updateStatsWithLock(User user) {
        UserStats stats = ensureStats(user);
        stats.setRoutesCreated((int) routeRepository.countByUserId(user.getId()));
        stats.setCountriesVisited((int) routeRepository.countDistinctPrimaryCountryIdByUserId(user.getId()));
        stats.setCitiesVisited((int) routeRepository.countDistinctPrimaryCityIdByUserId(user.getId()));
        stats.setPoisAdded((int) pointOfInterestRepository.countByUserId(user.getId()));
        stats.setTotalDistanceTraveled(routeRepository.sumTotalDistanceKmByUserId(user.getId()));
        stats.setTotalPoints(userAchievementRepository.sumPointsByUserId(user.getId()));
        stats.setLevel(calculateLevel(stats.getTotalPoints()));
        stats.setCurrentStreak(stats.getRoutesCreated() > 0 ? 1 : 0);
        userStatsRepository.save(stats);

        user.setPoints(stats.getTotalPoints());
        userRepository.save(user);
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
