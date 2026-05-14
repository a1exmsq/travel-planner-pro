package com.travel.planner.controller;

import com.travel.planner.dto.WeatherOverviewDTO;
import com.travel.planner.entity.User;
import com.travel.planner.service.WeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping("/{id}/weather")
    public WeatherOverviewDTO getRouteWeather(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return weatherService.getRouteWeather(id, currentUser);
    }
}
