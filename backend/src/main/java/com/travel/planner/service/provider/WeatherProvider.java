package com.travel.planner.service.provider;

import com.travel.planner.dto.WeatherOverviewDTO;
import com.travel.planner.entity.City;
import com.travel.planner.entity.Route;

public interface WeatherProvider {
    default String providerName() {
        return "stub";
    }

    default WeatherOverviewDTO getForecast(Route route) {
        throw new UnsupportedOperationException("Weather integration is prepared for Phase 2 and is not enabled yet");
    }

    default WeatherOverviewDTO getCityForecast(City city) {
        throw new UnsupportedOperationException("City weather integration is prepared for Phase 2 and is not enabled yet");
    }
}
