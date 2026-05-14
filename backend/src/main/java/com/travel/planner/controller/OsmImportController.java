package com.travel.planner.controller;

import com.travel.planner.dto.OsmImportResultDTO;
import com.travel.planner.service.OsmImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/osm")
@RequiredArgsConstructor
public class OsmImportController {

    private final OsmImportService osmImportService;

    @PostMapping("/import/city/{cityId}")
    public ResponseEntity<OsmImportResultDTO> importCity(@PathVariable Long cityId) {
        return ResponseEntity.ok(osmImportService.importForCity(cityId));
    }
}
