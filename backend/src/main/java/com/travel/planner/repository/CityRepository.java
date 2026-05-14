package com.travel.planner.repository;

import com.travel.planner.entity.City;
import com.travel.planner.entity.Country;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CityRepository extends JpaRepository<City, Long> {

    Optional<City> findByNameIgnoreCase(String name);

    Optional<City> findFirstByNameIgnoreCase(String name);

    List<City> findByCountryOrderByRoutesCountDesc(Country country);

    List<City> findByCountryIdOrderByRoutesCountDesc(Long countryId);

    List<City> findTop20ByOrderByRoutesCountDesc();

    @Query("SELECT c FROM City c ORDER BY (c.routesCount * 3 + c.poiCount) DESC, c.id ASC")
    List<City> findTop20OrderByScore();

    List<City> findTop10ByNameContainingIgnoreCaseOrderByRoutesCountDesc(String query);

    @Query("SELECT c FROM City c WHERE " +
            "c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND " +
            "(6371 * acos(cos(radians(:lat)) * cos(radians(c.latitude)) * " +
            "cos(radians(c.longitude) - radians(:lng)) + sin(radians(:lat)) * " +
            "sin(radians(c.latitude)))) < :radiusKm")
    List<City> findCitiesWithinRadius(
            @Param("lat") Double latitude,
            @Param("lng") Double longitude,
            @Param("radiusKm") Double radiusKm
    );
}