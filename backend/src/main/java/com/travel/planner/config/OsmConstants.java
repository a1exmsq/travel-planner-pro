package com.travel.planner.config;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class OsmConstants {

    public static final String OVERPASS_URL = "https://overpass-api.de/api/interpreter";
    public static final int RADIUS_METERS = 3500;
    public static final int MAX_IMPORT = 250;
    public static final int QUERY_TIMEOUT_SECONDS = 30;

    public static final String SOURCE_NAME = "osm";
    public static final String EXTERNAL_SOURCE_PREFIX = "osm";
    public static final String CONTENT_TYPE_FORM_URLENCODED = "application/x-www-form-urlencoded";

    public static final int QUALITY_BASE_SCORE = 30;
    public static final int QUALITY_WEBSITE_BONUS = 10;
    public static final int QUALITY_OPENING_HOURS_BONUS = 10;
    public static final int QUALITY_PHONE_BONUS = 5;
    public static final int QUALITY_DESCRIPTION_BONUS = 10;
    public static final int QUALITY_IMAGE_BONUS = 15;

    public static final String DEFAULT_IMAGE =
            "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800";
}
