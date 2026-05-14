package com.travel.planner.repository;

import com.travel.planner.entity.Route;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RouteRepository extends JpaRepository<Route, Long> {

    @Query("SELECT r FROM Route r WHERE r.isPublic = true ORDER BY r.id DESC")
    List<Route> findAllPublic();

    @Query("SELECT r FROM Route r WHERE r.isPublic = true ORDER BY r.id DESC")
    List<Route> findAllPublic(Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true ORDER BY r.likeCount DESC")
    List<Route> findAllPublicOrderByLikes();

    @Query("SELECT r FROM Route r WHERE r.isPublic = true ORDER BY r.likeCount DESC")
    List<Route> findAllPublicOrderByLikes(Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true ORDER BY r.id DESC")
    List<Route> findLatest(Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true AND LOWER(r.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Route> findPublicByName(@Param("name") String name);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true AND r.user.username = :username")
    List<Route> findPublicByUsername(@Param("username") String username);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true ORDER BY r.likeCount DESC")
    List<Route> findTopPublicByLikes(Pageable pageable);

    @Query("SELECT r FROM Route r WHERE r.user.id = :userId")
    List<Route> findByUserId(@Param("userId") Long userId);

    long countByUserId(Long userId);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true AND r.primaryCountry.id = :countryId ORDER BY r.likeCount DESC")
    List<Route> findPublicByPrimaryCountryIdOrderByLikeCountDesc(@Param("countryId") Long countryId);

    @Query("SELECT r FROM Route r WHERE r.isPublic = true AND r.primaryCity.id = :cityId ORDER BY r.likeCount DESC")
    List<Route> findPublicByPrimaryCityIdOrderByLikeCountDesc(@Param("cityId") Long cityId);

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
