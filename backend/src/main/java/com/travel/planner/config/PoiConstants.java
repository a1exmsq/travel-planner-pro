package com.travel.planner.config;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class PoiConstants {

    public static final String SOURCE_AUTO = "auto";
    public static final String SOURCE_USER = "user";
    public static final String SOURCE_CURATED = "curated";

    public static final String DEFAULT_AUTO_IMAGE =
            "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1000&auto=format&fit=crop";

    public static final int AUTO_QUALITY_SCORE = 52;
    public static final int AUTO_EDITORIAL_SCORE = 40;
    public static final int AUTO_VISIT_MINUTES = 60;

    public static final int USER_QUALITY_SCORE = 35;
    public static final int USER_EDITORIAL_SCORE = 35;
    public static final int USER_VISIT_MINUTES = 45;

    public static final int GLOBAL_QUALITY_SCORE = 78;
    public static final int GLOBAL_EDITORIAL_SCORE = 80;
    public static final int GLOBAL_VISIT_MINUTES = 60;

    public static final int DEFAULT_PRICE_LEVEL = 0;

    public static final int CATALOG_DEFAULT_LIMIT = 120;
    public static final int USER_POI_DEFAULT_LIMIT = 64;
    public static final int MAX_LIMIT = 240;

    public static final int POI_CREATION_POINTS = 5;
}
