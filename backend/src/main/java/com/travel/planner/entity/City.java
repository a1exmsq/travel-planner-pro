package com.travel.planner.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cities")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class City {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 2000)
    private String description;


    private String imageUrl;

    @ElementCollection
    @CollectionTable(name = "city_images", joinColumns = @JoinColumn(name = "city_id"))
    @Column(name = "image_url")
    private List<String> galleryUrls = new ArrayList<>();

    private Double latitude;
    private Double longitude;

    @Column(name = "routes_count")
    private Integer routesCount = 0;

    @Column(name = "poi_count")
    private Integer poiCount = 0;

    @ManyToOne
    @JoinColumn(name = "country_id")
    @JsonIgnore
    private Country country;

    @OneToMany(mappedBy = "city", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<PointOfInterest> pointsOfInterest = new ArrayList<>();
}