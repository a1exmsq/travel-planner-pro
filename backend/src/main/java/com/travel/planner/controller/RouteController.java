package com.travel.planner.controller;

import com.travel.planner.dto.AddPoiToRouteRequestDTO;
import com.travel.planner.dto.CollaboratorDTO;
import com.travel.planner.dto.CommentResponseDTO;
import com.travel.planner.dto.CreateRouteDayRequestDTO;
import com.travel.planner.dto.CreateRouteRequestDTO;
import com.travel.planner.dto.InvitationDTO;
import com.travel.planner.dto.InviteCollaboratorRequestDTO;
import com.travel.planner.dto.PoiResponseDTO;
import com.travel.planner.dto.ReorderRequestDTO;
import com.travel.planner.dto.RouteDayDTO;
import com.travel.planner.dto.RoutePlanDTO;
import com.travel.planner.dto.RouteResponseDTO;
import com.travel.planner.dto.UpdateRouteRequestDTO;
import com.travel.planner.dto.UpdateStopRequestDTO;
import com.travel.planner.entity.PointOfInterest;
import com.travel.planner.entity.User;
import com.travel.planner.service.CollaborationService;
import com.travel.planner.service.CommentService;
import com.travel.planner.service.ItineraryService;
import com.travel.planner.service.LikeService;
import com.travel.planner.service.PoiService;
import com.travel.planner.service.RouteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;
    private final LikeService likeService;
    private final CommentService commentService;
    private final PoiService poiService;
    private final CollaborationService collaborationService;
    private final ItineraryService itineraryService;

    @PostMapping
    public ResponseEntity<RouteResponseDTO> createRoute(
            @Valid @RequestBody CreateRouteRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(routeService.createRoute(request, currentUser));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<RouteResponseDTO> updateRoute(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRouteRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(routeService.updateRoute(id, request, currentUser));
    }

    @GetMapping
    public List<RouteResponseDTO> getAllRoutes(
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return routeService.getAllPublicRoutes(tag, page, size);
    }

    @GetMapping("/{id}")
    public RouteResponseDTO getRoute(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return routeService.getRouteById(id, currentUser);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoute(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        routeService.deleteRoute(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{routeId}/poi")
    public ResponseEntity<RouteResponseDTO> addPoiToRoute(
            @PathVariable Long routeId,
            @RequestBody AddPoiToRouteRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(routeService.addPoiToRoute(routeId, request, currentUser));
    }

    @DeleteMapping("/poi-link/{id}")
    public ResponseEntity<Void> removePoi(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        routeService.removePoiFromRoute(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/poi-link/{id}")
    public ResponseEntity<PoiResponseDTO> updateStop(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStopRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(routeService.updateStopTime(id, request.getTravelTimeMinutes(), currentUser));
    }

    @PatchMapping("/{routeId}/reorder")
    public ResponseEntity<Void> reorder(
            @PathVariable Long routeId,
            @Valid @RequestBody ReorderRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        routeService.reorderStops(routeId, request.getOrderedRoutePoiIds(), currentUser);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{routeId}/optimize")
    public ResponseEntity<RouteResponseDTO> optimize(
            @PathVariable Long routeId,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(routeService.optimizeRoute(routeId, currentUser));
    }

    @GetMapping("/{id}/full-plan")
    public RoutePlanDTO getPlan(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return routeService.getFullRoutePlan(id, currentUser);
    }

    @GetMapping("/{id}/difficulty")
    public ResponseEntity<String> getDifficulty(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(routeService.getRouteDifficulty(id, currentUser));
    }

    @PatchMapping("/{routeId}/public")
    public ResponseEntity<Void> togglePublic(
            @PathVariable Long routeId,
            @RequestParam boolean status,
            @AuthenticationPrincipal User currentUser
    ) {
        routeService.togglePublic(routeId, status, currentUser);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{routeId}/copy")
    public RouteResponseDTO copy(
            @PathVariable Long routeId,
            @AuthenticationPrincipal User currentUser
    ) {
        return routeService.copyRoute(routeId, currentUser);
    }

    @PostMapping("/{routeId}/like")
    public ResponseEntity<Void> like(
            @PathVariable Long routeId,
            @AuthenticationPrincipal User currentUser
    ) {
        likeService.like(currentUser.getId(), routeId, currentUser);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{routeId}/like")
    public ResponseEntity<Void> unlike(
            @PathVariable Long routeId,
            @AuthenticationPrincipal User currentUser
    ) {
        likeService.unlike(currentUser.getId(), routeId, currentUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{routeId}/like")
    public ResponseEntity<Map<String, Boolean>> isLiked(
            @PathVariable Long routeId,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null) return ResponseEntity.ok(Map.of("liked", false));
        boolean liked = likeService.isLikedByUser(currentUser.getId(), routeId, currentUser);
        return ResponseEntity.ok(Map.of("liked", liked));
    }

    @PostMapping(value = "/{routeId}/comment", consumes = "text/plain")
    public ResponseEntity<Void> addComment(
            @PathVariable Long routeId,
            @RequestBody String text,
            @AuthenticationPrincipal User currentUser
    ) {
        commentService.addComment(routeId, currentUser.getId(), text, currentUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{routeId}/comments")
    public List<CommentResponseDTO> getComments(
            @PathVariable Long routeId,
            @AuthenticationPrincipal User currentUser
    ) {
        return commentService.getComments(routeId, currentUser);
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal User currentUser
    ) {
        commentService.deleteComment(commentId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/invite")
    public ResponseEntity<InvitationDTO> invite(
            @PathVariable Long id,
            @Valid @RequestBody InviteCollaboratorRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(collaborationService.inviteUserToRoute(id, request.getUsername(), request.getRole(), currentUser));
    }

    @GetMapping("/{id}/collaborators")
    public List<CollaboratorDTO> getCollaborators(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return collaborationService.getCollaborators(id, currentUser);
    }

    @DeleteMapping("/{id}/collaborators/{userId}")
    public ResponseEntity<Void> removeCollaborator(
            @PathVariable Long id,
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser
    ) {
        collaborationService.removeCollaborator(id, userId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/itinerary")
    public List<RouteDayDTO> getItinerary(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return itineraryService.getItinerary(id, currentUser);
    }

    @PostMapping("/{id}/days")
    public RouteDayDTO createDay(
            @PathVariable Long id,
            @RequestBody CreateRouteDayRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return itineraryService.createDay(id, request, currentUser);
    }

    @PostMapping("/{id}/auto-plan")
    public List<RouteDayDTO> autoPlan(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return itineraryService.autoPlan(id, currentUser);
    }

    @GetMapping("/search")
    public List<RouteResponseDTO> search(
            @RequestParam String name,
            @RequestParam(required = false) String tag
    ) {
        return routeService.searchByName(name, tag);
    }

    @GetMapping("/user/{username}")
    public List<RouteResponseDTO> getByUser(@PathVariable String username) {
        return routeService.getPublicRoutesByUsername(username);
    }

    @GetMapping("/trending")
    public List<RouteResponseDTO> getTrending(
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return routeService.getTrendingRoutes(tag, page, size);
    }

    @GetMapping("/my")
    public List<RouteResponseDTO> getMyRoutes(@AuthenticationPrincipal User currentUser) {
        return routeService.getRoutesByUserId(currentUser.getId());
    }

    @GetMapping("/popular")
    public List<RouteResponseDTO> getPopular(
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return routeService.getPopularRoutes(tag, page, size);
    }

    @GetMapping("/tags")
    public List<String> getRouteTags() {
        return routeService.getAvailableVibeTags();
    }

    @GetMapping("/poi/search")
    public List<PointOfInterest> searchPoi(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String category
    ) {
        return poiService.searchPoi(name, category);
    }
}
