package com.travel.planner.service;

import com.travel.planner.config.AppConstants;
import com.travel.planner.dto.CreateRouteCollectionRequestDTO;
import com.travel.planner.dto.RouteCollectionDTO;
import com.travel.planner.entity.Route;
import com.travel.planner.entity.RouteCollection;
import com.travel.planner.entity.RouteCollectionItem;
import com.travel.planner.entity.User;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.RouteCollectionItemRepository;
import com.travel.planner.repository.RouteCollectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RouteCollectionService {

    private final RouteCollectionRepository routeCollectionRepository;
    private final RouteCollectionItemRepository routeCollectionItemRepository;
    private final RouteService routeService;

    @Transactional(readOnly = true)
    public List<RouteCollectionDTO> getMyCollections(User currentUser) {
        return routeCollectionRepository.findByUserIdOrderByIdDesc(currentUser.getId()).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<RouteCollectionDTO> getMyCollections(User currentUser, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, AppConstants.MAX_PAGE_SIZE));
        return routeCollectionRepository.findByUserIdOrderByIdDesc(currentUser.getId(), pageable)
                .map(this::toDTO);
    }

    @Transactional
    public RouteCollectionDTO createCollection(CreateRouteCollectionRequestDTO request, User currentUser) {
        RouteCollection collection = new RouteCollection();
        collection.setUser(currentUser);
        collection.setName(request.getName().trim());
        collection.setDescription(request.getDescription() != null && !request.getDescription().isBlank()
                ? request.getDescription().trim()
                : null);
        return toDTO(routeCollectionRepository.save(collection));
    }

    @Transactional
    public RouteCollectionDTO addRoute(Long collectionId, Long routeId, User currentUser) {
        RouteCollection collection = findOwnedCollection(collectionId, currentUser);
        Route route = routeService.findViewableRouteEntity(routeId, currentUser);

        if (!routeCollectionItemRepository.existsByCollectionIdAndRouteId(collectionId, routeId)) {
            RouteCollectionItem item = new RouteCollectionItem();
            item.setCollection(collection);
            item.setRoute(route);
            routeCollectionItemRepository.save(item);
        }

        return toDTO(routeCollectionRepository.findById(collectionId).orElseThrow(() ->
                new ResourceNotFoundException("Collection not found")));
    }

    @Transactional
    public RouteCollectionDTO removeRoute(Long collectionId, Long routeId, User currentUser) {
        RouteCollection collection = findOwnedCollection(collectionId, currentUser);
        routeCollectionItemRepository.deleteByCollectionIdAndRouteId(collection.getId(), routeId);
        return toDTO(routeCollectionRepository.findById(collectionId).orElseThrow(() ->
                new ResourceNotFoundException("Collection not found")));
    }

    @Transactional
    public void deleteCollection(Long collectionId, User currentUser) {
        RouteCollection collection = findOwnedCollection(collectionId, currentUser);
        routeCollectionRepository.delete(collection);
    }

    private RouteCollection findOwnedCollection(Long collectionId, User currentUser) {
        return routeCollectionRepository.findByIdAndUserId(collectionId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found"));
    }

    private RouteCollectionDTO toDTO(RouteCollection collection) {
        RouteCollectionDTO dto = new RouteCollectionDTO();
        dto.setId(collection.getId());
        dto.setName(collection.getName());
        dto.setDescription(collection.getDescription());

        List<RouteCollectionItem> items = collection.getItems();
        dto.setRoutes(items.stream()
                .map(RouteCollectionItem::getRoute)
                .map(routeService::convertToDTO)
                .toList());
        dto.setRoutesCount(items.size());
        return dto;
    }
}
