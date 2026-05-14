package com.travel.planner.controller;

import com.travel.planner.dto.GoogleMapsImportRequestDTO;
import com.travel.planner.dto.RouteImportPreviewDTO;
import com.travel.planner.service.RouteImportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/routes/import")
@RequiredArgsConstructor
public class RouteImportController {

    private final RouteImportService routeImportService;

    @PostMapping("/google-maps/preview")
    public RouteImportPreviewDTO preview(
            @Valid @RequestBody GoogleMapsImportRequestDTO request
    ) {
        return routeImportService.previewGoogleMapsImport(request.getUrl());
    }
}
