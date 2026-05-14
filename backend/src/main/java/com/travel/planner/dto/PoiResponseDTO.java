package com.travel.planner.dto;

import com.travel.planner.entity.PointOfInterest;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
public class PoiResponseDTO {

    private Long routePoiId;
    private Long id;
    private String name;
    private String category;
    private Integer orderIndex;
    private Integer travelTimeMinutes;
    private Double latitude;
    private Double longitude;
    private String description;
    private String mainImageUrl;
    private String imageUrl;
    private List<String> galleryUrls;
    private Boolean isGlobal;
    private String address;
    private Long cityId;
    private String cityName;
    private Long countryId;
    private String countryName;
    private String source;
    private String externalSourceId;
    private String sourceUrl;
    private Integer editorialScore;
    private Integer qualityScore;
    private Integer visitMinutes;
    private Integer priceLevel;
    private Integer usageCount;
    private Boolean featured;
    private Boolean verified;
    private String importBatch;
    private List<String> tags;

    public PoiResponseDTO(String name, String category, Integer orderIndex,
                          Integer travelTimeMinutes, Double latitude, Double longitude,
                          String description, String mainImageUrl, List<String> galleryUrls) {
        this.name = name;
        this.category = category;
        this.orderIndex = orderIndex;
        this.travelTimeMinutes = travelTimeMinutes;
        this.latitude = latitude;
        this.longitude = longitude;
        this.description = description;
        this.mainImageUrl = mainImageUrl;
        this.galleryUrls = galleryUrls;
    }

    public PoiResponseDTO(PointOfInterest poi) {
        if (poi != null) {
            this.id = poi.getId();
            this.name = poi.getName();
            this.category = poi.getCategory();
            this.description = poi.getDescription();
            this.latitude = poi.getLatitude();
            this.longitude = poi.getLongitude();
            this.mainImageUrl = poi.getMainImageUrl();
            this.imageUrl = poi.getImageUrl();
            this.galleryUrls = poi.getGalleryUrls();
            this.isGlobal = poi.getIsGlobal();
            this.address = poi.getAddress();
            this.source = poi.getSource();
            this.externalSourceId = poi.getExternalSourceId();
            this.sourceUrl = poi.getSourceUrl();
            this.editorialScore = poi.getEditorialScore();
            this.qualityScore = poi.getQualityScore();
            this.visitMinutes = poi.getVisitMinutes();
            this.priceLevel = poi.getPriceLevel();
            this.usageCount = poi.getUsageCount();
            this.featured = poi.getFeatured();
            this.verified = poi.getVerified();
            this.importBatch = poi.getImportBatch();
            this.tags = poi.getTags();
            if (poi.getCity() != null) {
                this.cityId = poi.getCity().getId();
                this.cityName = poi.getCity().getName();
                if (poi.getCity().getCountry() != null) {
                    this.countryId = poi.getCity().getCountry().getId();
                    this.countryName = poi.getCity().getCountry().getName();
                }
            }
        }
    }
}
