package com.travel.planner.dto;

import com.travel.planner.entity.Country;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CountryDTO {
    private Long id;
    private String name;
    private String code;
    private String description;
    private String imageUrl;
    private String flagEmoji;
    private Integer citiesCount;
    private Integer routesCount;
    private Integer poiCount;

    private Long continentId;
    private String continentName;

    public static CountryDTO fromEntity(Country country) {
        return new CountryDTO(
                country.getId(),
                country.getName(),
                country.getCode(),
                country.getDescription(),
                country.getImageUrl(),
                country.getFlagEmoji(),
                country.getCitiesCount(),
                country.getRoutesCount(),
                country.getPoiCount(),
                country.getContinent() != null ? country.getContinent().getId() : null,
                country.getContinent() != null ? country.getContinent().getName() : null
        );
    }
}