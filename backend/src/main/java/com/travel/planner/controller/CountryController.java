package com.travel.planner.controller;

import com.travel.planner.dto.CountryDTO;
import com.travel.planner.dto.RouteShortDTO;
import com.travel.planner.service.LocationService;
import com.travel.planner.service.RouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    public Page<RouteShortDTO> getRoutesByCountry(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return routeService.getPublicRoutesByCountryId(id, page, size);
    }

    @GetMapping("/{id}/cities")
    public List<com.travel.planner.dto.CityDTO> getCitiesByCountry(@PathVariable Long id) {
        return locationService.getCitiesByCountry(id);
    }
}
