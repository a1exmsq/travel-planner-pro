package com.travel.planner.repository;

import com.travel.planner.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    List<User> findTop8ByUsernameContainingIgnoreCaseOrderByUsernameAsc(String username);
}
