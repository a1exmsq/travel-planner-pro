package com.travel.planner.controller;

import com.travel.planner.dto.PoiCatalogResponseDTO;
import com.travel.planner.dto.PoiResponseDTO;
import com.travel.planner.entity.PointOfInterest;
import com.travel.planner.entity.User;
import com.travel.planner.repository.PointOfInterestRepository;
import com.travel.planner.repository.UserRepository;
import com.travel.planner.service.PoiService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pois")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class POIController {

    private final PointOfInterestRepository poiRepository;
    private final UserRepository userRepository;
    private final PoiService poiService;


    @PostMapping
    public ResponseEntity<PointOfInterest> createCustomPoi(
            @RequestBody PointOfInterest poi,
            @RequestParam Long userId) {

        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        PointOfInterest savedPoi = poiService.createUserPOI(poi, creator);
        return ResponseEntity.ok(savedPoi);
    }

    @GetMapping("/search")
    public List<PointOfInterest> search(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String city) {

        if (category != null && city != null) {
            return poiRepository.findByCategoryIgnoreCaseAndCityNameIgnoreCase(category, city);
        } else if (category != null) {
            return poiRepository.findByCategoryIgnoreCase(category);
        }
        return poiRepository.findAll();
    }

    @PostMapping("/auto")
    public ResponseEntity<PointOfInterest> createAuto(
            @RequestParam String name,
            @RequestParam String category,
            @RequestParam String cityName) {
        return ResponseEntity.ok(poiService.createPoiAutomatically(name, category, cityName));
    }

    @GetMapping
    public List<PointOfInterest> getAllPois() {
        return poiRepository.findAll();
    }

    @GetMapping("/discovery")
    public List<PointOfInterest> getDiscoveryPoints() {
        return poiRepository.findDiscoveryPoints(PageRequest.of(0, 15));
    }

    @GetMapping("/global")
    public ResponseEntity<List<PointOfInterest>> getAllGlobalPOIs() {
        return ResponseEntity.ok(poiService.getGlobalPOIs());
    }

    @GetMapping("/global/catalog")
    public ResponseEntity<PoiCatalogResponseDTO> getGlobalPOICatalog(
            @RequestParam(name = "cityId", required = false) Long cityId,
            @RequestParam(name = "countryId", required = false) Long countryId,
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "featuredOnly", defaultValue = "false") boolean featuredOnly,
            @RequestParam(name = "limit", defaultValue = "120") Integer limit
    ) {
        return ResponseEntity.ok(
                poiService.getGlobalCatalog(cityId, countryId, category, q, featuredOnly, limit)
        );
    }

    @GetMapping("/global/discover")
    public ResponseEntity<List<PointOfInterest>> getGlobalPOIsForMap(
            @RequestParam(name = "cityId", required = false) Long cityId,
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "q", required = false) String q
    ) {
        return ResponseEntity.ok(poiService.getGlobalPOIsForMap(cityId, category, q));
    }

    @GetMapping("/global/top")
    public ResponseEntity<List<PointOfInterest>> getTopGlobalPOIs() {
        return ResponseEntity.ok(poiService.getTopGlobalPOIs());
    }

    @GetMapping("/global/city/{cityId}")
    public ResponseEntity<List<PointOfInterest>> getGlobalPOIsByCity(@PathVariable Long cityId) {
        return ResponseEntity.ok(poiService.getGlobalPOIsByCity(cityId));
    }

    @GetMapping("/global/country/{countryId}")
    public ResponseEntity<List<PoiResponseDTO>> getGlobalPOIsByCountry(
            @PathVariable Long countryId,
            @RequestParam(name = "limit", defaultValue = "120") Integer limit
    ) {
        return ResponseEntity.ok(poiService.getGlobalPOIsByCountry(countryId, limit));
    }

    @GetMapping("/global/search")
    public ResponseEntity<List<PointOfInterest>> searchGlobalPOIs(@RequestParam String q) {
        return ResponseEntity.ok(poiService.searchGlobalPOIs(q));
    }

    @GetMapping("/global/nearby")
    public ResponseEntity<List<PointOfInterest>> getGlobalPOIsNearby(
            @RequestParam Double lat,
            @RequestParam Double lng,
            @RequestParam(defaultValue = "10") Double radius
    ) {
        return ResponseEntity.ok(poiService.getGlobalPOIsNearby(lat, lng, radius));
    }

    @GetMapping("/user/{userId}/private")
    public ResponseEntity<List<PointOfInterest>> getUserPrivatePOIs(
            @PathVariable Long userId,
            @RequestParam(name = "cityId", required = false) Long cityId,
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "limit", required = false) Integer limit
    ) {
        return ResponseEntity.ok(poiService.getUserPrivatePOIs(userId, cityId, category, q, limit));
    }

    @PostMapping("/increment-usage/{poiId}")
    public ResponseEntity<Void> incrementUsageCount(@PathVariable Long poiId) {
        poiService.incrementUsageCount(poiId);
        return ResponseEntity.ok().build();
    }
}
