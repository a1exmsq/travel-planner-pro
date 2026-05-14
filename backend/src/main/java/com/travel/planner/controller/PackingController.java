package com.travel.planner.controller;

import com.travel.planner.dto.CreatePackingItemRequestDTO;
import com.travel.planner.dto.PackingItemDTO;
import com.travel.planner.dto.ReorderItemsRequestDTO;
import com.travel.planner.dto.UpdatePackingItemRequestDTO;
import com.travel.planner.entity.User;
import com.travel.planner.service.PackingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PackingController {

    private final PackingService packingService;

    @GetMapping("/routes/{id}/packing")
    public List<PackingItemDTO> getPackingItems(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return packingService.getPackingItems(id, currentUser);
    }

    @PostMapping("/routes/{id}/packing")
    public PackingItemDTO createPackingItem(
            @PathVariable Long id,
            @Valid @RequestBody CreatePackingItemRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return packingService.createItem(id, request, currentUser);
    }

    @PatchMapping("/packing/{id}")
    public PackingItemDTO updatePackingItem(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePackingItemRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return packingService.updateItem(id, request, currentUser);
    }

    @DeleteMapping("/packing/{id}")
    public ResponseEntity<Void> deletePackingItem(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        packingService.deleteItem(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/routes/{id}/packing/reorder")
    public List<PackingItemDTO> reorderPacking(
            @PathVariable Long id,
            @Valid @RequestBody ReorderItemsRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return packingService.reorder(id, request.getOrderedIds(), currentUser);
    }
}
