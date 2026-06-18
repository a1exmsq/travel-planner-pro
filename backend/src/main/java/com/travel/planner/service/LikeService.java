package com.travel.planner.service;

import com.travel.planner.entity.Like;
import com.travel.planner.entity.Route;
import com.travel.planner.entity.User;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.LikeRepository;
import com.travel.planner.repository.RouteRepository;
import com.travel.planner.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class LikeService {

    private final LikeRepository likeRepository;
    private final RouteRepository routeRepository;
    private final UserRepository userRepository;
    private final RouteAccessService routeAccessService;
    private final GamificationService gamificationService;

    @Transactional(readOnly = true)
    public boolean isLikedByUser(Long userId, Long routeId, User currentUser) {
        routeAccessService.findViewableRoute(routeId, currentUser);
        return likeRepository.existsByUser_IdAndRoute_Id(userId, routeId);
    }

    @Transactional
    public void like(Long userId, Long routeId, User currentUser) {
        Route route = routeAccessService.findViewableRoute(routeId, currentUser);
        if (likeRepository.existsByUser_IdAndRoute_Id(userId, routeId)) {
            return;
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Like like = new Like();
        like.setUser(user);
        like.setRoute(route);
        try {
            likeRepository.save(like);
            routeRepository.incrementLikeCount(routeId);
            gamificationService.checkAndUnlockAchievements(route.getUser().getId());
        } catch (DataIntegrityViolationException e) {
            log.debug("Like already exists for user={} route={}", userId, routeId);
        }
    }

    @Transactional
    public void unlike(Long userId, Long routeId, User currentUser) {
        routeAccessService.findViewableRoute(routeId, currentUser);
        likeRepository.findByUser_IdAndRoute_Id(userId, routeId).ifPresent(like -> {
            likeRepository.delete(like);
            routeRepository.decrementLikeCount(routeId);
        });
    }
}
