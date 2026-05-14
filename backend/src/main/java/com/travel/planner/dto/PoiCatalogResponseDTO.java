package com.travel.planner.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PoiCatalogResponseDTO {
    private List<PoiResponseDTO> items;
    private List<PoiCategoryCountDTO> categories;
    private Integer total;
    private Integer featuredCount;
    private Long cityId;
    private Long countryId;
}
