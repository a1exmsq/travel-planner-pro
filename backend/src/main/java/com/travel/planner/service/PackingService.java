package com.travel.planner.service;

import com.travel.planner.dto.CreatePackingItemRequestDTO;
import com.travel.planner.dto.PackingItemDTO;
import com.travel.planner.dto.UpdatePackingItemRequestDTO;
import com.travel.planner.entity.Route;
import com.travel.planner.entity.RoutePackingItem;
import com.travel.planner.entity.User;
import com.travel.planner.exception.ForbiddenException;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.RoutePackingItemRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class PackingService {

    private final RouteAccessService routeAccessService;
    private final RoutePackingItemRepository routePackingItemRepository;

    public List<PackingItemDTO> getPackingItems(Long routeId, User currentUser) {
        Route route = routeAccessService.findViewableRoute(routeId, currentUser);
        return routePackingItemRepository.findByRouteIdOrderByOrderIndexAscIdAsc(route.getId()).stream()
                .map(this::mapItem)
                .toList();
    }

    @Transactional
    public PackingItemDTO createItem(Long routeId, CreatePackingItemRequestDTO request, User currentUser) {
        Route route = routeAccessService.findEditableRoute(routeId, currentUser);
        RoutePackingItem item = new RoutePackingItem();
        item.setRoute(route);
        item.setOrderIndex(routePackingItemRepository.findByRouteIdOrderByOrderIndexAscIdAsc(routeId).size() + 1);
        applyPayload(
                item,
                request.getTitle(),
                request.getCategory(),
                request.getNotes(),
                request.getQuantity(),
                request.getPacked(),
                request.getRequiredFor()
        );
        return mapItem(routePackingItemRepository.save(item));
    }

    @Transactional
    public PackingItemDTO updateItem(Long itemId, UpdatePackingItemRequestDTO request, User currentUser) {
        RoutePackingItem item = routePackingItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Packing item not found"));
        routeAccessService.checkCanEdit(item.getRoute(), currentUser);
        applyPayload(
                item,
                request.getTitle() != null ? request.getTitle() : item.getTitle(),
                request.getCategory() != null ? request.getCategory() : item.getCategory(),
                request.getNotes() != null ? request.getNotes() : item.getNotes(),
                request.getQuantity() != null ? request.getQuantity() : item.getQuantity(),
                request.getPacked() != null ? request.getPacked() : item.getPacked(),
                request.getRequiredFor() != null ? request.getRequiredFor() : item.getRequiredFor()
        );
        if (request.getOrderIndex() != null) {
            item.setOrderIndex(Math.max(1, request.getOrderIndex()));
        }
        return mapItem(routePackingItemRepository.save(item));
    }

    @Transactional
    public void deleteItem(Long itemId, User currentUser) {
        RoutePackingItem item = routePackingItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Packing item not found"));
        routeAccessService.checkCanEdit(item.getRoute(), currentUser);
        Long routeId = item.getRoute().getId();
        routePackingItemRepository.delete(item);
        normalizeOrder(routeId);
    }

    @Transactional
    public List<PackingItemDTO> reorder(Long routeId, List<Long> orderedIds, User currentUser) {
        routeAccessService.findEditableRoute(routeId, currentUser);
        for (int index = 0; index < orderedIds.size(); index++) {
            RoutePackingItem item = routePackingItemRepository.findById(orderedIds.get(index))
                    .orElseThrow(() -> new ResourceNotFoundException("Packing item not found"));
            if (!item.getRoute().getId().equals(routeId)) {
                throw new ForbiddenException("Packing item does not belong to this route");
            }
            item.setOrderIndex(index + 1);
            routePackingItemRepository.save(item);
        }
        return getPackingItems(routeId, currentUser);
    }

    private void applyPayload(RoutePackingItem item, String title, String category, String notes,
                              Integer quantity, Boolean packed, String requiredFor) {
        item.setTitle(title);
        item.setCategory(normalizeCategory(category));
        item.setNotes(blankToNull(notes));
        item.setQuantity(quantity != null && quantity > 0 ? quantity : 1);
        item.setPacked(packed != null ? packed : Boolean.FALSE);
        item.setRequiredFor(blankToNull(requiredFor));
    }

    private String normalizeCategory(String raw) {
        String normalized = blankToNull(raw);
        if (normalized == null) {
            return "essentials";
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private PackingItemDTO mapItem(RoutePackingItem item) {
        PackingItemDTO dto = new PackingItemDTO();
        dto.setId(item.getId());
        dto.setTitle(item.getTitle());
        dto.setCategory(item.getCategory());
        dto.setNotes(item.getNotes());
        dto.setQuantity(item.getQuantity());
        dto.setPacked(item.getPacked());
        dto.setRequiredFor(item.getRequiredFor());
        dto.setOrderIndex(item.getOrderIndex());
        return dto;
    }

    private void normalizeOrder(Long routeId) {
        List<RoutePackingItem> items = routePackingItemRepository.findByRouteIdOrderByOrderIndexAscIdAsc(routeId);
        for (int index = 0; index < items.size(); index++) {
            RoutePackingItem item = items.get(index);
            item.setOrderIndex(index + 1);
            routePackingItemRepository.save(item);
        }
    }
}
