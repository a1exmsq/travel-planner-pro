package com.travel.planner.config;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class GamificationConstants {

    public static final int DEFAULT_LEADERBOARD_LIMIT = 50;
    public static final int MIN_LEADERBOARD_LIMIT = 1;
    public static final int MAX_LEADERBOARD_LIMIT = 100;

    public static final int BASE_LEVEL = 1;
    public static final int LEVEL_THRESHOLD_MULTIPLIER = 100;
    public static final int LEVEL_THRESHOLD_DIVISOR = 2;

    public static final int NOVICE_TRAVELER_MAX_LEVEL = 5;
    public static final int EXPLORER_MAX_LEVEL = 10;
    public static final int ADVENTURER_MAX_LEVEL = 15;
    public static final int WANDERER_MAX_LEVEL = 20;
    public static final int GLOBE_TROTTER_MAX_LEVEL = 25;
    public static final int WORLD_TRAVELER_MAX_LEVEL = 30;

    public static final int ACHIEVEMENT_FIRST_ROUTE_ROUTES = 1;
    public static final int ACHIEVEMENT_ROUTE_MASTER_ROUTES = 10;
    public static final int ACHIEVEMENT_POPULAR_CREATOR_LIKES = 100;
    public static final int ACHIEVEMENT_DISCOVERER_POIS = 10;
    public static final int ACHIEVEMENT_SECRET_KEEPER_PLACES = 5;
    public static final int ACHIEVEMENT_GLOBE_TROTTER_COUNTRIES = 5;
    public static final int ACHIEVEMENT_TEAM_PLAYER_ROUTES = 5;
    public static final int ACHIEVEMENT_HELPFUL_COMMENTS = 50;

    public static final int OPTIMISTIC_LOCK_RETRY_ATTEMPTS = 3;
    public static final long OPTIMISTIC_LOCK_RETRY_DELAY_MS = 10L;
}
