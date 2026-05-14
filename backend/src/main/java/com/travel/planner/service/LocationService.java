package com.travel.planner.service;

import com.travel.planner.dto.CityDTO;
import com.travel.planner.dto.ContinentDTO;
import com.travel.planner.dto.CountryDTO;
import com.travel.planner.entity.City;
import com.travel.planner.entity.Continent;
import com.travel.planner.entity.Country;
import com.travel.planner.repository.CityRepository;
import com.travel.planner.repository.ContinentRepository;
import com.travel.planner.repository.CountryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final ContinentRepository continentRepository;
    private final CountryRepository countryRepository;
    private final CityRepository cityRepository;

    @Transactional(readOnly = true)
    public List<ContinentDTO> getAllContinents() {
        return continentRepository.findAllByOrderByRoutesCountDesc()
                .stream()
                .map(ContinentDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public ContinentDTO getContinentById(Long id) {
        Continent continent = continentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Континент не найден"));
        return ContinentDTO.fromEntity(continent);
    }

    public ContinentDTO getContinentByCode(String code) {
        Continent continent = continentRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Континент не найден"));
        return ContinentDTO.fromEntity(continent);
    }

    public List<CountryDTO> getCountriesByContinent(Long continentId) {
        return countryRepository.findByContinentIdOrderByRoutesCountDesc(continentId)
                .stream()
                .map(CountryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public CountryDTO getCountryById(Long id) {
        Country country = countryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Страна не найдена"));
        return CountryDTO.fromEntity(country);
    }

    public List<CountryDTO> getTopCountries() {
        return countryRepository.findTop10ByOrderByRoutesCountDesc()
                .stream()
                .map(CountryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<CityDTO> getCitiesByCountry(Long countryId) {
        return cityRepository.findByCountryIdOrderByRoutesCountDesc(countryId)
                .stream()
                .map(CityDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public CityDTO getCityById(Long id) {
        City city = cityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Город не найден"));
        return CityDTO.fromEntity(city);
    }

    public List<CityDTO> getTopCities() {
        return cityRepository.findTop20OrderByScore()
                .stream()
                .map(CityDTO::fromEntity)
                .collect(Collectors.toList());
    }


    public List<CityDTO> searchCities(String query) {
        return cityRepository.findTop10ByNameContainingIgnoreCaseOrderByRoutesCountDesc(query)
                .stream()
                .map(CityDTO::fromEntity)
                .collect(Collectors.toList());
    }


    public List<CityDTO> getCitiesNearby(Double lat, Double lng, Double radiusKm) {
        return cityRepository.findCitiesWithinRadius(lat, lng, radiusKm)
                .stream()
                .map(CityDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public Continent createOrUpdateContinent(Continent continent) {
        return continentRepository.save(continent);
    }

    @Transactional
    public Country createOrUpdateCountry(Country country) {
        return countryRepository.save(country);
    }

    @Transactional
    public City createOrUpdateCity(City city) {
        return cityRepository.save(city);
    }
}