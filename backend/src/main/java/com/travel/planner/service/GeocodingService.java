package com.travel.planner.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class GeocodingService {
    private final RestTemplate restTemplate;

    public double[] getCoordinates(String name) {
        String url = "https://nominatim.openstreetmap.org/search?q=" + name + "&format=json&limit=1";

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "TravelPlannerApp/1.0");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Map[]> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map[].class);

            if (response.getBody() != null && response.getBody().length > 0) {
                Map<String, Object> firstResult = response.getBody()[0];
                double lat = Double.parseDouble((String) firstResult.get("lat"));
                double lon = Double.parseDouble((String) firstResult.get("lon"));
                return new double[]{lat, lon};
            }
        } catch (Exception e) {
            System.err.println("Ошибка геокодирования для: " + name + " -> " + e.getMessage());
        }
        return new double[]{0.0, 0.0};
    }
}
