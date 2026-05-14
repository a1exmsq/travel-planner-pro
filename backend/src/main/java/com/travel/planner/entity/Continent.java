package com.travel.planner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "continents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Continent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, unique = true, length = 2)
    private String code; // EU, AS, AF, NA, SA, OC

    @Column(length = 2000)
    private String description;

    private String imageUrl;

    private String emoji;

    @Column(name = "countries_count")
    private Integer countriesCount = 0;

    @Column(name = "routes_count")
    private Integer routesCount = 0;

    @OneToMany(mappedBy = "continent", cascade = CascadeType.ALL)
    private List<Country> countries = new ArrayList<>();
}