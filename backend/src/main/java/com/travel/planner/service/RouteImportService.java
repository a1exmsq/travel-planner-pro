package com.travel.planner.service;

import com.travel.planner.dto.RouteImportPreviewDTO;
import com.travel.planner.service.provider.PlaceImportProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RouteImportService {

    private final PlaceImportProvider placeImportProvider;

    public RouteImportPreviewDTO previewGoogleMapsImport(String rawUrl) {
        return placeImportProvider.previewImport(rawUrl);
    }
}
