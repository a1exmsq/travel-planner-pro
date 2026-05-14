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
@Table(name = "countries")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class Country {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 3)
    private String code;

    @Column(length = 2000)
    private String description;

    private String imageUrl;

    // emoji (🇵🇱, 🇺🇸, 🇫🇷)
    private String flagEmoji;

    @Column(name = "cities_count")
    private Integer citiesCount = 0;

    @Column(name = "routes_count")
    private Integer routesCount = 0;

    @Column(name = "poi_count")
    private Integer poiCount = 0;

    @ManyToOne
    @JoinColumn(name = "continent_id")
    @JsonIgnore
    private Continent continent;

    @OneToMany(mappedBy = "country", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<City> cities = new ArrayList<>();
}