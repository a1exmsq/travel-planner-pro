package com.travel.planner.service;

import com.travel.planner.config.ItineraryConstants;
import com.travel.planner.dto.CreateDayActivityRequestDTO;
import com.travel.planner.dto.DayActivityDTO;
import com.travel.planner.dto.RouteDayDTO;
import com.travel.planner.dto.UpdateDayActivityRequestDTO;
import com.travel.planner.dto.UpdateRouteDayRequestDTO;
import com.travel.planner.entity.ActivityType;
import com.travel.planner.entity.DayActivity;
import com.travel.planner.entity.Route;
import com.travel.planner.entity.RouteDay;
import com.travel.planner.entity.RoutePOI;
import com.travel.planner.entity.User;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.DayActivityRepository;
import com.travel.planner.repository.RouteDayRepository;
import com.travel.planner.repository.RoutePOIRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ItineraryService {

    private final RouteAccessService routeAccessService;
    private final RouteDayRepository routeDayRepository;
    private final DayActivityRepository dayActivityRepository;
    private final RoutePOIRepository routePOIRepository;
    private final RouteOptimizerService routeOptimizerService;
    private final BudgetService budgetService;

    private final ConcurrentHashMap<Long, Object> dayLocks = new ConcurrentHashMap<>();

    public List<RouteDayDTO> getItinerary(Long routeId, User currentUser) {
        Route route = routeAccessService.findViewableRoute(routeId, currentUser);
        return routeDayRepository.findByRouteIdOrderByDayNumberAsc(route.getId()).stream()
                .map(this::mapDay)
                .toList();
    }

    @Transactional
    public RouteDayDTO createDay(Long routeId, com.travel.planner.dto.CreateRouteDayRequestDTO request, User currentUser) {
        Route route = routeAccessService.findEditableRoute(routeId, currentUser);
        RouteDay day = new RouteDay();
        day.setRoute(route);
        day.setDayNumber(resolveDayNumber(routeId, request.getDayNumber()));
        day.setDate(request.getDate());
        day.setTitle(request.getTitle());
        day.setNotes(request.getNotes());
        return mapDay(routeDayRepository.save(day));
    }

    private int resolveDayNumber(Long routeId, Integer requested) {
        return requested != null ? requested : (int) (routeDayRepository.countByRouteId(routeId) + 1);
    }

    @Transactional
    public RouteDayDTO updateDay(Long dayId, UpdateRouteDayRequestDTO request, User currentUser) {
        RouteDay day = routeDayRepository.findById(dayId)
                .orElseThrow(() -> new ResourceNotFoundException("Route day not found"));
        routeAccessService.checkCanEdit(day.getRoute(), currentUser);

        if (request.getDate() != null) {
            day.setDate(request.getDate());
        }
        if (request.getTitle() != null) {
            day.setTitle(request.getTitle());
        }
        if (request.getNotes() != null) {
            day.setNotes(request.getNotes());
        }
        return mapDay(routeDayRepository.save(day));
    }

    @Transactional
    public DayActivityDTO addActivity(Long dayId, com.travel.planner.dto.CreateDayActivityRequestDTO request, User currentUser) {
        RouteDay day = routeDayRepository.findById(dayId)
                .orElseThrow(() -> new ResourceNotFoundException("Route day not found"));
        routeAccessService.checkCanEdit(day.getRoute(), currentUser);
        RoutePOI routePOI = routePOIRepository.findById(request.getRoutePoiId())
                .orElseThrow(() -> new ResourceNotFoundException("Route stop not found"));

        synchronized (dayLocks.computeIfAbsent(dayId, k -> new Object())) {
            try {
                DayActivity activity = new DayActivity();
                activity.setRouteDay(day);
                activity.setRoutePoi(routePOI);
                activity.setOrderIndex((int) (dayActivityRepository.countByRouteDayId(dayId) + 1));
                activity.setStartTime(defaultStartTime(request.getStartTime()));
                activity.setDurationMinutes(resolveDuration(request.getDurationMinutes(), routePOI));
                activity.setActivityType(resolveActivityType(routePOI));
                activity.setNotes(request.getNotes());
                return mapActivity(dayActivityRepository.save(activity));
            } finally {
                dayLocks.remove(dayId);
            }
        }
    }

    @Transactional
    public DayActivityDTO updateActivity(Long activityId, UpdateDayActivityRequestDTO request, User currentUser) {
        DayActivity activity = dayActivityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found"));
        routeAccessService.checkCanEdit(activity.getRouteDay().getRoute(), currentUser);

        if (request.getRoutePoiId() != null) {
            RoutePOI routePOI = routePOIRepository.findById(request.getRoutePoiId())
                    .orElseThrow(() -> new ResourceNotFoundException("Route stop not found"));
            activity.setRoutePoi(routePOI);
            activity.setActivityType(resolveActivityType(routePOI));
        }

        if (request.getOrderIndex() != null) {
            activity.setOrderIndex(request.getOrderIndex());
        }
        if (request.getStartTime() != null) {
            activity.setStartTime(request.getStartTime());
        }
        if (request.getDurationMinutes() != null) {
            activity.setDurationMinutes(request.getDurationMinutes());
        }
        if (request.getNotes() != null) {
            activity.setNotes(request.getNotes());
        }
        return mapActivity(dayActivityRepository.save(activity));
    }

    @Transactional
    public List<RouteDayDTO> autoPlan(Long routeId, User currentUser) {
        Route route = routeAccessService.findEditableRoute(routeId, currentUser);
        validatePlanable(route);

        List<RoutePOI> orderedStops = route.getRoutePois().stream()
                .sorted(Comparator.comparing(RoutePOI::getOrderIndex))
                .toList();

        if (orderedStops.size() < ItineraryConstants.MIN_STOPS_FOR_PLANNING) {
            return List.of();
        }

        routeDayRepository.deleteAll(routeDayRepository.findByRouteIdOrderByDayNumberAsc(routeId));

        List<List<RoutePOI>> buckets = distributeStopsAcrossDays(route, orderedStops);
        return createDaysFromBuckets(route, buckets);
    }

    private void validatePlanable(Route route) {
        if (route.getStartDate() == null || route.getEndDate() == null
                || route.getNumberOfDays() == null || route.getNumberOfDays() <= 0) {
            throw new IllegalStateException("Set start and end dates before auto-planning the itinerary");
        }
    }

    private List<List<RoutePOI>> distributeStopsAcrossDays(Route route, List<RoutePOI> orderedStops) {
        int totalEstimatedMinutes = routeOptimizerService.calculateTotalDurationMinutes(route);
        int targetPerDay = Math.max(ItineraryConstants.MIN_DAILY_TARGET_MINUTES,
                totalEstimatedMinutes / route.getNumberOfDays());
        int overloadThreshold = (int) Math.round(targetPerDay * ItineraryConstants.DAY_OVERLOAD_RATIO);

        List<List<RoutePOI>> buckets = new ArrayList<>();
        List<RoutePOI> currentBucket = new ArrayList<>();
        int currentBucketMinutes = 0;

        for (int index = 0; index < orderedStops.size(); index++) {
            RoutePOI stop = orderedStops.get(index);
            int travelFromPrevious = index > 0
                    ? routeOptimizerService.calculateTravelMinutes(route.getRouteType(), orderedStops.get(index - 1), stop)
                    : 0;
            int estimatedStopMinutes = safeDuration(stop) + travelFromPrevious;
            int remainingStops = orderedStops.size() - index;
            int remainingDays = route.getNumberOfDays() - buckets.size() - 1;

            boolean shouldOpenNewDay = !currentBucket.isEmpty()
                    && buckets.size() < route.getNumberOfDays() - 1
                    && currentBucketMinutes + estimatedStopMinutes > overloadThreshold
                    && remainingStops > remainingDays;

            if (shouldOpenNewDay) {
                buckets.add(currentBucket);
                currentBucket = new ArrayList<>();
                currentBucketMinutes = 0;
            }

            currentBucket.add(stop);
            currentBucketMinutes += estimatedStopMinutes;
        }

        if (!currentBucket.isEmpty()) {
            buckets.add(currentBucket);
        }

        while (buckets.size() < route.getNumberOfDays()) {
            buckets.add(new ArrayList<>());
        }
        return buckets;
    }

    private List<RouteDayDTO> createDaysFromBuckets(Route route, List<List<RoutePOI>> buckets) {
        List<RouteDayDTO> planned = new ArrayList<>();
        for (int dayIndex = 0; dayIndex < buckets.size(); dayIndex++) {
            RouteDay day = new RouteDay();
            day.setRoute(route);
            day.setDayNumber(dayIndex + 1);
            day.setDate(route.getStartDate().plusDays(dayIndex));
            day.setTitle(ItineraryConstants.DEFAULT_DAY_TITLE_PREFIX + (dayIndex + 1));
            day = routeDayRepository.save(day);

            createActivitiesForDay(route, day, buckets.get(dayIndex));
            planned.add(mapDay(day));
        }
        return planned;
    }

    private void createActivitiesForDay(Route route, RouteDay day, List<RoutePOI> dayStops) {
        LocalTime cursor = ItineraryConstants.DEFAULT_ACTIVITY_START_TIME;
        for (int stopIndex = 0; stopIndex < dayStops.size(); stopIndex++) {
            RoutePOI stop = dayStops.get(stopIndex);
            DayActivity activity = new DayActivity();
            activity.setRouteDay(day);
            activity.setRoutePoi(stop);
            activity.setOrderIndex(stopIndex + 1);
            activity.setStartTime(cursor);
            activity.setDurationMinutes(safeDuration(stop));
            activity.setActivityType(resolveActivityType(stop));
            dayActivityRepository.save(activity);

            cursor = cursor.plusMinutes(safeDuration(stop));
            if (stopIndex < dayStops.size() - 1) {
                cursor = cursor.plusMinutes(routeOptimizerService.calculateTravelMinutes(route.getRouteType(), stop, dayStops.get(stopIndex + 1)));
            }
        }
    }

    private RouteDayDTO mapDay(RouteDay day) {
        List<DayActivity> rawActivities = dayActivityRepository.findByRouteDayIdOrderByOrderIndexAsc(day.getId());
        List<DayActivityDTO> activities = rawActivities.stream()
                .map(this::mapActivity)
                .toList();

        RouteDayDTO dto = new RouteDayDTO();
        dto.setId(day.getId());
        dto.setDayNumber(day.getDayNumber());
        dto.setDate(day.getDate());
        dto.setTitle(day.getTitle());
        dto.setNotes(day.getNotes());
        dto.setActivities(activities);
        dto.setActivityCount(activities.size());
        dto.setTotalDistanceKm(calculateTotalDistance(rawActivities));
        dto.setTotalDurationMinutes(calculateTotalDuration(day.getRoute(), rawActivities));
        dto.setTotalBudget(budgetService.getBudgetForDate(day.getRoute().getId(), day.getDate()));
        return dto;
    }

    private double calculateTotalDistance(List<DayActivity> activities) {
        double totalDistance = 0.0;
        for (int index = 1; index < activities.size(); index++) {
            totalDistance += routeOptimizerService.calculateDistanceKm(
                    activities.get(index - 1).getRoutePoi(), activities.get(index).getRoutePoi());
        }
        return Math.round(totalDistance * 10.0) / 10.0;
    }

    private int calculateTotalDuration(Route route, List<DayActivity> activities) {
        int totalDuration = 0;
        for (int index = 0; index < activities.size(); index++) {
            DayActivity current = activities.get(index);
            totalDuration += current.getDurationMinutes() != null ? current.getDurationMinutes() : 0;
            if (index > 0) {
                totalDuration += routeOptimizerService.calculateTravelMinutes(route.getRouteType(),
                        activities.get(index - 1).getRoutePoi(), current.getRoutePoi());
            }
        }
        return totalDuration;
    }

    private DayActivityDTO mapActivity(DayActivity activity) {
        DayActivityDTO dto = new DayActivityDTO();
        dto.setId(activity.getId());
        dto.setRoutePoiId(activity.getRoutePoi().getId());
        dto.setName(activity.getRoutePoi().getEffectiveName());
        dto.setOrderIndex(activity.getOrderIndex());
        dto.setStartTime(activity.getStartTime());
        dto.setDurationMinutes(activity.getDurationMinutes());
        dto.setActivityType(activity.getActivityType() != null ? activity.getActivityType().name() : ActivityType.SIGHTSEEING.name());
        dto.setNotes(activity.getNotes());
        dto.setLatitude(activity.getRoutePoi().getEffectiveLatitude());
        dto.setLongitude(activity.getRoutePoi().getEffectiveLongitude());
        return dto;
    }

    private int safeDuration(RoutePOI routePOI) {
        return routePOI.getTravelTimeMinutes() != null && routePOI.getTravelTimeMinutes() > 0
                ? routePOI.getTravelTimeMinutes()
                : ItineraryConstants.DEFAULT_ACTIVITY_DURATION_MINUTES;
    }

    private int resolveDuration(Integer requested, RoutePOI routePOI) {
        return requested != null ? requested : safeDuration(routePOI);
    }

    private LocalTime defaultStartTime(LocalTime requested) {
        return requested != null ? requested : ItineraryConstants.DEFAULT_ACTIVITY_START_TIME;
    }

    private ActivityType resolveActivityType(RoutePOI routePOI) {
        String category = routePOI.getPoi() != null && routePOI.getPoi().getCategory() != null
                ? routePOI.getPoi().getCategory().toLowerCase()
                : "";
        if (category.contains("food") || category.contains("cafe") || category.contains("restaurant")) {
            return ActivityType.FOOD;
        }
        if (category.contains("hotel") || category.contains("rest") || category.contains("park")) {
            return ActivityType.REST;
        }
        return ActivityType.SIGHTSEEING;
    }
}
