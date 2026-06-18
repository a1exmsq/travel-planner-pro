package com.travel.planner.service;

import com.travel.planner.config.RouteConstants;
import com.travel.planner.dto.PoiResponseDTO;
import com.travel.planner.dto.RoutePlanDTO;
import com.travel.planner.dto.RouteResponseDTO;
import com.travel.planner.dto.RouteShortDTO;
import com.travel.planner.dto.UserShortDTO;
import com.travel.planner.entity.City;
import com.travel.planner.entity.Country;
import com.travel.planner.entity.PointOfInterest;
import com.travel.planner.entity.Route;
import com.travel.planner.entity.RoutePOI;
import com.travel.planner.entity.RouteType;
import com.travel.planner.entity.User;
import com.travel.planner.exception.ForbiddenException;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.mapper.RouteMapper;
import com.travel.planner.repository.CityRepository;
import com.travel.planner.repository.CountryRepository;
import com.travel.planner.repository.PointOfInterestRepository;
import com.travel.planner.repository.RouteJournalEntryRepository;
import com.travel.planner.repository.RoutePackingItemRepository;
import com.travel.planner.repository.RoutePOIRepository;
import com.travel.planner.repository.RouteRepository;
import com.travel.planner.repository.UserStatsRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RouteService {

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
    private final RouteMapper routeMapper;

    private final ConcurrentHashMap<Long, Object> routeLocks = new ConcurrentHashMap<>();

    @Transactional
    public RouteResponseDTO createRoute(com.travel.planner.dto.CreateRouteRequestDTO request, User author) {
        Route route = new Route();
        route.setUser(author);
        route.setLikeCount(0);
        applyRouteMetadata(route, toRouteMetadata(request));

        Route saved = routeRepository.save(route);
        Route withMetrics = refreshRouteMetrics(saved);
        syncLocationCounters(null, null, withMetrics.getPrimaryCountry(), withMetrics.getPrimaryCity());
        gamificationService.checkAndUnlockAchievements(author.getId());
        log.info("Route created: id={} name='{}' user={}", withMetrics.getId(), withMetrics.getName(), author.getUsername());
        Route refreshed = refreshWithDetails(withMetrics.getId());
        return enrichResponseDto(routeMapper.toResponseDto(refreshed), refreshed, author);
    }

    @Transactional
    public RouteResponseDTO updateRoute(Long routeId, com.travel.planner.dto.UpdateRouteRequestDTO request, User currentUser) {
        Route route = routeAccessService.findEditableRoute(routeId, currentUser);

        if (request.getIsPublic() != null && request.getIsPublic() != route.isPublic()) {
            routeAccessService.checkCanManageCollaborators(route, currentUser);
        }

        Country oldCountry = route.getPrimaryCountry();
        City oldCity = route.getPrimaryCity();

        applyRouteMetadata(route, toRouteMetadata(route, request));

        Route saved = routeRepository.save(route);
        Route withMetrics = refreshRouteMetrics(saved);
        syncLocationCounters(oldCountry, oldCity, withMetrics.getPrimaryCountry(), withMetrics.getPrimaryCity());
        Route refreshed = refreshWithDetails(withMetrics.getId());
        return enrichResponseDto(routeMapper.toResponseDto(refreshed), refreshed, currentUser);
    }

    public Page<RouteShortDTO> getAllPublicRoutes(String tag, int page, int size) {
        Pageable pageable = PageRequest.of(page, safeSize(size));
        Page<Route> routes = hasText(tag)
                ? routeRepository.findPublicByTag(normalizeTag(tag), pageable)
                : routeRepository.findAllPublic(pageable);
        return enrichShortPage(routes, null);
    }

    public RouteResponseDTO getRouteById(Long id, User currentUser) {
        Route route = routeRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found"));
        routeAccessService.checkCanView(route, currentUser);
        return enrichResponseDto(routeMapper.toResponseDto(route), route, currentUser);
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
    public RouteResponseDTO addPoiToRoute(Long routeId, com.travel.planner.dto.AddPoiToRouteRequestDTO request, User currentUser) {
        if (!request.isValid()) {
            throw new IllegalArgumentException("Provide either poiId or custom coordinates");
        }

        Route route = routeAccessService.findEditableRoute(routeId, currentUser);

        RoutePOI link = new RoutePOI();
        link.setRoute(route);
        link.setTravelTimeMinutes(request.getTravelTimeMinutes());
        link.setOrderIndex(nextStopOrder(routeId));

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
        Route withMetrics = refreshRouteMetrics(refreshWithDetails(routeId));
        gamificationService.checkAndUnlockAchievements(currentUser.getId());
        return enrichResponseDto(routeMapper.toResponseDto(withMetrics), withMetrics, currentUser);
    }

    @Transactional
    public void removePoiFromRoute(Long routePoiId, User currentUser) {
        RoutePOI link = routePOIRepository.findById(routePoiId)
                .orElseThrow(() -> new ResourceNotFoundException("Route stop link not found"));
        routeAccessService.checkCanEdit(link.getRoute(), currentUser);
        Long routeId = link.getRoute().getId();
        routePOIRepository.deleteById(routePoiId);
        normalizeStopOrder(routeId);
        refreshRouteMetrics(refreshWithDetails(routeId));
    }

    @Transactional
    public PoiResponseDTO updateStopTime(Long routePoiId, int travelTimeMinutes, User currentUser) {
        RoutePOI link = routePOIRepository.findById(routePoiId)
                .orElseThrow(() -> new ResourceNotFoundException("Route stop not found"));
        routeAccessService.checkCanEdit(link.getRoute(), currentUser);
        link.setTravelTimeMinutes(travelTimeMinutes);
        PoiResponseDTO dto = mapRoutePOItoDTO(routePOIRepository.save(link));
        refreshRouteMetrics(refreshWithDetails(link.getRoute().getId()));
        return dto;
    }

    @Transactional
    public void reorderStops(Long routeId, List<Long> orderedRoutePoiIds, User currentUser) {
        routeAccessService.findEditableRoute(routeId, currentUser);
        List<RoutePOI> links = new ArrayList<>();
        for (int index = 0; index < orderedRoutePoiIds.size(); index++) {
            Long routePoiId = orderedRoutePoiIds.get(index);
            RoutePOI link = routePOIRepository.findById(routePoiId)
                    .orElseThrow(() -> new ResourceNotFoundException("Route stop link not found"));
            if (!link.getRoute().getId().equals(routeId)) {
                throw new ForbiddenException("Stop does not belong to this route");
            }
            link.setOrderIndex(index + 1);
            links.add(link);
        }
        routePOIRepository.saveAll(links);
        refreshRouteMetrics(refreshWithDetails(routeId));
    }

    @Transactional
    public RouteResponseDTO optimizeRoute(Long routeId, User currentUser) {
        Route route = routeAccessService.findEditableRoute(routeId, currentUser);
        routeOptimizerService.optimizeRoute(route);
        Route saved = routeRepository.save(route);
        Route refreshed = refreshWithDetails(saved.getId());
        return enrichResponseDto(routeMapper.toResponseDto(refreshed), refreshed, currentUser);
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

        List<RoutePOI> copiedPois = original.getRoutePois().stream()
                .sorted(Comparator.comparing(RoutePOI::getOrderIndex))
                .map(src -> copyRoutePoi(src, saved))
                .toList();
        routePOIRepository.saveAll(copiedPois);

        Route withMetrics = refreshRouteMetrics(refreshWithDetails(saved.getId()));
        gamificationService.checkAndUnlockAchievements(newUser.getId());
        return enrichResponseDto(routeMapper.toResponseDto(withMetrics), withMetrics, newUser);
    }

    public Page<RouteShortDTO> searchByName(String name, String tag, int page, int size) {
        Pageable pageable = PageRequest.of(page, safeSize(size));
        String normalizedName = name != null ? name.trim() : "";
        Page<Route> routes = hasText(tag)
                ? routeRepository.findPublicByNameAndTag(normalizedName, normalizeTag(tag), pageable)
                : routeRepository.findPublicByName(normalizedName, pageable);
        return enrichShortPage(routes, null);
    }

    public Page<RouteShortDTO> getPublicRoutesByUsername(String username, int page, int size) {
        Pageable pageable = PageRequest.of(page, safeSize(size));
        return enrichShortPage(routeRepository.findPublicByUsername(username, pageable), null);
    }

    public Page<RouteShortDTO> getTrendingRoutes(String tag, int page, int size) {
        Pageable pageable = PageRequest.of(page, safeSize(size));
        Page<Route> routes = hasText(tag)
                ? routeRepository.findPublicByTagOrderByLikes(normalizeTag(tag), pageable)
                : routeRepository.findAllPublicOrderByLikes(pageable);
        return enrichShortPage(routes, null);
    }

    public Page<RouteShortDTO> getPopularRoutes(String tag, int page, int size) {
        Pageable pageable = PageRequest.of(page, safeSize(size));
        Page<Route> routes = hasText(tag)
                ? routeRepository.findPublicByTagOrderByLikes(normalizeTag(tag), pageable)
                : routeRepository.findAllPublicOrderByLikes(pageable);
        return enrichShortPage(routes, null);
    }

    public Page<RouteShortDTO> getRoutesByUserId(Long userId, User currentUser, int page, int size) {
        Pageable pageable = PageRequest.of(page, safeSize(size));
        return enrichShortPage(routeRepository.findByUserId(userId, pageable), currentUser);
    }

    public Page<RouteShortDTO> getPublicRoutesByCountryId(Long countryId, int page, int size) {
        Pageable pageable = PageRequest.of(page, safeSize(size));
        return enrichShortPage(routeRepository.findPublicByPrimaryCountryIdOrderByLikeCountDesc(countryId, pageable), null);
    }

    public Page<RouteShortDTO> getPublicRoutesByCityId(Long cityId, int page, int size) {
        Pageable pageable = PageRequest.of(page, safeSize(size));
        return enrichShortPage(routeRepository.findPublicByPrimaryCityIdOrderByLikeCountDesc(cityId, pageable), null);
    }

    public List<String> getAvailableVibeTags() {
        return routeRepository.findTrendingVibeTags(PageRequest.of(0, RouteConstants.TRENDING_TAG_LIMIT)).stream()
                .map(row -> (String) row[0])
                .toList();
    }

    public RoutePlanDTO getFullRoutePlan(Long routeId, User currentUser) {
        Route route = routeRepository.findByIdWithDetails(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found"));
        routeAccessService.checkCanView(route, currentUser);
        List<PoiResponseDTO> stops = route.getRoutePois().stream()
                .sorted(Comparator.comparing(RoutePOI::getOrderIndex))
                .map(this::mapRoutePOItoDTO)
                .toList();
        return new RoutePlanDTO(route.getName(), route.getTotalDurationMinutes() != null ? route.getTotalDurationMinutes() : 0, stops);
    }

    public String getRouteDifficulty(Long routeId, User currentUser) {
        Route route = routeRepository.findByIdWithDetails(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found"));
        routeAccessService.checkCanView(route, currentUser);
        int count = route.getRoutePois().size();
        if (count <= RouteConstants.DIFFICULTY_EASY_MAX_STOPS) {
            return RouteConstants.DIFFICULTY_EASY;
        }
        if (count <= RouteConstants.DIFFICULTY_PACKED_MAX_STOPS) {
            return RouteConstants.DIFFICULTY_PACKED;
        }
        return RouteConstants.DIFFICULTY_HARD;
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

    public Route refreshRouteMetrics(Route route) {
        Route persisted = routeAccessService.getRouteOrThrow(route.getId());
        routeOptimizerService.recalculateRouteMetrics(persisted);
        return routeRepository.save(persisted);
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
        Route refreshed = route.getId() != null ? refreshWithDetails(route.getId()) : route;
        return enrichResponseDto(routeMapper.toResponseDto(refreshed), refreshed, currentUser);
    }

    private Route refreshWithDetails(Long routeId) {
        return routeRepository.findByIdWithDetails(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found"));
    }

    private RouteMetadata toRouteMetadata(com.travel.planner.dto.CreateRouteRequestDTO request) {
        return new RouteMetadata(
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
    }

    private RouteMetadata toRouteMetadata(Route route, com.travel.planner.dto.UpdateRouteRequestDTO request) {
        return new RouteMetadata(
                valueOrBlankDefault(request.getName(), route.getName()),
                valueOrDefault(request.getDescription(), route.getDescription()),
                valueOrDefault(request.getIsPublic(), route.isPublic()),
                valueOrDefault(request.getMainImageUrl(), route.getMainImageUrl()),
                valueOrDefault(request.getRouteType(), () -> route.getRouteType() != null ? route.getRouteType().name() : RouteType.CUSTOM.name()),
                valueOrDefault(request.getPrimaryCountryId(), () -> route.getPrimaryCountry() != null ? route.getPrimaryCountry().getId() : null),
                valueOrDefault(request.getPrimaryCityId(), () -> route.getPrimaryCity() != null ? route.getPrimaryCity().getId() : null),
                valueOrDefault(request.getRegionLabel(), route.getRegionLabel()),
                valueOrDefault(request.getLocationSummary(), route.getLocationSummary()),
                valueOrDefault(request.getVibeTags(), () -> new ArrayList<>(route.getVibeTags())),
                valueOrDefault(request.getStartDate(), route.getStartDate()),
                valueOrDefault(request.getEndDate(), route.getEndDate()),
                valueOrDefault(request.getTotalBudget(), route.getTotalBudget()),
                valueOrDefault(request.getCurrency(), route.getCurrency())
        );
    }

    private void applyRouteMetadata(Route route, RouteMetadata metadata) {
        City primaryCity = resolveCity(metadata.primaryCityId());
        Country primaryCountry = resolveCountry(metadata.primaryCountryId());
        if (primaryCity != null && primaryCity.getCountry() != null) {
            primaryCountry = primaryCity.getCountry();
        }

        route.setName(metadata.name());
        route.setDescription(metadata.description());
        route.setPublic(metadata.isPublic());
        route.setMainImageUrl(metadata.mainImageUrl());
        route.setPrimaryCountry(primaryCountry);
        route.setPrimaryCity(primaryCity);
        route.setRegionLabel(blankToNull(metadata.regionLabel()));
        route.setLocationSummary(buildLocationSummary(blankToNull(metadata.locationSummary()), primaryCountry, primaryCity, blankToNull(metadata.regionLabel())));
        route.setRouteType(resolveRouteType(metadata.routeTypeRaw(), primaryCountry, primaryCity, blankToNull(metadata.regionLabel())));
        route.setVibeTags(normalizeVibeTags(metadata.vibeTags()));
        route.setStartDate(metadata.startDate());
        route.setEndDate(metadata.endDate());
        route.setTotalBudget(metadata.totalBudget() != null ? metadata.totalBudget() : BigDecimal.ZERO);
        route.setCurrency(metadata.currency() == null || metadata.currency().isBlank()
                ? RouteConstants.DEFAULT_CURRENCY
                : metadata.currency().trim().toUpperCase(Locale.ROOT));
    }

    private City resolveCity(Long cityId) {
        return cityId != null
                ? cityRepository.findById(cityId).orElseThrow(() -> new ResourceNotFoundException("City not found"))
                : null;
    }

    private Country resolveCountry(Long countryId) {
        return countryId != null
                ? countryRepository.findById(countryId).orElseThrow(() -> new ResourceNotFoundException("Country not found"))
                : null;
    }

    private RouteType resolveRouteType(String rawValue, Country primaryCountry, City primaryCity, String regionLabel) {
        if (hasText(rawValue)) {
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
        if (hasText(rawSummary)) {
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
        return hasText(value) ? value.trim() : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String normalizeTag(String tag) {
        String normalized = blankToNull(tag);
        return normalized != null ? normalized.toLowerCase(Locale.ROOT) : null;
    }

    private Set<String> normalizeVibeTags(List<String> tags) {
        if (tags == null) {
            return new LinkedHashSet<>();
        }
        return tags.stream()
                .map(this::blankToNull)
                .filter(Objects::nonNull)
                .map(tag -> tag.toLowerCase(Locale.ROOT))
                .map(tag -> tag.length() > RouteConstants.MAX_TAG_LENGTH ? tag.substring(0, RouteConstants.MAX_TAG_LENGTH) : tag)
                .limit(RouteConstants.MAX_VIBE_TAGS)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private int nextStopOrder(Long routeId) {
        Object lock = routeLocks.computeIfAbsent(routeId, id -> new Object());
        synchronized (lock) {
            try {
                return Math.toIntExact(routePOIRepository.countByRouteId(routeId)) + 1;
            } finally {
                routeLocks.remove(routeId, lock);
            }
        }
    }

    private void normalizeStopOrder(Long routeId) {
        List<RoutePOI> ordered = routePOIRepository.findByRouteIdOrderByOrderIndexAsc(routeId);
        for (int index = 0; index < ordered.size(); index++) {
            RoutePOI routePOI = ordered.get(index);
            routePOI.setOrderIndex(index + 1);
        }
        routePOIRepository.saveAll(ordered);
    }

    private RoutePOI copyRoutePoi(RoutePOI source, Route targetRoute) {
        RoutePOI copy = new RoutePOI();
        copy.setRoute(targetRoute);
        copy.setPoi(source.getPoi());
        copy.setOrderIndex(source.getOrderIndex());
        copy.setTravelTimeMinutes(source.getTravelTimeMinutes());
        copy.setCustomName(source.getCustomName());
        copy.setCustomLatitude(source.getCustomLatitude());
        copy.setCustomLongitude(source.getCustomLongitude());
        return copy;
    }

    private void syncLocationCounters(Country oldCountry, City oldCity, Country newCountry, City newCity) {
        refreshCountryCounter(oldCountry);
        refreshCountryCounter(newCountry);
        refreshCityCounter(oldCity);
        refreshCityCounter(newCity);
    }

    private void refreshCountryCounter(Country country) {
        if (country == null) return;
        int count = Math.toIntExact(routeRepository.countByPrimaryCountryId(country.getId()));
        countryRepository.updateRoutesCount(country.getId(), count);
    }

    private void refreshCityCounter(City city) {
        if (city == null) return;
        int count = Math.toIntExact(routeRepository.countByPrimaryCityId(city.getId()));
        cityRepository.updateRoutesCount(city.getId(), count);
    }

    private int safeSize(int size) {
        return Math.min(Math.max(size, 1), RouteConstants.MAX_PAGE_SIZE);
    }

    private Page<RouteShortDTO> enrichShortPage(Page<Route> page, User currentUser) {
        List<Long> routeIds = page.getContent().stream().map(Route::getId).toList();
        Map<Long, BigDecimal> budgetSpent = budgetService.getBudgetSpentForRoutes(routeIds);
        Map<Long, Long> packingCounts = routePackingItemRepository.countByRouteIdInAsMap(routeIds);
        Map<Long, Long> packedCounts = routePackingItemRepository.countPackedByRouteIdInAsMap(routeIds);
        Map<Long, Long> journalCounts = routeJournalEntryRepository.countByRouteIdInAsMap(routeIds);
        Map<Long, Long> remixCounts = routeRepository.countForksByOriginalRouteIdsAsMap(routeIds);

        return page.map(route -> {
            RouteShortDTO dto = routeMapper.toShortDto(route);
            dto.setAuthor(enrichAuthor(dto.getAuthor()));
            dto.setAccessRole(routeAccessService.resolveAccessRole(route, currentUser));
            dto.setCanEdit(routeAccessService.canEdit(route, currentUser));
            dto.setCanManageCollaborators(routeAccessService.canManageCollaborators(route, currentUser));
            Long routeId = route.getId();
            dto.setBudgetSpent(budgetSpent.getOrDefault(routeId, BigDecimal.ZERO));
            dto.setPackingItemCount(packingCounts.getOrDefault(routeId, 0L));
            dto.setPackedItemCount(packedCounts.getOrDefault(routeId, 0L));
            dto.setJournalEntryCount(journalCounts.getOrDefault(routeId, 0L));
            dto.setRemixCount(remixCounts.getOrDefault(routeId, 0L).intValue());
            return dto;
        });
    }

    private RouteShortDTO enrichShortDto(RouteShortDTO dto, Route route, User currentUser) {
        dto.setAuthor(enrichAuthor(dto.getAuthor()));
        dto.setAccessRole(routeAccessService.resolveAccessRole(route, currentUser));
        dto.setCanEdit(routeAccessService.canEdit(route, currentUser));
        dto.setCanManageCollaborators(routeAccessService.canManageCollaborators(route, currentUser));
        dto.setBudgetSpent(budgetService.getBudgetSpentForRoute(route.getId()));
        dto.setPackingItemCount(routePackingItemRepository.countByRouteId(route.getId()));
        dto.setPackedItemCount(routePackingItemRepository.countByRouteIdAndPackedTrue(route.getId()));
        dto.setJournalEntryCount(routeJournalEntryRepository.countByRouteId(route.getId()));
        dto.setRemixCount((int) routeRepository.countByForkedFromRouteId(route.getId()));
        return dto;
    }

    private RouteResponseDTO enrichResponseDto(RouteResponseDTO dto, Route route, User currentUser) {
        enrichShortDto(dto, route, currentUser);
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

    private UserShortDTO enrichAuthor(UserShortDTO author) {
        if (author == null || author.getId() == null) {
            return author;
        }
        userStatsRepository.findByUserId(author.getId()).ifPresent(stats -> {
            author.setLevel(stats.getLevel());
            author.setLevelTitle(gamificationService.getLevelTitle(stats.getLevel()));
        });
        if (author.getLevel() == null) {
            author.setLevel(1);
            author.setLevelTitle(gamificationService.getLevelTitle(1));
        }
        return author;
    }

    private static <T> T valueOrDefault(T value, T fallback) {
        return value != null ? value : fallback;
    }

    private static <T> T valueOrDefault(T value, Supplier<T> fallback) {
        return value != null ? value : fallback.get();
    }

    private static String valueOrBlankDefault(String value, String fallback) {
        return value != null && !value.isBlank() ? value : fallback;
    }

    private record RouteMetadata(
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
            BigDecimal totalBudget,
            String currency) {
    }
}
