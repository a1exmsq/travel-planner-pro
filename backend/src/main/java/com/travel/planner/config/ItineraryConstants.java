package com.travel.planner.config;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ItineraryConstants {

    public static final LocalTime DEFAULT_ACTIVITY_START_TIME = LocalTime.of(9, 0);
    public static final int DEFAULT_ACTIVITY_DURATION_MINUTES = 30;
    public static final double DAY_OVERLOAD_RATIO = 1.25;
    public static final int MIN_DAILY_TARGET_MINUTES = 1;
    public static final String DEFAULT_DAY_TITLE_PREFIX = "Day ";
    public static final int MIN_STOPS_FOR_PLANNING = 1;
}
