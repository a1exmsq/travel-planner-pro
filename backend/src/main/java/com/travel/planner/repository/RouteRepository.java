package com.travel.planner.repository;

import com.travel.planner.entity.Route;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface RouteRepository extends JpaRepository<Route, Long> {

    @Query("SELECT r FROM Route r WHERE r.isPublic = true ORDER BY r.id DESC")
    List<Route> findAllPublic();

    @Query("SELECT r FROM Route r WHERE r.isPublic = true ORDER BY r.id DESC")
    Page<Route> findAllPublic(Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true AND :tag member of r.vibeTags ORDER BY r.id DESC")
    Page<Route> findPublicByTag(@Param("tag") String tag, Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true ORDER BY r.likeCount DESC")
    Page<Route> findAllPublicOrderByLikes(Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true AND :tag member of r.vibeTags ORDER BY r.likeCount DESC")
    Page<Route> findPublicByTagOrderByLikes(@Param("tag") String tag, Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true ORDER BY r.id DESC")
    Page<Route> findLatest(Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true AND LOWER(r.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Route> findPublicByName(@Param("name") String name);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true AND LOWER(r.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<Route> findPublicByName(@Param("name") String name, Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true AND LOWER(r.name) LIKE LOWER(CONCAT('%', :name, '%')) AND :tag member of r.vibeTags")
    Page<Route> findPublicByNameAndTag(@Param("name") String name, @Param("tag") String tag, Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true AND r.user.username = :username")
    Page<Route> findPublicByUsername(@Param("username") String username, Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.user.id = :userId")
    List<Route> findByUserId(@Param("userId") Long userId);

    @Query("SELECT r FROM Route r WHERE r.user.id = :userId")
    Page<Route> findByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true AND r.primaryCountry.id = :countryId ORDER BY r.likeCount DESC")
    Page<Route> findPublicByPrimaryCountryIdOrderByLikeCountDesc(@Param("countryId") Long countryId, Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true AND r.primaryCity.id = :cityId ORDER BY r.likeCount DESC")
    Page<Route> findPublicByPrimaryCityIdOrderByLikeCountDesc(@Param("cityId") Long cityId, Pageable pageable);

    @Query("""
            SELECT r.forkedFromRoute.id, COUNT(r)
            FROM Route r
            WHERE r.forkedFromRoute.id IN :routeIds
            GROUP BY r.forkedFromRoute.id
            """)
    List<Object[]> countForksByOriginalRouteIds(@Param("routeIds") Collection<Long> routeIds);

    default java.util.Map<Long, Long> countForksByOriginalRouteIdsAsMap(Collection<Long> routeIds) {
        return countForksByOriginalRouteIds(routeIds).stream()
                .collect(java.util.stream.Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
    }

    @Query("""
            SELECT tag, COUNT(r)
            FROM Route r
            JOIN r.vibeTags tag
            WHERE r.isPublic = true
            GROUP BY tag
            ORDER BY COUNT(r) DESC, tag ASC
            """)
    List<Object[]> findTrendingVibeTags(Pageable pageable);

    @Query("""
            SELECT r FROM Route r
            LEFT JOIN FETCH r.routePois rp
            LEFT JOIN FETCH rp.poi p
            LEFT JOIN FETCH p.city c
            LEFT JOIN FETCH c.country
            WHERE r.id = :id
            """)
    Optional<Route> findByIdWithDetails(@Param("id") Long id);

    long countByUserId(Long userId);

    @Query("SELECT COUNT(DISTINCT r.primaryCountry.id) FROM Route r WHERE r.user.id = :userId AND r.primaryCountry IS NOT NULL")
    long countDistinctPrimaryCountryIdByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(DISTINCT r.primaryCity.id) FROM Route r WHERE r.user.id = :userId AND r.primaryCity IS NOT NULL")
    long countDistinctPrimaryCityIdByUserId(@Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(r.totalDistanceKm), 0.0) FROM Route r WHERE r.user.id = :userId")
    double sumTotalDistanceKmByUserId(@Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(r.likeCount), 0) FROM Route r WHERE r.user.id = :userId")
    int sumLikeCountByUserId(@Param("userId") Long userId);

    long countByPrimaryCountryId(Long countryId);

    long countByPrimaryCityId(Long cityId);

    long countByForkedFromRouteId(Long routeId);

    @Modifying
    @Transactional
    @Query("UPDATE Route r SET r.likeCount = r.likeCount + 1 WHERE r.id = :routeId")
    void incrementLikeCount(@Param("routeId") Long routeId);

    @Modifying
    @Transactional
    @Query("UPDATE Route r SET r.likeCount = GREATEST(r.likeCount - 1, 0) WHERE r.id = :routeId")
    void decrementLikeCount(@Param("routeId") Long routeId);

    @Modifying
    @Transactional
    @Query("UPDATE Route r SET r.isPublic = :status WHERE r.id = :routeId")
    void updatePublicStatus(@Param("routeId") Long routeId, @Param("status") boolean status);
}
