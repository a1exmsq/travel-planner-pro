package com.travel.planner.dto;

import com.travel.planner.entity.Continent;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContinentDTO {
    private Long id;
    private String name;
    private String code;
    private String description;
    private String imageUrl;
    private String emoji;
    private Integer countriesCount;
    private Integer routesCount;

    public static ContinentDTO fromEntity(Continent continent) {
        return new ContinentDTO(
                continent.getId(),
                continent.getName(),
                continent.getCode(),
                continent.getDescription(),
                continent.getImageUrl(),
                continent.getEmoji(),
                continent.getCountriesCount(),
                continent.getRoutesCount()
        );
    }
}