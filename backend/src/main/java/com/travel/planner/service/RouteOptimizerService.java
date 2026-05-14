package com.travel.planner.service;

import com.travel.planner.entity.Route;
import com.travel.planner.entity.RoutePOI;
import com.travel.planner.entity.RouteType;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RouteOptimizerService {

    public List<RoutePOI> optimizeRoute(Route route) {
        List<RoutePOI> ordered = route.getRoutePois().stream()
                .sorted(Comparator.comparing(RoutePOI::getOrderIndex))
                .toList();

        if (ordered.size() < 3) {
            applyMetrics(route, ordered, false);
            return ordered;
        }

        List<RoutePOI> coordinateStops = ordered.stream()
                .filter(this::hasCoordinates)
                .toList();

        if (coordinateStops.size() < 2) {
            applyMetrics(route, ordered, false);
            return ordered;
        }

        // Nearest-neighbour greedy algorithm: at each step pick the unvisited
        // stop closest to the current one. O(n²) but perfectly fine for n ≤ 250.
        // Not globally optimal (TSP is NP-hard) but gives good results in practice.
        List<RoutePOI> optimized = new ArrayList<>();
        Set<Long> visited = new HashSet<>();
        RoutePOI first = coordinateStops.getFirst();
        optimized.add(first);
        visited.add(first.getId());

        RoutePOI current = first;
        while (visited.size() < coordinateStops.size()) {
            RoutePOI currentStop = current;
            RoutePOI next = coordinateStops.stream()
                    .filter(candidate -> !visited.contains(candidate.getId()))
                    .min(Comparator.comparingDouble(candidate -> calculateDistanceKm(currentStop, candidate)))
                    .orElse(null);
            if (next == null) {
                break;
            }
            optimized.add(next);
            visited.add(next.getId());
            current = next;
        }

        ordered.stream()
                .filter(stop -> !visited.contains(stop.getId()))
                .forEach(optimized::add);

        for (int index = 0; index < optimized.size(); index++) {
            optimized.get(index).setOrderIndex(index + 1);
        }

        applyMetrics(route, optimized, true);
        return optimized;
    }

    public void recalculateRouteMetrics(Route route) {
        List<RoutePOI> ordered = route.getRoutePois().stream()
                .sorted(Comparator.comparing(RoutePOI::getOrderIndex))
                .toList();
        applyMetrics(route, ordered, route.getIsOptimized() != null && route.getIsOptimized());
    }

    public double calculateTotalDistanceKm(List<RoutePOI> orderedStops) {
        double total = 0.0;
        for (int index = 1; index < orderedStops.size(); index++) {
            total += calculateDistanceKm(orderedStops.get(index - 1), orderedStops.get(index));
        }
        return round(total);
    }

    public int calculateTotalDurationMinutes(Route route) {
        List<RoutePOI> orderedStops = route.getRoutePois().stream()
                .sorted(Comparator.comparing(RoutePOI::getOrderIndex))
                .toList();
        return calculateTotalDurationMinutes(route.getRouteType(), orderedStops);
    }

    public int calculateTotalDurationMinutes(RouteType routeType, List<RoutePOI> orderedStops) {
        int total = 0;
        for (int index = 0; index < orderedStops.size(); index++) {
            RoutePOI current = orderedStops.get(index);
            total += current.getTravelTimeMinutes() != null ? current.getTravelTimeMinutes() : 0;
            if (index > 0) {
                total += calculateTravelMinutes(routeType, orderedStops.get(index - 1), current);
            }
        }
        return total;
    }

    public int calculateTravelMinutes(RouteType routeType, RoutePOI from, RoutePOI to) {
        double distanceKm = calculateDistanceKm(from, to);
        if (distanceKm <= 0) {
            return 0;
        }
        // Road trips use 30 km/h (city driving with stops);
        // city walks use 5 km/h (average pedestrian pace)
        double speedKmPerHour = switch (routeType != null ? routeType : RouteType.CUSTOM) {
            case MULTI_CITY, ROAD_TRIP -> 30.0;
            case CITY, REGION, CUSTOM -> 5.0;
        };
        return (int) Math.round((distanceKm / speedKmPerHour) * 60.0);
    }

    public double calculateDistanceKm(RoutePOI left, RoutePOI right) {
        if (!hasCoordinates(left) || !hasCoordinates(right)) {
            return 0.0;
        }

        double lat1 = Math.toRadians(left.getEffectiveLatitude());
        double lon1 = Math.toRadians(left.getEffectiveLongitude());
        double lat2 = Math.toRadians(right.getEffectiveLatitude());
        double lon2 = Math.toRadians(right.getEffectiveLongitude());

        // Haversine formula — calculates the great-circle distance between two
        // points on a sphere. 6371.0 km is the mean radius of the Earth.
        double dLat = lat2 - lat1;
        double dLon = lon2 - lon1;
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dLon / 2), 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371.0 * c;
    }

    private boolean hasCoordinates(RoutePOI stop) {
        return stop.getEffectiveLatitude() != null && stop.getEffectiveLongitude() != null;
    }

    private void applyMetrics(Route route, List<RoutePOI> orderedStops, boolean optimized) {
        double totalDistance = 0.0;
        int totalDuration = 0;

        for (int index = 0; index < orderedStops.size(); index++) {
            RoutePOI current = orderedStops.get(index);
            int stayDuration = current.getTravelTimeMinutes() != null ? current.getTravelTimeMinutes() : 0;
            totalDuration += stayDuration;

            if (index == 0) {
                current.setDistanceMeters(0.0);
                current.setDurationSeconds(0);
                continue;
            }

            RoutePOI previous = orderedStops.get(index - 1);
            double legDistanceKm = calculateDistanceKm(previous, current);
            int legTravelMinutes = calculateTravelMinutes(route.getRouteType(), previous, current);
            current.setDistanceMeters(legDistanceKm * 1000.0);
            current.setDurationSeconds(legTravelMinutes * 60);
            totalDistance += legDistanceKm;
            totalDuration += legTravelMinutes;
        }

        route.setTotalDistanceKm(round(totalDistance));
        route.setTotalDurationMinutes(totalDuration);
        route.setIsOptimized(optimized);
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
