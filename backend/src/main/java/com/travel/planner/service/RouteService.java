package com.travel.planner.service;

import com.travel.planner.dto.*;
import com.travel.planner.entity.*;
import com.travel.planner.exception.ForbiddenException;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RouteService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final RouteRepository routeRepository;
    private final RoutePOIRepository routePOIRepository;
    private final PointOfInterestRepository poiRepository;
    private final CountryRepository countryRepository;
    private final CityRepository cityRepository;
    private final RouteAccessService routeAccessService;
    private final RouteOptimizerService routeOptimizerService;
    private final UserStatsRepository userStatsRepository;
    private final GamificationService gamificationService;
    private final BudgetService budgetService;
    private final RoutePackingItemRepository routePackingItemRepository;
    private final RouteJournalEntryRepository routeJournalEntryRepository;

    @Transactional
    public RouteResponseDTO createRoute(CreateRouteRequestDTO request, User author) {
        Route route = new Route();
        route.setUser(author);
        route.setLikeCount(0);
        applyRouteMetadata(
                route,
                request.getName(),
                request.getDescription(),
                request.isPublic(),
                request.getMainImageUrl(),
                request.getRouteType(),
                request.getPrimaryCountryId(),
                request.getPrimaryCityId(),
                request.getRegionLabel(),
                request.getLocationSummary(),
                request.getVibeTags(),
                request.getStartDate(),
                request.getEndDate(),
                request.getTotalBudget(),
                request.getCurrency()
        );

        Route saved = routeRepository.save(route);
        refreshRouteMetrics(saved);
        syncLocationCounters(null, null, saved.getPrimaryCountry(), saved.getPrimaryCity());
        gamificationService.checkAndUnlockAchievements(author.getId());
        log.info("Route created: id={} name='{}' user={}", saved.getId(), saved.getName(), author.getUsername());
        return convertToDTO(saved, author);
    }

    @Transactional
    public RouteResponseDTO updateRoute(Long routeId, UpdateRouteRequestDTO request, User currentUser) {
        Route route = routeAccessService.findEditableRoute(routeId, currentUser);

        if (request.getIsPublic() != null && request.getIsPublic() != route.isPublic()) {
            routeAccessService.checkCanManageCollaborators(route, currentUser);
        }

        Country oldCountry = route.getPrimaryCountry();
        City oldCity = route.getPrimaryCity();

        applyRouteMetadata(
                route,
                request.getName() != null && !request.getName().isBlank() ? request.getName() : route.getName(),
                request.getDescription() != null ? request.getDescription() : route.getDescription(),
                request.getIsPublic() != null ? request.getIsPublic() : route.isPublic(),
                request.getMainImageUrl() != null ? request.getMainImageUrl() : route.getMainImageUrl(),
                request.getRouteType() != null ? request.getRouteType() : route.getRouteType() != null ? route.getRouteType().name() : RouteType.CUSTOM.name(),
                request.getPrimaryCountryId() != null ? request.getPrimaryCountryId() : route.getPrimaryCountry() != null ? route.getPrimaryCountry().getId() : null,
                request.getPrimaryCityId() != null ? request.getPrimaryCityId() : route.getPrimaryCity() != null ? route.getPrimaryCity().getId() : null,
                request.getRegionLabel() != null ? request.getRegionLabel() : route.getRegionLabel(),
                request.getLocationSummary() != null ? request.getLocationSummary() : route.getLocationSummary(),
                request.getVibeTags() != null ? request.getVibeTags() : new ArrayList<>(route.getVibeTags()),
                request.getStartDate() != null ? request.getStartDate() : route.getStartDate(),
                request.getEndDate() != null ? request.getEndDate() : route.getEndDate(),
                request.getTotalBudget() != null ? request.getTotalBudget() : route.getTotalBudget(),
                request.getCurrency() != null ? request.getCurrency() : route.getCurrency()
        );

        Route saved = routeRepository.save(route);
        refreshRouteMetrics(saved);
        syncLocationCounters(oldCountry, oldCity, saved.getPrimaryCountry(), saved.getPrimaryCity());
        return convertToDTO(saved, currentUser);
    }

    public List<RouteResponseDTO> getAllPublicRoutes(String tag) {
        return getAllPublicRoutes(tag, 0, DEFAULT_PAGE_SIZE);
    }

    public List<RouteResponseDTO> getAllPublicRoutes(String tag, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        List<Route> routes = tag != null && !tag.isBlank()
                ? filterByTag(routeRepository.findAllPublic(), tag)
                : routeRepository.findAllPublic(PageRequest.of(page, safeSize));
        return routes.stream()
                .map(route -> convertToDTO(route, null))
                .toList();
    }

    public RouteResponseDTO getRouteById(Long id, User currentUser) {
        return convertToDTO(findViewableRouteEntity(id, currentUser), currentUser);
    }

    @Transactional
    public void deleteRoute(Long routeId, User currentUser) {
        Route route = routeAccessService.getRouteOrThrow(routeId);
        routeAccessService.checkCanDelete(route, currentUser);

        Country oldCountry = route.getPrimaryCountry();
        City oldCity = route.getPrimaryCity();
        routeRepository.deleteById(routeId);
        syncLocationCounters(oldCountry, oldCity, null, null);
    }

    @Transactional
    public RouteResponseDTO addPoiToRoute(Long routeId, AddPoiToRouteRequestDTO request, User currentUser) {
        if (!request.isValid()) {
            throw new RuntimeException("Provide either poiId or custom coordinates");
        }

        Route route = routeAccessService.findEditableRoute(routeId, currentUser);

        RoutePOI link = new RoutePOI();
        link.setRoute(route);
        link.setTravelTimeMinutes(request.getTravelTimeMinutes());
        link.setOrderIndex(route.getRoutePois().size() + 1);

        if (request.getPoiId() != null) {
            PointOfInterest poi = poiRepository.findById(request.getPoiId())
                    .orElseThrow(() -> new ResourceNotFoundException("POI not found"));
            link.setPoi(poi);
            poi.setUsageCount((poi.getUsageCount() == null ? 0 : poi.getUsageCount()) + 1);
            poiRepository.save(poi);
        } else {
            link.setCustomName(request.getCustomName());
            link.setCustomLatitude(request.getCustomLatitude());
            link.setCustomLongitude(request.getCustomLongitude());
        }

        routePOIRepository.save(link);
        Route saved = routeAccessService.getRouteOrThrow(routeId);
        refreshRouteMetrics(saved);
        gamificationService.checkAndUnlockAchievements(currentUser.getId());
        return convertToDTO(saved, currentUser);
    }

    @Transactional
    public void removePoiFromRoute(Long routePoiId, User currentUser) {
        RoutePOI link = routePOIRepository.findById(routePoiId)
                .orElseThrow(() -> new ResourceNotFoundException("Route stop link not found"));
        routeAccessService.checkCanEdit(link.getRoute(), currentUser);
        routePOIRepository.deleteById(routePoiId);
        normalizeStopOrder(link.getRoute().getId());
        refreshRouteMetrics(routeAccessService.getRouteOrThrow(link.getRoute().getId()));
    }

    @Transactional
    public PoiResponseDTO updateStopTime(Long routePoiId, int travelTimeMinutes, User currentUser) {
        RoutePOI link = routePOIRepository.findById(routePoiId)
                .orElseThrow(() -> new ResourceNotFoundException("Route stop not found"));
        routeAccessService.checkCanEdit(link.getRoute(), currentUser);
        link.setTravelTimeMinutes(travelTimeMinutes);
        PoiResponseDTO dto = mapRoutePOItoDTO(routePOIRepository.save(link));
        refreshRouteMetrics(routeAccessService.getRouteOrThrow(link.getRoute().getId()));
        return dto;
    }

    @Transactional
    public void reorderStops(Long routeId, List<Long> orderedRoutePoiIds, User currentUser) {
        Route route = routeAccessService.findEditableRoute(routeId, currentUser);
        for (int index = 0; index < orderedRoutePoiIds.size(); index++) {
            Long routePoiId = orderedRoutePoiIds.get(index);
            RoutePOI link = routePOIRepository.findById(routePoiId)
                    .orElseThrow(() -> new ResourceNotFoundException("Route stop link not found"));
            if (!link.getRoute().getId().equals(routeId)) {
                throw new ForbiddenException("Stop does not belong to this route");
            }
            link.setOrderIndex(index + 1);
            routePOIRepository.save(link);
        }
        refreshRouteMetrics(route);
    }

    @Transactional
    public RouteResponseDTO optimizeRoute(Long routeId, User currentUser) {
        Route route = routeAccessService.findEditableRoute(routeId, currentUser);
        routeOptimizerService.optimizeRoute(route);
        Route saved = routeRepository.save(route);
        return convertToDTO(saved, currentUser);
    }

    @Transactional
    public void togglePublic(Long routeId, boolean status, User currentUser) {
        Route route = routeAccessService.getRouteOrThrow(routeId);
        routeAccessService.checkCanManageCollaborators(route, currentUser);
        routeRepository.updatePublicStatus(routeId, status);
    }

    @Transactional
    public RouteResponseDTO copyRoute(Long originalRouteId, User newUser) {
        Route original = findViewableRouteEntity(originalRouteId, newUser);
        if (!original.isPublic() && !original.getUser().getId().equals(newUser.getId())) {
            throw new ForbiddenException("Private routes cannot be copied");
        }

        Route copy = new Route();
        copy.setName(original.getName() + " (Copy)");
        copy.setDescription(original.getDescription());
        copy.setUser(newUser);
        copy.setPublic(false);
        copy.setLikeCount(0);
        copy.setRouteType(original.getRouteType());
        copy.setPrimaryCountry(original.getPrimaryCountry());
        copy.setPrimaryCity(original.getPrimaryCity());
        copy.setRegionLabel(original.getRegionLabel());
        copy.setLocationSummary(original.getLocationSummary());
        copy.setMainImageUrl(original.getMainImageUrl());
        copy.setRouteMediaUrls(original.getRouteMediaUrls() != null ? new ArrayList<>(original.getRouteMediaUrls()) : new ArrayList<>());
        copy.setVibeTags(new LinkedHashSet<>(original.getVibeTags()));
        copy.setForkedFromRoute(original);
        copy.setOriginalRoute(original.getOriginalRoute() != null ? original.getOriginalRoute() : original);
        copy.setStartDate(original.getStartDate());
        copy.setEndDate(original.getEndDate());
        copy.setTotalBudget(original.getTotalBudget());
        copy.setCurrency(original.getCurrency());

        Route saved = routeRepository.save(copy);
        syncLocationCounters(null, null, saved.getPrimaryCountry(), saved.getPrimaryCity());

        for (RoutePOI src : original.getRoutePois()) {
            RoutePOI dst = new RoutePOI();
            dst.setRoute(saved);
            dst.setPoi(src.getPoi());
            dst.setOrderIndex(src.getOrderIndex());
            dst.setTravelTimeMinutes(src.getTravelTimeMinutes());
            dst.setCustomName(src.getCustomName());
            dst.setCustomLatitude(src.getCustomLatitude());
            dst.setCustomLongitude(src.getCustomLongitude());
            routePOIRepository.save(dst);
        }

        refreshRouteMetrics(saved);
        gamificationService.checkAndUnlockAchievements(newUser.getId());
        return convertToDTO(saved, newUser);
    }

    public List<RouteResponseDTO> searchByName(String name, String tag) {
        return filterByTag(routeRepository.findPublicByName(name), tag).stream()
                .map(route -> convertToDTO(route, null))
                .toList();
    }

    public List<RouteResponseDTO> getPublicRoutesByUsername(String username) {
        return routeRepository.findPublicByUsername(username).stream()
                .map(route -> convertToDTO(route, null))
                .toList();
    }

    public List<RouteResponseDTO> getTrendingRoutes(String tag) {
        return getTrendingRoutes(tag, 0, DEFAULT_PAGE_SIZE);
    }

    public List<RouteResponseDTO> getTrendingRoutes(String tag, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        List<Route> routes = tag != null && !tag.isBlank()
                ? filterByTag(routeRepository.findAllPublicOrderByLikes(), tag)
                : routeRepository.findAllPublicOrderByLikes(PageRequest.of(page, safeSize));
        return routes.stream()
                .map(route -> convertToDTO(route, null))
                .toList();
    }

    public List<RouteResponseDTO> getPopularRoutes(String tag) {
        return getPopularRoutes(tag, 0, DEFAULT_PAGE_SIZE);
    }

    public List<RouteResponseDTO> getPopularRoutes(String tag, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        List<Route> routes = tag != null && !tag.isBlank()
                ? filterByTag(routeRepository.findAllPublicOrderByLikes(), tag)
                : routeRepository.findAllPublicOrderByLikes(PageRequest.of(page, safeSize));
        return routes.stream()
                .map(route -> convertToDTO(route, null))
                .toList();
    }

    public List<RouteResponseDTO> getRoutesByUserId(Long userId) {
        return routeRepository.findByUserId(userId).stream()
                .map(route -> convertToDTO(route, route.getUser()))
                .toList();
    }

    public List<RouteResponseDTO> getPublicRoutesByCountryId(Long countryId) {
        return routeRepository.findPublicByPrimaryCountryIdOrderByLikeCountDesc(countryId).stream()
                .map(route -> convertToDTO(route, null))
                .toList();
    }

    public List<RouteResponseDTO> getPublicRoutesByCityId(Long cityId) {
        return routeRepository.findPublicByPrimaryCityIdOrderByLikeCountDesc(cityId).stream()
                .map(route -> convertToDTO(route, null))
                .toList();
    }

    public List<String> getAvailableVibeTags() {
        return routeRepository.findAllPublic().stream()
                .flatMap(route -> route.getVibeTags().stream())
                .collect(Collectors.groupingBy(tag -> tag, Collectors.counting()))
                .entrySet()
                .stream()
                .sorted((left, right) -> {
                    int countCompare = Long.compare(right.getValue(), left.getValue());
                    return countCompare != 0 ? countCompare : left.getKey().compareTo(right.getKey());
                })
                .map(java.util.Map.Entry::getKey)
                .limit(12)
                .toList();
    }

    public RoutePlanDTO getFullRoutePlan(Long routeId, User currentUser) {
        Route route = findViewableRouteEntity(routeId, currentUser);
        List<PoiResponseDTO> stops = route.getRoutePois().stream()
                .sorted(Comparator.comparing(RoutePOI::getOrderIndex))
                .map(this::mapRoutePOItoDTO)
                .collect(Collectors.toList());
        return new RoutePlanDTO(route.getName(), route.getTotalDurationMinutes() != null ? route.getTotalDurationMinutes() : 0, stops);
    }

    public String getRouteDifficulty(Long routeId, User currentUser) {
        Route route = findViewableRouteEntity(routeId, currentUser);
        int count = route.getRoutePois().size();
        if (count <= 3) return "Easy";
        if (count <= 7) return "Packed day";
        return "Road warrior";
    }

    public Route findViewableRouteEntity(Long id, User currentUser) {
        return routeAccessService.findViewableRoute(id, currentUser);
    }

    public boolean canEdit(Route route, User currentUser) {
        return routeAccessService.canEdit(route, currentUser);
    }

    public boolean canManageCollaborators(Route route, User currentUser) {
        return routeAccessService.canManageCollaborators(route, currentUser);
    }

    public void refreshRouteMetrics(Route route) {
        Route persisted = routeAccessService.getRouteOrThrow(route.getId());
        routeOptimizerService.recalculateRouteMetrics(persisted);
        routeRepository.save(persisted);
    }

    public PoiResponseDTO mapRoutePOItoDTO(RoutePOI link) {
        PoiResponseDTO dto = new PoiResponseDTO(
                link.getEffectiveName(),
                link.getPoi() != null ? link.getPoi().getCategory() : "Custom",
                link.getOrderIndex(),
                link.getTravelTimeMinutes() != null ? link.getTravelTimeMinutes() : 0,
                link.getEffectiveLatitude(),
                link.getEffectiveLongitude(),
                link.getPoi() != null ? link.getPoi().getDescription() : null,
                link.getPoi() != null ? link.getPoi().getMainImageUrl() : null,
                link.getPoi() != null ? link.getPoi().getGalleryUrls() : null
        );
        dto.setRoutePoiId(link.getId());
        if (link.getPoi() != null) {
            dto.setId(link.getPoi().getId());
            dto.setIsGlobal(link.getPoi().getIsGlobal());
            dto.setAddress(link.getPoi().getAddress());
            if (link.getPoi().getCity() != null) {
                dto.setCityId(link.getPoi().getCity().getId());
                dto.setCityName(link.getPoi().getCity().getName());
                if (link.getPoi().getCity().getCountry() != null) {
                    dto.setCountryId(link.getPoi().getCity().getCountry().getId());
                    dto.setCountryName(link.getPoi().getCity().getCountry().getName());
                }
            }
        }
        return dto;
    }

    public RouteResponseDTO convertToDTO(Route route) {
        return convertToDTO(route, null);
    }

    public RouteResponseDTO convertToDTO(Route route, User currentUser) {
        RouteResponseDTO dto = new RouteResponseDTO();
        dto.setId(route.getId());
        dto.setName(route.getName());
        dto.setDescription(route.getDescription());
        dto.setLikeCounts(route.getLikeCount());
        dto.setPublic(route.isPublic());
        dto.setRouteType(route.getRouteType() != null ? route.getRouteType().name() : RouteType.CUSTOM.name());
        dto.setRegionLabel(route.getRegionLabel());
        dto.setLocationSummary(route.getLocationSummary());
        dto.setMainImageUrl(route.getMainImageUrl());
        dto.setRouteMediaUrls(route.getRouteMediaUrls());
        dto.setVibeTags(new ArrayList<>(route.getVibeTags()));
        dto.setStartDate(route.getStartDate());
        dto.setEndDate(route.getEndDate());
        dto.setNumberOfDays(route.getNumberOfDays());
        dto.setTotalBudget(route.getTotalBudget());
        dto.setCurrency(route.getCurrency());
        dto.setBudgetSpent(budgetService.getBudgetSpentForRoute(route.getId()));
        dto.setPackingItemCount(routePackingItemRepository.countByRouteId(route.getId()));
        dto.setPackedItemCount(routePackingItemRepository.countByRouteIdAndPackedTrue(route.getId()));
        dto.setJournalEntryCount(routeJournalEntryRepository.countByRouteId(route.getId()));
        dto.setTotalDistanceKm(route.getTotalDistanceKm() != null ? route.getTotalDistanceKm() : 0.0);
        dto.setIsOptimized(route.getIsOptimized() != null ? route.getIsOptimized() : false);
        dto.setAuthor(buildAuthorDTO(route.getUser()));
        dto.setRemixCount((int) routeRepository.countByForkedFromRouteId(route.getId()));
        dto.setAccessRole(routeAccessService.resolveAccessRole(route, currentUser));
        dto.setCanEdit(routeAccessService.canEdit(route, currentUser));
        dto.setCanManageCollaborators(routeAccessService.canManageCollaborators(route, currentUser));

        if (route.getForkedFromRoute() != null) {
            dto.setForkedFromRouteId(route.getForkedFromRoute().getId());
            dto.setForkedFromRouteName(route.getForkedFromRoute().getName());
            dto.setForkedFromAuthorUsername(route.getForkedFromRoute().getUser().getDisplayUsername());
        }

        if (route.getOriginalRoute() != null) {
            dto.setOriginalRouteId(route.getOriginalRoute().getId());
            dto.setOriginalRouteName(route.getOriginalRoute().getName());
            dto.setOriginalRouteAuthorUsername(route.getOriginalRoute().getUser().getDisplayUsername());
        }

        if (route.getPrimaryCountry() != null) {
            dto.setPrimaryCountryId(route.getPrimaryCountry().getId());
            dto.setPrimaryCountryName(route.getPrimaryCountry().getName());
            dto.setPrimaryCountryCode(route.getPrimaryCountry().getCode());
            dto.setPrimaryCountryImageUrl(route.getPrimaryCountry().getImageUrl());
        }

        if (route.getPrimaryCity() != null) {
            dto.setPrimaryCityId(route.getPrimaryCity().getId());
            dto.setPrimaryCityName(route.getPrimaryCity().getName());
            dto.setPrimaryCityImageUrl(route.getPrimaryCity().getImageUrl());
        }

        List<PoiResponseDTO> stops = route.getRoutePois().stream()
                .sorted(Comparator.comparing(RoutePOI::getOrderIndex))
                .map(this::mapRoutePOItoDTO)
                .toList();
        dto.setStops(stops);
        dto.setTotalPoints(stops.size());
        dto.setTotalDurationMinutes(route.getTotalDurationMinutes() != null
                ? route.getTotalDurationMinutes()
                : routeOptimizerService.calculateTotalDurationMinutes(route));
        return dto;
    }

    private UserShortDTO buildAuthorDTO(User user) {
        UserShortDTO dto = UserShortDTO.from(user);
        userStatsRepository.findByUserId(user.getId()).ifPresent(stats -> {
            dto.setLevel(stats.getLevel());
            dto.setLevelTitle(gamificationService.getLevelTitle(stats.getLevel()));
        });
        if (dto.getLevel() == null) {
            dto.setLevel(1);
            dto.setLevelTitle(gamificationService.getLevelTitle(1));
        }
        return dto;
    }

    private void applyRouteMetadata(
            Route route,
            String name,
            String description,
            boolean isPublic,
            String mainImageUrl,
            String routeTypeRaw,
            Long primaryCountryId,
            Long primaryCityId,
            String regionLabel,
            String locationSummary,
            List<String> vibeTags,
            LocalDate startDate,
            LocalDate endDate,
            java.math.BigDecimal totalBudget,
            String currency
    ) {
        City primaryCity = primaryCityId != null
                ? cityRepository.findById(primaryCityId).orElseThrow(() -> new ResourceNotFoundException("City not found"))
                : null;

        Country primaryCountry = primaryCountryId != null
                ? countryRepository.findById(primaryCountryId).orElseThrow(() -> new ResourceNotFoundException("Country not found"))
                : null;

        if (primaryCity != null && primaryCity.getCountry() != null) {
            primaryCountry = primaryCity.getCountry();
        }

        route.setName(name);
        route.setDescription(description);
        route.setPublic(isPublic);
        route.setMainImageUrl(mainImageUrl);
        route.setPrimaryCountry(primaryCountry);
        route.setPrimaryCity(primaryCity);
        route.setRegionLabel(blankToNull(regionLabel));
        route.setLocationSummary(buildLocationSummary(blankToNull(locationSummary), primaryCountry, primaryCity, blankToNull(regionLabel)));
        route.setRouteType(resolveRouteType(routeTypeRaw, primaryCountry, primaryCity, route.getRegionLabel()));
        route.setVibeTags(normalizeVibeTags(vibeTags));
        route.setStartDate(startDate);
        route.setEndDate(endDate);
        route.setNumberOfDays(calculateNumberOfDays(startDate, endDate));
        route.setTotalBudget(totalBudget != null ? totalBudget : java.math.BigDecimal.ZERO);
        route.setCurrency(currency == null || currency.isBlank() ? "USD" : currency.trim().toUpperCase(Locale.ROOT));
    }

    private RouteType resolveRouteType(String rawValue, Country primaryCountry, City primaryCity, String regionLabel) {
        if (rawValue != null && !rawValue.isBlank()) {
            try {
                return RouteType.valueOf(rawValue.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ignored) {
            }
        }

        if (primaryCity != null) return RouteType.CITY;
        if (regionLabel != null) return RouteType.REGION;
        if (primaryCountry != null) return RouteType.ROAD_TRIP;
        return RouteType.CUSTOM;
    }

    private String buildLocationSummary(String rawSummary, Country primaryCountry, City primaryCity, String regionLabel) {
        if (rawSummary != null && !rawSummary.isBlank()) {
            return rawSummary;
        }
        if (primaryCity != null && primaryCountry != null) {
            return primaryCity.getName() + ", " + primaryCountry.getName();
        }
        if (regionLabel != null && primaryCountry != null) {
            return regionLabel + ", " + primaryCountry.getName();
        }
        if (primaryCountry != null) {
            return primaryCountry.getName();
        }
        return null;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Set<String> normalizeVibeTags(List<String> tags) {
        if (tags == null) return new LinkedHashSet<>();

        return tags.stream()
                .map(this::blankToNull)
                .filter(tag -> tag != null)
                .map(tag -> tag.toLowerCase(Locale.ROOT))
                .map(tag -> tag.length() > 32 ? tag.substring(0, 32) : tag)
                .limit(8)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private List<Route> filterByTag(List<Route> routes, String tag) {
        String normalizedTag = blankToNull(tag);
        if (normalizedTag == null) {
            return routes;
        }

        String expected = normalizedTag.toLowerCase(Locale.ROOT);
        return routes.stream()
                .filter(route -> route.getVibeTags().stream().anyMatch(candidate -> expected.equalsIgnoreCase(candidate)))
                .toList();
    }

    private Integer calculateNumberOfDays(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            return 0;
        }
        return (int) java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
    }

    private void syncLocationCounters(Country oldCountry, City oldCity, Country newCountry, City newCity) {
        refreshCountryCounter(oldCountry);
        refreshCountryCounter(newCountry);
        refreshCityCounter(oldCity);
        refreshCityCounter(newCity);
    }

    private void refreshCountryCounter(Country country) {
        if (country == null) return;
        countryRepository.findById(country.getId()).ifPresent(found -> {
            found.setRoutesCount(Math.toIntExact(routeRepository.countByPrimaryCountryId(found.getId())));
            countryRepository.save(found);
        });
    }

    private void refreshCityCounter(City city) {
        if (city == null) return;
        cityRepository.findById(city.getId()).ifPresent(found -> {
            found.setRoutesCount(Math.toIntExact(routeRepository.countByPrimaryCityId(found.getId())));
            cityRepository.save(found);
        });
    }

    private void normalizeStopOrder(Long routeId) {
        List<RoutePOI> ordered = routePOIRepository.findByRouteIdOrderByOrderIndexAsc(routeId);
        for (int index = 0; index < ordered.size(); index++) {
            RoutePOI routePOI = ordered.get(index);
            routePOI.setOrderIndex(index + 1);
            routePOIRepository.save(routePOI);
        }
    }
}
