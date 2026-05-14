package com.travel.planner.controller;

import com.travel.planner.dto.CityDTO;
import com.travel.planner.dto.ContinentDTO;
import com.travel.planner.dto.CountryDTO;
import com.travel.planner.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @GetMapping("/continents")
    public ResponseEntity<List<ContinentDTO>> getAllContinents() {
        return ResponseEntity.ok(locationService.getAllContinents());
    }

    @GetMapping("/continents/{id}")
    public ResponseEntity<ContinentDTO> getContinentById(@PathVariable Long id) {
        return ResponseEntity.ok(locationService.getContinentById(id));
    }

    @GetMapping("/continents/code/{code}")
    public ResponseEntity<ContinentDTO> getContinentByCode(@PathVariable String code) {
        return ResponseEntity.ok(locationService.getContinentByCode(code));
    }


    @GetMapping("/continents/{continentId}/countries")
    public ResponseEntity<List<CountryDTO>> getCountriesByContinent(@PathVariable Long continentId) {
        return ResponseEntity.ok(locationService.getCountriesByContinent(continentId));
    }

    @GetMapping("/countries/{id}")
    public ResponseEntity<CountryDTO> getCountryById(@PathVariable Long id) {
        return ResponseEntity.ok(locationService.getCountryById(id));
    }

    @GetMapping("/countries/top")
    public ResponseEntity<List<CountryDTO>> getTopCountries() {
        return ResponseEntity.ok(locationService.getTopCountries());
    }

    @GetMapping("/countries/{countryId}/cities")
    public ResponseEntity<List<CityDTO>> getCitiesByCountry(@PathVariable Long countryId) {
        return ResponseEntity.ok(locationService.getCitiesByCountry(countryId));
    }

    @GetMapping("/cities/{id}")
    public ResponseEntity<CityDTO> getCityById(@PathVariable Long id) {
        return ResponseEntity.ok(locationService.getCityById(id));
    }

    @GetMapping("/cities/top")
    public ResponseEntity<List<CityDTO>> getTopCities() {
        return ResponseEntity.ok(locationService.getTopCities());
    }

    @GetMapping("/cities/search")
    public ResponseEntity<List<CityDTO>> searchCities(@RequestParam String q) {
        return ResponseEntity.ok(locationService.searchCities(q));
    }

    @GetMapping("/cities/nearby")
    public ResponseEntity<List<CityDTO>> getCitiesNearby(
            @RequestParam Double lat,
            @RequestParam Double lng,
            @RequestParam(defaultValue = "100") Double radius
    ) {
        return ResponseEntity.ok(locationService.getCitiesNearby(lat, lng, radius));
    }
}