package com.travel.planner.service;

import com.travel.planner.dto.*;
import com.travel.planner.entity.*;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.DayActivityRepository;
import com.travel.planner.repository.RouteDayRepository;
import com.travel.planner.repository.RoutePOIRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

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

    public List<RouteDayDTO> getItinerary(Long routeId, com.travel.planner.entity.User currentUser) {
        Route route = routeAccessService.findViewableRoute(routeId, currentUser);
        return routeDayRepository.findByRouteIdOrderByDayNumberAsc(route.getId()).stream()
                .map(this::mapDay)
                .toList();
    }

    @Transactional
    public RouteDayDTO createDay(Long routeId, CreateRouteDayRequestDTO request, com.travel.planner.entity.User currentUser) {
        Route route = routeAccessService.findEditableRoute(routeId, currentUser);
        RouteDay day = new RouteDay();
        day.setRoute(route);
        day.setDayNumber(request.getDayNumber() != null ? request.getDayNumber() : routeDayRepository.findByRouteIdOrderByDayNumberAsc(routeId).size() + 1);
        day.setDate(request.getDate());
        day.setTitle(request.getTitle());
        day.setNotes(request.getNotes());
        return mapDay(routeDayRepository.save(day));
    }

    @Transactional
    public RouteDayDTO updateDay(Long dayId, UpdateRouteDayRequestDTO request, com.travel.planner.entity.User currentUser) {
        RouteDay day = routeDayRepository.findById(dayId)
                .orElseThrow(() -> new ResourceNotFoundException("Route day not found"));
        routeAccessService.checkCanEdit(day.getRoute(), currentUser);
        day.setDate(request.getDate() != null ? request.getDate() : day.getDate());
        day.setTitle(request.getTitle() != null ? request.getTitle() : day.getTitle());
        day.setNotes(request.getNotes() != null ? request.getNotes() : day.getNotes());
        return mapDay(routeDayRepository.save(day));
    }

    @Transactional
    public DayActivityDTO addActivity(Long dayId, CreateDayActivityRequestDTO request, com.travel.planner.entity.User currentUser) {
        RouteDay day = routeDayRepository.findById(dayId)
                .orElseThrow(() -> new ResourceNotFoundException("Route day not found"));
        routeAccessService.checkCanEdit(day.getRoute(), currentUser);
        RoutePOI routePOI = routePOIRepository.findById(request.getRoutePoiId())
                .orElseThrow(() -> new ResourceNotFoundException("Route stop not found"));

        DayActivity activity = new DayActivity();
        activity.setRouteDay(day);
        activity.setRoutePoi(routePOI);
        activity.setOrderIndex(dayActivityRepository.findByRouteDayIdOrderByOrderIndexAsc(dayId).size() + 1);
        activity.setStartTime(request.getStartTime() != null ? request.getStartTime() : LocalTime.of(9, 0));
        activity.setDurationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : safeDuration(routePOI));
        activity.setActivityType(resolveActivityType(routePOI));
        activity.setNotes(request.getNotes());
        return mapActivity(dayActivityRepository.save(activity));
    }

    @Transactional
    public DayActivityDTO updateActivity(Long activityId, UpdateDayActivityRequestDTO request, com.travel.planner.entity.User currentUser) {
        DayActivity activity = dayActivityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found"));
        routeAccessService.checkCanEdit(activity.getRouteDay().getRoute(), currentUser);

        if (request.getRoutePoiId() != null) {
            RoutePOI routePOI = routePOIRepository.findById(request.getRoutePoiId())
                    .orElseThrow(() -> new ResourceNotFoundException("Route stop not found"));
            activity.setRoutePoi(routePOI);
            activity.setActivityType(resolveActivityType(routePOI));
        }

        activity.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : activity.getOrderIndex());
        activity.setStartTime(request.getStartTime() != null ? request.getStartTime() : activity.getStartTime());
        activity.setDurationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : activity.getDurationMinutes());
        activity.setNotes(request.getNotes() != null ? request.getNotes() : activity.getNotes());
        return mapActivity(dayActivityRepository.save(activity));
    }

    @Transactional
    public List<RouteDayDTO> autoPlan(Long routeId, com.travel.planner.entity.User currentUser) {
        Route route = routeAccessService.findEditableRoute(routeId, currentUser);
        if (route.getStartDate() == null || route.getEndDate() == null || route.getNumberOfDays() == null || route.getNumberOfDays() <= 0) {
            throw new RuntimeException("Set start and end dates before auto-planning the itinerary");
        }

        List<RouteDay> existingDays = routeDayRepository.findByRouteIdOrderByDayNumberAsc(routeId);
        routeDayRepository.deleteAll(existingDays);

        List<RoutePOI> orderedStops = route.getRoutePois().stream()
                .sorted(Comparator.comparing(RoutePOI::getOrderIndex))
                .toList();

        if (orderedStops.isEmpty()) {
            return List.of();
        }

        int totalEstimatedMinutes = routeOptimizerService.calculateTotalDurationMinutes(route);
        int targetPerDay = Math.max(1, totalEstimatedMinutes / route.getNumberOfDays());
        List<List<RoutePOI>> buckets = new ArrayList<>();
        List<RoutePOI> currentBucket = new ArrayList<>();
        int currentBucketMinutes = 0;

        for (int index = 0; index < orderedStops.size(); index++) {
            RoutePOI stop = orderedStops.get(index);
            int travelFromPrevious = index > 0 ? routeOptimizerService.calculateTravelMinutes(route.getRouteType(), orderedStops.get(index - 1), stop) : 0;
            int estimatedStopMinutes = safeDuration(stop) + travelFromPrevious;
            int remainingStops = orderedStops.size() - index;
            int remainingDays = route.getNumberOfDays() - buckets.size() - 1;

            boolean shouldOpenNewDay = !currentBucket.isEmpty()
                    && buckets.size() < route.getNumberOfDays() - 1
                    && currentBucketMinutes + estimatedStopMinutes > Math.round(targetPerDay * 1.25)
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

        List<RouteDayDTO> planned = new ArrayList<>();
        for (int dayIndex = 0; dayIndex < buckets.size(); dayIndex++) {
            RouteDay day = new RouteDay();
            day.setRoute(route);
            day.setDayNumber(dayIndex + 1);
            day.setDate(route.getStartDate().plusDays(dayIndex));
            day.setTitle("Day " + (dayIndex + 1));
            day = routeDayRepository.save(day);

            LocalTime cursor = LocalTime.of(9, 0);
            List<RoutePOI> dayStops = buckets.get(dayIndex);
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

            planned.add(mapDay(day));
        }

        return planned;
    }

    private RouteDayDTO mapDay(RouteDay day) {
        List<DayActivityDTO> activities = dayActivityRepository.findByRouteDayIdOrderByOrderIndexAsc(day.getId()).stream()
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

        double totalDistance = 0.0;
        int totalDuration = 0;
        List<DayActivity> rawActivities = dayActivityRepository.findByRouteDayIdOrderByOrderIndexAsc(day.getId());
        for (int index = 0; index < rawActivities.size(); index++) {
            DayActivity current = rawActivities.get(index);
            totalDuration += current.getDurationMinutes() != null ? current.getDurationMinutes() : 0;
            if (index > 0) {
                totalDistance += routeOptimizerService.calculateDistanceKm(rawActivities.get(index - 1).getRoutePoi(), current.getRoutePoi());
                totalDuration += routeOptimizerService.calculateTravelMinutes(day.getRoute().getRouteType(), rawActivities.get(index - 1).getRoutePoi(), current.getRoutePoi());
            }
        }
        dto.setTotalDistanceKm(Math.round(totalDistance * 10.0) / 10.0);
        dto.setTotalDurationMinutes(totalDuration);
        dto.setTotalBudget(budgetService.getBudgetForDate(day.getRoute().getId(), day.getDate()));
        return dto;
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
                : 30;
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
