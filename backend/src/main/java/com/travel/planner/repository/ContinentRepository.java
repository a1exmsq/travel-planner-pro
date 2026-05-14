package com.travel.planner.repository;

import com.travel.planner.entity.Continent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContinentRepository extends JpaRepository<Continent, Long> {

    Optional<Continent> findByCode(String code);

    Optional<Continent> findByName(String name);

    @Query("SELECT c FROM Continent c ORDER BY COALESCE(c.routesCount, 0) DESC")
    List<Continent> findAllByOrderByRoutesCountDesc();
}