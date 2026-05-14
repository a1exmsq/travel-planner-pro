package com.travel.planner.repository;

import com.travel.planner.entity.Continent;
import com.travel.planner.entity.Country;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CountryRepository extends JpaRepository<Country, Long> {

    Optional<Country> findByCode(String code);

    Optional<Country> findByName(String name);

    List<Country> findByContinentOrderByRoutesCountDesc(Continent continent);

    List<Country> findByContinentIdOrderByRoutesCountDesc(Long continentId);

    List<Country> findTop10ByOrderByRoutesCountDesc();
}