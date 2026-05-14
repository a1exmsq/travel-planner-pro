package com.travel.planner.controller;

import com.travel.planner.dto.CountryDTO;
import com.travel.planner.dto.RouteResponseDTO;
import com.travel.planner.service.LocationService;
import com.travel.planner.service.RouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/countries")
@RequiredArgsConstructor
public class CountryController {

    private final LocationService locationService;
    private final RouteService routeService;

    @GetMapping
    public List<CountryDTO> getTopCountries() {
        return locationService.getTopCountries();
    }

    @GetMapping("/top")
    public List<CountryDTO> getTopCountriesAlias() {
        return locationService.getTopCountries();
    }

    @GetMapping("/{id}")
    public CountryDTO getCountryById(@PathVariable Long id) {
        return locationService.getCountryById(id);
    }

    @GetMapping("/{id}/routes")
    public List<RouteResponseDTO> getRoutesByCountry(@PathVariable Long id) {
        return routeService.getPublicRoutesByCountryId(id);
    }

    @GetMapping("/{id}/cities")
    public List<com.travel.planner.dto.CityDTO> getCitiesByCountry(@PathVariable Long id) {
        return locationService.getCitiesByCountry(id);
    }
}
