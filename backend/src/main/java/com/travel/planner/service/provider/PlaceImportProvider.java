package com.travel.planner.service.provider;

import com.travel.planner.dto.RouteImportPreviewDTO;

public interface PlaceImportProvider {
    default String providerName() {
        return "stub";
    }

    default RouteImportPreviewDTO previewImport(String rawUrl) {
        throw new UnsupportedOperationException("Google Maps import is prepared for Phase 2 and is not enabled yet");
    }
}
