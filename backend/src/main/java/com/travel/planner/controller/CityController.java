package com.travel.planner.controller;

import com.travel.planner.dto.CityDTO;
import com.travel.planner.dto.RouteResponseDTO;
import com.travel.planner.dto.WeatherOverviewDTO;
import com.travel.planner.service.LocationService;
import com.travel.planner.service.RouteService;
import com.travel.planner.service.WeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cities")
@RequiredArgsConstructor
public class CityController {

    private final LocationService locationService;
    private final RouteService routeService;
    private final WeatherService weatherService;

    @GetMapping
    public List<CityDTO> getTopCities() {
        return locationService.getTopCities();
    }

    @GetMapping("/top")
    public List<CityDTO> getTopCitiesAlias() {
        return locationService.getTopCities();
    }

    @GetMapping("/{id}")
    public CityDTO getCityById(@PathVariable Long id) {
        return locationService.getCityById(id);
    }

    @GetMapping("/{id}/routes")
    public List<RouteResponseDTO> getRoutesByCity(@PathVariable Long id) {
        return routeService.getPublicRoutesByCityId(id);
    }

    @GetMapping("/{id}/weather")
    public WeatherOverviewDTO getWeatherByCity(@PathVariable Long id) {
        return weatherService.getCityWeather(id);
    }

    @GetMapping("/country/{countryId}")
    public List<CityDTO> getCitiesByCountry(@PathVariable Long countryId) {
        return locationService.getCitiesByCountry(countryId);
    }

    @GetMapping("/search")
    public List<CityDTO> searchCities(@RequestParam String q) {
        return locationService.searchCities(q);
    }
}
