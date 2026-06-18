package com.travel.planner.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;


@Entity @Table(name = "pois")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PointOfInterest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String category;

    @Column(length = 1000)
    private String description;

    private Double rating = 0.0;
    private Double latitude;
    private Double longitude;

    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    private String address;

    @ManyToOne
    @JoinColumn(name = "city_id")
    @JsonIgnore
    private City city;

    @Column(columnDefinition = "TEXT")
    private String mainImageUrl;

    @ElementCollection
    @CollectionTable(name = "poi_images", joinColumns = @JoinColumn(name = "poi_id"))
    @Column(name = "image_url", columnDefinition = "TEXT")
    private List<String> galleryUrls = new ArrayList<>();

    @ManyToOne
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    @Column(nullable = false)
    private Boolean isGlobal = false;

    @Column(name = "usage_count")
    private Integer usageCount = 0;

    @Column(length = 40)
    private String source;

    @Column(name = "external_source_id", length = 120)
    private String externalSourceId;

    @Column(name = "source_url", length = 500)
    private String sourceUrl;

    @Column(name = "editorial_score")
    private Integer editorialScore = 0;

    @Column(name = "quality_score")
    private Integer qualityScore = 0;

    @Column(name = "visit_minutes")
    private Integer visitMinutes = 60;

    @Column(name = "price_level")
    private Integer priceLevel = 0;

    private Boolean featured = false;

    private Boolean verified = false;

    @Column(name = "import_batch", length = 80)
    private String importBatch;

    @ElementCollection
    @CollectionTable(name = "poi_tags", joinColumns = @JoinColumn(name = "poi_id"))
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();
}
