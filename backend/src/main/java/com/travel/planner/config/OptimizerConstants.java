package com.travel.planner.config;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class OptimizerConstants {

    public static final double EARTH_RADIUS_KM = 6371.0;
    public static final double ROAD_TRIP_SPEED_KMH = 30.0;
    public static final double CITY_WALK_SPEED_KMH = 5.0;

    public static final double ROUNDING_FACTOR = 10.0;
    public static final int METERS_PER_KM = 1000;
    public static final int SECONDS_PER_MINUTE = 60;

    public static final int MIN_STOPS_FOR_OPTIMIZATION = 3;
    public static final int MIN_COORDINATE_STOPS = 2;
}
