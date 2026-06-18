package com.travel.planner.config;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class RouteConstants {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    public static final int MAX_VIBE_TAGS = 8;
    public static final int MAX_TAG_LENGTH = 32;
    public static final int TRENDING_TAG_LIMIT = 12;
    public static final int MAX_ROUTE_NAME_LENGTH = 100;
    public static final int MAX_ROUTE_DESCRIPTION_LENGTH = 1000;
    public static final int MAX_REGION_LABEL_LENGTH = 120;
    public static final int MAX_LOCATION_SUMMARY_LENGTH = 255;
    public static final String DEFAULT_CURRENCY = "USD";

    public static final int DIFFICULTY_EASY_MAX_STOPS = 3;
    public static final int DIFFICULTY_PACKED_MAX_STOPS = 7;
    public static final String DIFFICULTY_EASY = "Easy";
    public static final String DIFFICULTY_PACKED = "Packed day";
    public static final String DIFFICULTY_HARD = "Road warrior";
}
