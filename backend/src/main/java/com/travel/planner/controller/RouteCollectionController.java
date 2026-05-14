package com.travel.planner.controller;

import com.travel.planner.dto.CreateRouteCollectionRequestDTO;
import com.travel.planner.dto.RouteCollectionDTO;
import com.travel.planner.entity.User;
import com.travel.planner.service.RouteCollectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/collections")
@RequiredArgsConstructor
public class RouteCollectionController {

    private final RouteCollectionService routeCollectionService;

    @GetMapping("/my")
    public List<RouteCollectionDTO> getMyCollections(@AuthenticationPrincipal User currentUser) {
        return routeCollectionService.getMyCollections(currentUser);
    }

    @PostMapping
    public ResponseEntity<RouteCollectionDTO> createCollection(
            @Valid @RequestBody CreateRouteCollectionRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(routeCollectionService.createCollection(request, currentUser));
    }

    @PostMapping("/{collectionId}/routes/{routeId}")
    public ResponseEntity<RouteCollectionDTO> addRoute(
            @PathVariable Long collectionId,
            @PathVariable Long routeId,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(routeCollectionService.addRoute(collectionId, routeId, currentUser));
    }

    @DeleteMapping("/{collectionId}/routes/{routeId}")
    public ResponseEntity<RouteCollectionDTO> removeRoute(
            @PathVariable Long collectionId,
            @PathVariable Long routeId,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(routeCollectionService.removeRoute(collectionId, routeId, currentUser));
    }

    @DeleteMapping("/{collectionId}")
    public ResponseEntity<Void> deleteCollection(
            @PathVariable Long collectionId,
            @AuthenticationPrincipal User currentUser
    ) {
        routeCollectionService.deleteCollection(collectionId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
