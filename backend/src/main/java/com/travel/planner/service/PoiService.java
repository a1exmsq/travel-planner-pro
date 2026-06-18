package com.travel.planner.service;

import com.travel.planner.config.PoiConstants;
import com.travel.planner.dto.PoiCatalogResponseDTO;
import com.travel.planner.dto.PoiCategoryCountDTO;
import com.travel.planner.dto.PoiResponseDTO;
import com.travel.planner.entity.City;
import com.travel.planner.entity.PointOfInterest;
import com.travel.planner.entity.User;
import com.travel.planner.repository.CityRepository;
import com.travel.planner.repository.PointOfInterestRepository;
import com.travel.planner.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PoiService {
    private final PointOfInterestRepository poiRepository;
    private final CityRepository cityRepository;
    private final GeocodingService geocodingService;
    private final UserRepository userRepository;

    @Transactional
    public PointOfInterest createPoiAutomatically(String name, String category, String cityName) {
        City city = cityRepository.findByNameIgnoreCase(cityName)
                .orElseGet(() -> {
                    City newCity = new City();
                    newCity.setName(cityName);
                    double[] cityCoords = geocodingService.getCoordinates(cityName);
                    newCity.setLatitude(cityCoords[0]);
                    newCity.setLongitude(cityCoords[1]);
                    return cityRepository.save(newCity);
                });

        double[] coords = geocodingService.getCoordinates(name + ", " + cityName);

        PointOfInterest poi = new PointOfInterest();
        poi.setName(name);
        poi.setCategory(category);
        poi.setCity(city);
        poi.setLatitude(coords[0]);
        poi.setLongitude(coords[1]);
        poi.setMainImageUrl(PoiConstants.DEFAULT_AUTO_IMAGE);
        poi.setSource(PoiConstants.SOURCE_AUTO);
        poi.setVerified(false);
        poi.setFeatured(false);
        poi.setQualityScore(PoiConstants.AUTO_QUALITY_SCORE);
        poi.setEditorialScore(PoiConstants.AUTO_EDITORIAL_SCORE);
        poi.setVisitMinutes(PoiConstants.AUTO_VISIT_MINUTES);

        return poiRepository.save(poi);
    }

    public PointOfInterest savePoi(PointOfInterest poi, User user) {
        poi.setUser(user);

        int currentPoints = user.getPoints() != null ? user.getPoints() : 0;
        user.setPoints(currentPoints + PoiConstants.POI_CREATION_POINTS);

        userRepository.save(user);
        return poiRepository.save(poi);
    }

    public List<PointOfInterest> searchPoi(String name, String category) {
        if ((name == null || name.isEmpty()) && (category == null || category.isEmpty())) {
            return poiRepository.findAll();
        }

        return poiRepository.findByNameContainingIgnoreCaseOrCategoryContainingIgnoreCase(
                name != null ? name : "",
                category != null ? category : ""
        );
    }

    public List<PointOfInterest> getGlobalPOIs() {
        return poiRepository.findByIsGlobalTrueOrderByUsageCountDesc();
    }

    public List<PointOfInterest> getGlobalPOIsByCity(Long cityId) {
        return poiRepository.findByCityIdAndIsGlobalTrueOrderByUsageCountDesc(cityId);
    }

    public List<PoiResponseDTO> getGlobalPOIsByCountry(Long countryId, Integer limit) {
        int safeLimit = normalizeLimit(limit, PoiConstants.CATALOG_DEFAULT_LIMIT);
        return poiRepository.findGlobalPOIsByCountryId(countryId, PageRequest.of(0, safeLimit))
                .stream()
                .map(PoiResponseDTO::new)
                .collect(Collectors.toList());
    }

    public List<PointOfInterest> getGlobalPOIsForMap(Long cityId, String category, String query) {
        String normalizedCategory = category == null || category.isBlank() ? null : category.trim();
        String normalizedQuery = query == null || query.isBlank() ? null : query.trim();

        return poiRepository.findGlobalPOIsForMap(cityId, normalizedCategory, normalizedQuery);
    }

    public PoiCatalogResponseDTO getGlobalCatalog(
            Long cityId,
            Long countryId,
            String category,
            String query,
            boolean featuredOnly,
            Integer limit
    ) {
        String normalizedCategory = category == null || category.isBlank() ? null : category.trim();
        String normalizedQuery = query == null || query.isBlank() ? null : query.trim();
        int safeLimit = normalizeLimit(limit, PoiConstants.CATALOG_DEFAULT_LIMIT);

        List<PoiResponseDTO> items = selectCatalogItems(
                cityId,
                countryId,
                normalizedCategory,
                normalizedQuery,
                featuredOnly,
                safeLimit
        );

        List<PoiCategoryCountDTO> categories = poiRepository.countGlobalPOICategories(cityId, countryId)
                .stream()
                .map(row -> new PoiCategoryCountDTO((String) row[0], ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        long total = countCatalogItems(cityId, countryId, normalizedCategory, normalizedQuery, featuredOnly);
        long featuredCount = poiRepository.countFeaturedGlobalPOIsCatalog(cityId, countryId);

        return new PoiCatalogResponseDTO(
                items,
                categories,
                (int) total,
                (int) featuredCount,
                cityId,
                countryId
        );
    }

    public List<PointOfInterest> getUserPrivatePOIs(Long userId) {
        return poiRepository.findByUserIdAndIsGlobalFalse(userId);
    }

    public List<PointOfInterest> getUserPrivatePOIs(
            Long userId,
            Long cityId,
            String category,
            String query,
            Integer limit
    ) {
        String normalizedCategory = category == null || category.isBlank() ? null : category.trim();
        String normalizedQuery = query == null || query.isBlank() ? null : query.trim();
        int safeLimit = normalizeLimit(limit, PoiConstants.USER_POI_DEFAULT_LIMIT);

        return poiRepository.findByUserIdAndIsGlobalFalse(userId)
                .stream()
                .filter(poi -> cityId == null || (poi.getCity() != null && cityId.equals(poi.getCity().getId())))
                .filter(poi -> normalizedCategory == null || matchesIgnoreCase(poi.getCategory(), normalizedCategory))
                .filter(poi -> normalizedQuery == null || matchesPoiQuery(poi, normalizedQuery))
                .sorted(Comparator
                        .comparing(PointOfInterest::getEditorialScore, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(PointOfInterest::getQualityScore, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(PointOfInterest::getUsageCount, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(PointOfInterest::getName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .limit(safeLimit)
                .collect(Collectors.toList());
    }

    @Transactional
    public PointOfInterest createUserPOI(PointOfInterest poi, User user) {
        poi.setUser(user);
        poi.setIsGlobal(false);
        poi.setUsageCount(0);
        poi.setSource(poi.getSource() == null || poi.getSource().isBlank() ? PoiConstants.SOURCE_USER : poi.getSource());
        poi.setVerified(false);
        poi.setFeatured(false);
        poi.setEditorialScore(poi.getEditorialScore() == null ? PoiConstants.USER_EDITORIAL_SCORE : poi.getEditorialScore());
        poi.setQualityScore(poi.getQualityScore() == null ? PoiConstants.USER_QUALITY_SCORE : poi.getQualityScore());
        poi.setVisitMinutes(poi.getVisitMinutes() == null ? PoiConstants.USER_VISIT_MINUTES : poi.getVisitMinutes());
        poi.setPriceLevel(poi.getPriceLevel() == null ? PoiConstants.DEFAULT_PRICE_LEVEL : poi.getPriceLevel());
        return poiRepository.save(poi);
    }

    @Transactional
    public PointOfInterest createGlobalPOI(PointOfInterest poi) {
        poi.setIsGlobal(true);
        poi.setUsageCount(0);
        poi.setSource(poi.getSource() == null || poi.getSource().isBlank() ? PoiConstants.SOURCE_CURATED : poi.getSource());
        poi.setVerified(poi.getVerified() != null ? poi.getVerified() : true);
        poi.setFeatured(poi.getFeatured() != null ? poi.getFeatured() : true);
        poi.setEditorialScore(poi.getEditorialScore() == null ? PoiConstants.GLOBAL_EDITORIAL_SCORE : poi.getEditorialScore());
        poi.setQualityScore(poi.getQualityScore() == null ? PoiConstants.GLOBAL_QUALITY_SCORE : poi.getQualityScore());
        poi.setVisitMinutes(poi.getVisitMinutes() == null ? PoiConstants.GLOBAL_VISIT_MINUTES : poi.getVisitMinutes());
        poi.setPriceLevel(poi.getPriceLevel() == null ? PoiConstants.DEFAULT_PRICE_LEVEL : poi.getPriceLevel());
        return poiRepository.save(poi);
    }

    public List<PointOfInterest> searchGlobalPOIs(String query) {
        return poiRepository.findByIsGlobalTrueAndNameContainingIgnoreCaseOrderByUsageCountDesc(query);
    }

    public List<PointOfInterest> getTopGlobalPOIs() {
        return poiRepository.findTop50ByIsGlobalTrueOrderByUsageCountDesc();
    }

    public List<PointOfInterest> getGlobalPOIsNearby(Double lat, Double lng, Double radiusKm) {
        return poiRepository.findGlobalPOIsWithinRadius(lat, lng, radiusKm);
    }

    @Transactional
    public void incrementUsageCount(Long poiId) {
        PointOfInterest poi = poiRepository.findById(poiId)
                .orElseThrow(() -> new RuntimeException("POI not found"));
        poi.setUsageCount((poi.getUsageCount() == null ? 0 : poi.getUsageCount()) + 1);
        poiRepository.save(poi);
    }

    private int normalizeLimit(Integer requestedLimit, int fallback) {
        if (requestedLimit == null) {
            return fallback;
        }

        return Math.max(1, Math.min(requestedLimit, PoiConstants.MAX_LIMIT));
    }

    private List<PoiResponseDTO> selectCatalogItems(
            Long cityId,
            Long countryId,
            String normalizedCategory,
            String normalizedQuery,
            boolean featuredOnly,
            int safeLimit
    ) {
        PageRequest pageRequest = PageRequest.of(0, safeLimit);

        if (normalizedCategory != null && normalizedQuery != null) {
            return poiRepository.findGlobalPOIsCatalogByCategoryAndQuery(
                            cityId,
                            countryId,
                            normalizedCategory,
                            normalizedQuery,
                            featuredOnly,
                            pageRequest
                    )
                    .stream()
                    .map(PoiResponseDTO::new)
                    .collect(Collectors.toList());
        }

        if (normalizedCategory != null) {
            return poiRepository.findGlobalPOIsCatalogByCategory(
                            cityId,
                            countryId,
                            normalizedCategory,
                            featuredOnly,
                            pageRequest
                    )
                    .stream()
                    .map(PoiResponseDTO::new)
                    .collect(Collectors.toList());
        }

        if (normalizedQuery != null) {
            return poiRepository.findGlobalPOIsCatalogByQuery(
                            cityId,
                            countryId,
                            normalizedQuery,
                            featuredOnly,
                            pageRequest
                    )
                    .stream()
                    .map(PoiResponseDTO::new)
                    .collect(Collectors.toList());
        }

        return poiRepository.findGlobalPOIsCatalogBase(cityId, countryId, featuredOnly, pageRequest)
                .stream()
                .map(PoiResponseDTO::new)
                .collect(Collectors.toList());
    }

    private long countCatalogItems(
            Long cityId,
            Long countryId,
            String normalizedCategory,
            String normalizedQuery,
            boolean featuredOnly
    ) {
        if (normalizedCategory != null && normalizedQuery != null) {
            return poiRepository.countGlobalPOIsCatalogByCategoryAndQuery(
                    cityId,
                    countryId,
                    normalizedCategory,
                    normalizedQuery,
                    featuredOnly
            );
        }

        if (normalizedCategory != null) {
            return poiRepository.countGlobalPOIsCatalogByCategory(
                    cityId,
                    countryId,
                    normalizedCategory,
                    featuredOnly
            );
        }

        if (normalizedQuery != null) {
            return poiRepository.countGlobalPOIsCatalogByQuery(
                    cityId,
                    countryId,
                    normalizedQuery,
                    featuredOnly
            );
        }

        return poiRepository.countGlobalPOIsCatalogBase(cityId, countryId, featuredOnly);
    }

    private boolean matchesIgnoreCase(String value, String expected) {
        return value != null && value.equalsIgnoreCase(expected);
    }

    private boolean matchesPoiQuery(PointOfInterest poi, String query) {
        String normalizedHaystack = String.join(" ",
                safeText(poi.getName()),
                safeText(poi.getDescription()),
                safeText(poi.getAddress()),
                poi.getCity() != null ? safeText(poi.getCity().getName()) : ""
        ).toLowerCase();

        return normalizedHaystack.contains(query.toLowerCase());
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }
}
