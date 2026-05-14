package com.travel.planner.repository;

import com.travel.planner.entity.City;
import com.travel.planner.entity.PointOfInterest;
import com.travel.planner.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PointOfInterestRepository extends JpaRepository<PointOfInterest, Long> {

    List<PointOfInterest> findByCategoryIgnoreCase(String category);

    List<PointOfInterest> findByCategoryIgnoreCaseAndCityNameIgnoreCase(String category, String cityName);

    List<PointOfInterest> findByNameContainingIgnoreCaseOrCategoryContainingIgnoreCase(String name, String category);

    boolean existsByExternalSourceId(String externalSourceId);

    long countByCityIdAndIsGlobalTrue(Long cityId);

    @Query(value = "SELECT * FROM pois ORDER BY " +
            "CASE WHEN category = 'Secret Place' THEN 1 ELSE 2 END, RANDOM()",
            nativeQuery = true)
    List<PointOfInterest> findDiscoveryPoints(Pageable pageable);

    List<PointOfInterest> findByIsGlobalTrueOrderByUsageCountDesc();


    List<PointOfInterest> findByCityAndIsGlobalTrueOrderByUsageCountDesc(City city);

    List<PointOfInterest> findByCityIdAndIsGlobalTrueOrderByUsageCountDesc(Long cityId);


    List<PointOfInterest> findByUserAndIsGlobalFalse(User user);

    List<PointOfInterest> findByUserIdAndIsGlobalFalse(Long userId);

    @Query("""
            SELECT p
            FROM PointOfInterest p
            WHERE p.isGlobal = false
              AND p.user IS NOT NULL
              AND p.user.id = :userId
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (:category IS NULL OR LOWER(COALESCE(p.category, '')) = LOWER(:category))
              AND (
                    :query IS NULL
                    OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.address, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                  )
            ORDER BY p.editorialScore DESC,
                     p.qualityScore DESC,
                     p.usageCount DESC,
                     p.name ASC
            """)
    List<PointOfInterest> findPrivatePOIsForMap(
            @Param("userId") Long userId,
            @Param("cityId") Long cityId,
            @Param("category") String category,
            @Param("query") String query,
            Pageable pageable
    );

    long countByUserId(Long userId);

    long countByUserIdAndIsGlobalFalse(Long userId);


    List<PointOfInterest> findByIsGlobalTrueAndNameContainingIgnoreCaseOrderByUsageCountDesc(String query);

    List<PointOfInterest> findTop50ByIsGlobalTrueOrderByUsageCountDesc();

    List<PointOfInterest> findByIsGlobalTrueAndCategoryAndCityIdOrderByUsageCountDesc(
            String category, Long cityId
    );

    @Query("""
            SELECT p
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (
                    :countryId IS NULL
                    OR (p.city IS NOT NULL AND p.city.country IS NOT NULL AND p.city.country.id = :countryId)
                  )
              AND (:featuredOnly = false OR p.featured = true)
              AND (:category IS NULL OR LOWER(p.category) = LOWER(:category))
              AND (
                    :query IS NULL
                    OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.address, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                  )
            ORDER BY p.featured DESC,
                     p.editorialScore DESC,
                     p.qualityScore DESC,
                     p.usageCount DESC,
                     p.rating DESC,
                     p.name ASC
            """)
    List<PointOfInterest> findGlobalPOIsCatalog(
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId,
            @Param("category") String category,
            @Param("query") String query,
            @Param("featuredOnly") boolean featuredOnly,
            Pageable pageable
    );

    @Query("""
            SELECT p
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (
                    :countryId IS NULL
                    OR (p.city IS NOT NULL AND p.city.country IS NOT NULL AND p.city.country.id = :countryId)
                  )
              AND (:featuredOnly = false OR p.featured = true)
            ORDER BY p.featured DESC,
                     p.editorialScore DESC,
                     p.qualityScore DESC,
                     p.usageCount DESC,
                     p.rating DESC,
                     p.name ASC
            """)
    List<PointOfInterest> findGlobalPOIsCatalogBase(
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId,
            @Param("featuredOnly") boolean featuredOnly,
            Pageable pageable
    );

    @Query("""
            SELECT p
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (
                    :countryId IS NULL
                    OR (p.city IS NOT NULL AND p.city.country IS NOT NULL AND p.city.country.id = :countryId)
                  )
              AND (:featuredOnly = false OR p.featured = true)
              AND LOWER(p.category) = LOWER(:category)
            ORDER BY p.featured DESC,
                     p.editorialScore DESC,
                     p.qualityScore DESC,
                     p.usageCount DESC,
                     p.rating DESC,
                     p.name ASC
            """)
    List<PointOfInterest> findGlobalPOIsCatalogByCategory(
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId,
            @Param("category") String category,
            @Param("featuredOnly") boolean featuredOnly,
            Pageable pageable
    );

    @Query("""
            SELECT p
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (
                    :countryId IS NULL
                    OR (p.city IS NOT NULL AND p.city.country IS NOT NULL AND p.city.country.id = :countryId)
                  )
              AND (:featuredOnly = false OR p.featured = true)
              AND (
                    LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.address, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                  )
            ORDER BY p.featured DESC,
                     p.editorialScore DESC,
                     p.qualityScore DESC,
                     p.usageCount DESC,
                     p.rating DESC,
                     p.name ASC
            """)
    List<PointOfInterest> findGlobalPOIsCatalogByQuery(
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId,
            @Param("query") String query,
            @Param("featuredOnly") boolean featuredOnly,
            Pageable pageable
    );

    @Query("""
            SELECT p
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (
                    :countryId IS NULL
                    OR (p.city IS NOT NULL AND p.city.country IS NOT NULL AND p.city.country.id = :countryId)
                  )
              AND (:featuredOnly = false OR p.featured = true)
              AND LOWER(p.category) = LOWER(:category)
              AND (
                    LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.address, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                  )
            ORDER BY p.featured DESC,
                     p.editorialScore DESC,
                     p.qualityScore DESC,
                     p.usageCount DESC,
                     p.rating DESC,
                     p.name ASC
            """)
    List<PointOfInterest> findGlobalPOIsCatalogByCategoryAndQuery(
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId,
            @Param("category") String category,
            @Param("query") String query,
            @Param("featuredOnly") boolean featuredOnly,
            Pageable pageable
    );

    @Query("""
            SELECT COUNT(p)
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (
                    :countryId IS NULL
                    OR (p.city IS NOT NULL AND p.city.country IS NOT NULL AND p.city.country.id = :countryId)
                  )
              AND (:featuredOnly = false OR p.featured = true)
              AND (:category IS NULL OR LOWER(p.category) = LOWER(:category))
              AND (
                    :query IS NULL
                    OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.address, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                  )
            """)
    long countGlobalPOIsCatalog(
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId,
            @Param("category") String category,
            @Param("query") String query,
            @Param("featuredOnly") boolean featuredOnly
    );

    @Query("""
            SELECT COUNT(p)
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (
                    :countryId IS NULL
                    OR (p.city IS NOT NULL AND p.city.country IS NOT NULL AND p.city.country.id = :countryId)
                  )
              AND (:featuredOnly = false OR p.featured = true)
            """)
    long countGlobalPOIsCatalogBase(
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId,
            @Param("featuredOnly") boolean featuredOnly
    );

    @Query("""
            SELECT COUNT(p)
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (
                    :countryId IS NULL
                    OR (p.city IS NOT NULL AND p.city.country IS NOT NULL AND p.city.country.id = :countryId)
                  )
              AND (:featuredOnly = false OR p.featured = true)
              AND LOWER(p.category) = LOWER(:category)
            """)
    long countGlobalPOIsCatalogByCategory(
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId,
            @Param("category") String category,
            @Param("featuredOnly") boolean featuredOnly
    );

    @Query("""
            SELECT COUNT(p)
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (
                    :countryId IS NULL
                    OR (p.city IS NOT NULL AND p.city.country IS NOT NULL AND p.city.country.id = :countryId)
                  )
              AND (:featuredOnly = false OR p.featured = true)
              AND (
                    LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.address, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                  )
            """)
    long countGlobalPOIsCatalogByQuery(
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId,
            @Param("query") String query,
            @Param("featuredOnly") boolean featuredOnly
    );

    @Query("""
            SELECT COUNT(p)
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (
                    :countryId IS NULL
                    OR (p.city IS NOT NULL AND p.city.country IS NOT NULL AND p.city.country.id = :countryId)
                  )
              AND (:featuredOnly = false OR p.featured = true)
              AND LOWER(p.category) = LOWER(:category)
              AND (
                    LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.address, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                  )
            """)
    long countGlobalPOIsCatalogByCategoryAndQuery(
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId,
            @Param("category") String category,
            @Param("query") String query,
            @Param("featuredOnly") boolean featuredOnly
    );

    @Query("""
            SELECT COUNT(p)
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND p.featured = true
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (
                    :countryId IS NULL
                    OR (p.city IS NOT NULL AND p.city.country IS NOT NULL AND p.city.country.id = :countryId)
                  )
            """)
    long countFeaturedGlobalPOIsCatalog(
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId
    );

    @Query("""
            SELECT p.category, COUNT(p)
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (
                    :countryId IS NULL
                    OR (p.city IS NOT NULL AND p.city.country IS NOT NULL AND p.city.country.id = :countryId)
                  )
            GROUP BY p.category
            ORDER BY COUNT(p) DESC, p.category ASC
            """)
    List<Object[]> countGlobalPOICategories(
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId
    );

    @Query("""
            SELECT p
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND p.city IS NOT NULL
              AND p.city.country IS NOT NULL
              AND p.city.country.id = :countryId
            ORDER BY p.featured DESC,
                     p.editorialScore DESC,
                     p.qualityScore DESC,
                     p.usageCount DESC,
                     p.rating DESC,
                     p.name ASC
            """)
    List<PointOfInterest> findGlobalPOIsByCountryId(
            @Param("countryId") Long countryId,
            Pageable pageable
    );

    @Query("""
            SELECT p
            FROM PointOfInterest p
            WHERE p.isGlobal = true
              AND (:cityId IS NULL OR (p.city IS NOT NULL AND p.city.id = :cityId))
              AND (:category IS NULL OR LOWER(p.category) = LOWER(:category))
              AND (
                    :query IS NULL
                    OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(COALESCE(p.address, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                  )
            ORDER BY p.usageCount DESC, p.name ASC
            """)
    List<PointOfInterest> findGlobalPOIsForMap(
            @Param("cityId") Long cityId,
            @Param("category") String category,
            @Param("query") String query
    );

    @Query("SELECT p FROM PointOfInterest p WHERE " +
            "p.isGlobal = true AND " +
            "p.latitude IS NOT NULL AND p.longitude IS NOT NULL AND " +
            "(6371 * acos(cos(radians(:lat)) * cos(radians(p.latitude)) * " +
            "cos(radians(p.longitude) - radians(:lng)) + sin(radians(:lat)) * " +
            "sin(radians(p.latitude)))) < :radiusKm")
    List<PointOfInterest> findGlobalPOIsWithinRadius(
            @Param("lat") Double latitude,
            @Param("lng") Double longitude,
            @Param("radiusKm") Double radiusKm
    );
}
