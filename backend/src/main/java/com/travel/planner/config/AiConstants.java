package com.travel.planner.config;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.time.Duration;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class AiConstants {

    public static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";
    public static final Duration OPENAI_CONNECT_TIMEOUT = Duration.ofSeconds(10);
    public static final Duration OPENAI_READ_TIMEOUT = Duration.ofSeconds(60);

    public static final int MAX_POIS_FOR_PROMPT = 60;
    public static final int MAX_DAYS = 7;
    public static final int MIN_DAYS = 1;

    public static final int OPENAI_MAX_TOKENS = 3000;
    public static final double OPENAI_TEMPERATURE = 0.7;
    public static final String OPENAI_RESPONSE_FORMAT = "json_object";

    public static final int DEFAULT_NOTE_MAX_LENGTH = 120;
    public static final int TITLE_MAX_LENGTH = 70;

    public static final int RELAXED_STOPS_PER_DAY = 4;
    public static final int INTENSE_STOPS_PER_DAY = 8;
    public static final int DEFAULT_STOPS_PER_DAY = 6;

    public static final int DEFAULT_VISIT_MINUTES = 60;
    public static final int MUSEUM_VISIT_MINUTES = 90;
    public static final int RESTAURANT_VISIT_MINUTES = 75;
    public static final int CAFE_BAR_VISIT_MINUTES = 45;
    public static final int PARK_VIEWPOINT_VISIT_MINUTES = 60;
}
