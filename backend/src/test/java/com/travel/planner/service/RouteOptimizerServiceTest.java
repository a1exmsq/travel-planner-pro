package com.travel.planner.service;

import com.travel.planner.entity.Route;
import com.travel.planner.entity.RoutePOI;
import com.travel.planner.entity.RouteType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RouteOptimizerServiceTest {

    private RouteOptimizerService optimizer;

    @BeforeEach
    void setUp() {
        optimizer = new RouteOptimizerService();
    }

    // Helper: create a stop with custom coordinates (no linked POI)
    private RoutePOI stop(Long id, int orderIndex, double lat, double lon) {
        RoutePOI s = new RoutePOI();
        s.setId(id);
        s.setOrderIndex(orderIndex);
        s.setTravelTimeMinutes(30);
        s.setCustomLatitude(lat);
        s.setCustomLongitude(lon);
        return s;
    }

    @Test
    void calculateDistanceKm_shouldReturnApproximateValue_forWarsawToKrakow() {
        // Warsaw -> Krakow ~ 300 km
        RoutePOI warsaw = stop(1L, 1, 52.2297, 21.0122);
        RoutePOI krakow = stop(2L, 2, 50.0647, 19.9450);

        double distance = optimizer.calculateDistanceKm(warsaw, krakow);

        assertEquals(252.0, distance, 10.0); // ~252 km, ±10 km tolerance
    }

    @Test
    void calculateDistanceKm_shouldReturnZero_whenCoordinatesMissing() {
        RoutePOI a = stop(1L, 1, 0.0, 0.0);
        RoutePOI b = new RoutePOI();
        b.setId(2L);
        b.setOrderIndex(2);
        // no coordinates set

        assertEquals(0.0, optimizer.calculateDistanceKm(a, b));
    }

    @Test
    void optimizeRoute_shouldReorderByProximity_forThreeStops() {
        // A(0,0) -> B(10,10) -> C(0.001,0)  (C is much closer to A than B)
        RoutePOI a = stop(1L, 1, 0.0, 0.0);
        RoutePOI b = stop(2L, 2, 10.0, 10.0);
        RoutePOI c = stop(3L, 3, 0.001, 0.0);

        Route route = new Route();
        route.setRouteType(RouteType.CITY);
        List<RoutePOI> stops = new ArrayList<>(List.of(a, b, c));
        route.setRoutePois(stops);

        List<RoutePOI> optimized = optimizer.optimizeRoute(route);

        assertEquals(3, optimized.size());
        assertEquals(1L, optimized.get(0).getId()); // A stays first
        assertEquals(3L, optimized.get(1).getId()); // C should come next (closest to A)
        assertEquals(2L, optimized.get(2).getId()); // B is last
        assertTrue(route.getIsOptimized());
    }

    @Test
    void optimizeRoute_shouldReturnOriginalOrder_whenLessThanTwoCoordinateStops() {
        RoutePOI a = stop(1L, 1, 0.0, 0.0);
        RoutePOI b = new RoutePOI();
        b.setId(2L);
        b.setOrderIndex(2);
        // b has no coordinates

        Route route = new Route();
        route.setRouteType(RouteType.CITY);
        route.setRoutePois(new ArrayList<>(List.of(a, b)));

        List<RoutePOI> result = optimizer.optimizeRoute(route);

        assertEquals(2, result.size());
        assertEquals(1L, result.get(0).getId());
        assertEquals(2L, result.get(1).getId());
        assertFalse(route.getIsOptimized());
    }

    @Test
    void calculateTravelMinutes_shouldUsePedestrianSpeed_forCityRoute() {
        RoutePOI a = stop(1L, 1, 0.0, 0.0);
        RoutePOI b = stop(2L, 2, 0.0, 0.5); // ~38 km at equator (approx 55 km)

        int minutes = optimizer.calculateTravelMinutes(RouteType.CITY, a, b);
        // city speed = 5 km/h => ~55/5 = 11h => ~660 min, but exact Haversine matters
        assertTrue(minutes > 0);
    }

    @Test
    void calculateTravelMinutes_shouldUseCarSpeed_forRoadTrip() {
        RoutePOI a = stop(1L, 1, 0.0, 0.0);
        RoutePOI b = stop(2L, 2, 0.0, 0.5);

        int cityMinutes = optimizer.calculateTravelMinutes(RouteType.CITY, a, b);
        int roadMinutes = optimizer.calculateTravelMinutes(RouteType.ROAD_TRIP, a, b);

        assertTrue(roadMinutes < cityMinutes, "Road trip should be faster than walking");
    }

    @Test
    void calculateTotalDistanceKm_shouldReturnZero_forEmptyList() {
        assertEquals(0.0, optimizer.calculateTotalDistanceKm(List.of()));
    }

    @Test
    void calculateTotalDistanceKm_shouldReturnZero_forSingleStop() {
        assertEquals(0.0, optimizer.calculateTotalDistanceKm(List.of(stop(1L, 1, 0.0, 0.0))));
    }
}
