package com.travel.planner.service;

import com.travel.planner.dto.WeatherOverviewDTO;
import com.travel.planner.entity.City;
import com.travel.planner.entity.Route;
import com.travel.planner.entity.User;
import com.travel.planner.repository.CityRepository;
import com.travel.planner.service.provider.WeatherProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WeatherService {

    private final RouteAccessService routeAccessService;
    private final CityRepository cityRepository;
    private final WeatherProvider weatherProvider;

    public WeatherOverviewDTO getRouteWeather(Long routeId, User currentUser) {
        Route route = routeAccessService.findViewableRoute(routeId, currentUser);
        return weatherProvider.getForecast(route);
    }

    public WeatherOverviewDTO getCityWeather(Long cityId) {
        City city = cityRepository.findById(cityId)
                .orElseThrow(() -> new RuntimeException("City not found"));
        return weatherProvider.getCityForecast(city);
    }
}
