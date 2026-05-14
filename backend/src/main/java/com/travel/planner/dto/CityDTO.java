package com.travel.planner.dto;

import com.travel.planner.entity.City;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CityDTO {
    private Long id;
    private String name;
    private String description;
    private String imageUrl;
    private List<String> galleryUrls;
    private Double latitude;
    private Double longitude;
    private Integer routesCount;
    private Integer poiCount;

    private Long countryId;
    private String countryName;
    private String countryCode;
    private String flagEmoji;

    public static CityDTO fromEntity(City city) {
        CityDTO dto = new CityDTO();
        dto.setId(city.getId());
        dto.setName(city.getName());
        dto.setDescription(city.getDescription());
        dto.setImageUrl(city.getImageUrl());
        dto.setGalleryUrls(city.getGalleryUrls() != null ? city.getGalleryUrls() : new ArrayList<>());
        dto.setLatitude(city.getLatitude());
        dto.setLongitude(city.getLongitude());
        dto.setRoutesCount(city.getRoutesCount());
        dto.setPoiCount(city.getPoiCount());

        if (city.getCountry() != null) {
            dto.setCountryId(city.getCountry().getId());
            dto.setCountryName(city.getCountry().getName());
            dto.setCountryCode(city.getCountry().getCode());
            dto.setFlagEmoji(city.getCountry().getFlagEmoji());
        }

        return dto;
    }
}