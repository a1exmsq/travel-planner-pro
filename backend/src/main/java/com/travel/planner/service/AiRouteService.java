package com.travel.planner.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.travel.planner.dto.ai.*;
import com.travel.planner.entity.City;
import com.travel.planner.entity.PointOfInterest;
import com.travel.planner.repository.CityRepository;
import com.travel.planner.repository.PointOfInterestRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiRouteService {

    private final PointOfInterestRepository poiRepository;
    private final CityRepository cityRepository;
    private final ObjectMapper objectMapper;

    private final RestClient restClient = RestClient.create();

    @Value("${openai.api-key:}")
    private String openaiApiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String openaiModel;

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    // GPT-4o-mini has a limited context window; 60 POIs keeps the prompt
    // under ~2000 tokens while still giving the model enough choices
    private static final int MAX_POIS_FOR_PROMPT = 60;

    // Maps user interest keywords (from the UI) to internal POI category names
    private static final Map<String, Set<String>> INTEREST_CATEGORIES = Map.of(
        "history",   Set.of("Landmark", "Museum", "Religious"),
        "food",      Set.of("Restaurant", "Cafe", "Bar", "Market"),
        "nature",    Set.of("Park", "Viewpoint"),
        "art",       Set.of("Museum", "Culture"),
        "nightlife", Set.of("Bar"),
        "sport",     Set.of("Sport"),
        "religion",  Set.of("Religious")
    );


    private static final Map<String, String> CATEGORY_THEME = Map.ofEntries(
        Map.entry("Landmark",   "Iconic landmarks"),
        Map.entry("Museum",     "Museums & galleries"),
        Map.entry("Religious",  "Sacred sites"),
        Map.entry("Restaurant", "Culinary trail"),
        Map.entry("Cafe",       "Cafes & slow morning"),
        Map.entry("Bar",        "Evening bites & bars"),
        Map.entry("Park",       "Parks & green spaces"),
        Map.entry("Viewpoint",  "Views & panoramas"),
        Map.entry("Culture",    "Arts & culture"),
        Map.entry("Market",     "Local markets"),
        Map.entry("Sport",      "Active day")
    );

    @Transactional(readOnly = true)
    public AiGenerateRouteResponseDTO generateRoute(AiGenerateRouteRequestDTO request) {
        int days = Math.max(1, Math.min(7, request.getDays()));
        request.setDays(days);

        City city = cityRepository.findById(request.getCityId())
            .orElseThrow(() -> new RuntimeException("City not found: " + request.getCityId()));

        List<PointOfInterest> pois = poiRepository
            .findByCityIdAndIsGlobalTrueOrderByUsageCountDesc(city.getId())
            .stream()
            .limit(MAX_POIS_FOR_PROMPT)
            .toList();

        if (pois.isEmpty()) {
            throw new RuntimeException("No places found for " + city.getName() + ". Try importing from OpenStreetMap first.");
        }

        log.info("[AI] Generating {}-day {} route for {} ({} POIs available), AI={}",
            days, request.getPace(), city.getName(), pois.size(), !openaiApiKey.isBlank());

        if (!openaiApiKey.isBlank()) {
            try {
                return callOpenAI(request, pois, city);
            } catch (Exception e) {
                // If OpenAI is unavailable or the key is invalid, fall back to
                // the deterministic algorithm so the feature never fully breaks
                log.warn("[AI] OpenAI call failed, falling back to algorithm: {}", e.getMessage());
                return algorithmicFallback(request, pois, city);
            }
        }

        // No API key configured — use algorithmic route building (dev/demo mode)
        return algorithmicFallback(request, pois, city);
    }

    // OpenAI

    private AiGenerateRouteResponseDTO callOpenAI(AiGenerateRouteRequestDTO req,
                                                   List<PointOfInterest> pois,
                                                   City city) throws Exception {
        String systemPrompt = """
            You are a professional travel route planner. You create practical, well-organized itineraries \
            based on real places provided to you. Always return valid JSON only, no explanation outside JSON.""";

        String poiList = pois.stream()
            .map(p -> "[%d] %s (%s)%s".formatted(
                p.getId(),
                p.getName(),
                p.getCategory() != null ? p.getCategory() : "Place",
                p.getAddress() != null ? " – " + p.getAddress() : ""
            ))
            .collect(Collectors.joining("\n"));

        String interests = req.getInterests().isEmpty()
            ? "general sightseeing"
            : String.join(", ", req.getInterests());

        int stopsPerDay = stopsPerDay(req.getPace());
        String countryName = city.getCountry() != null ? ", " + city.getCountry().getName() : "";

        String userPrompt = """
            Create a %d-day %s itinerary for %s%s.
            Traveler interests: %s
            Target stops per day: %d

            Available places (use ONLY these poiId values):
            %s

            Return JSON in exactly this structure (no markdown, no extra text):
            {
              "title": "short route title (max 70 chars)",
              "description": "2-3 sentence route overview",
              "days": [
                {
                  "dayNumber": 1,
                  "theme": "day theme",
                  "description": "one-sentence day overview",
                  "stops": [
                    {"poiId": 123, "note": "1-sentence visit tip", "visitMinutes": 60, "orderInDay": 1}
                  ]
                }
              ]
            }

            Rules:
            - Only use poiId values from the list above
            - Order stops logically (by area/proximity where possible)
            - Match stops to traveler interests
            - Vary categories across and within days
            - Never invent places not in the list
            """.formatted(
                req.getDays(), req.getPace(), city.getName(), countryName,
                interests, stopsPerDay, poiList);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", openaiModel);
        body.put("messages", List.of(
            Map.of("role", "system", "content", systemPrompt),
            Map.of("role", "user",   "content", userPrompt)
        ));
        // json_object mode forces the model to always return valid JSON —
        // prevents responses wrapped in markdown code blocks
        body.put("response_format", Map.of("type", "json_object"));
        // 3000 tokens is enough for a 7-day itinerary with notes; more would hit rate limits
        body.put("max_tokens", 3000);
        // 0.7 gives creative but coherent results; lower = repetitive, higher = hallucinations
        body.put("temperature", 0.7);

        String rawResponse = restClient.post()
            .uri(OPENAI_URL)
            .header("Authorization", "Bearer " + openaiApiKey)
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .body(String.class);

        JsonNode root    = objectMapper.readTree(rawResponse);
        String content   = root.path("choices").get(0).path("message").path("content").asText();
        AiRawResponse raw = objectMapper.readValue(content, AiRawResponse.class);

        return mapToResponse(raw, pois, city, req.getDays(), true);
    }

    private AiGenerateRouteResponseDTO algorithmicFallback(AiGenerateRouteRequestDTO req,
                                                            List<PointOfInterest> pois,
                                                            City city) {
        int stopsPerDay = stopsPerDay(req.getPace());
        int totalSlots  = stopsPerDay * req.getDays();

        Set<String> preferred = req.getInterests().stream()
            .flatMap(i -> INTEREST_CATEGORIES.getOrDefault(i, Set.of()).stream())
            .collect(Collectors.toSet());

        List<PointOfInterest> sorted = new ArrayList<>(pois);
        sorted.sort(Comparator
            .comparingInt((PointOfInterest p) -> preferred.isEmpty() || preferred.contains(p.getCategory()) ? 0 : 1)
            .thenComparingInt(p -> -(p.getQualityScore() != null ? p.getQualityScore() : 0))
            .thenComparingInt(p -> -(p.getUsageCount() != null ? p.getUsageCount() : 0))
        );

        List<PointOfInterest> selected = sorted.stream()
            .limit(Math.min(totalSlots, sorted.size()))
            .toList();

        List<AiGeneratedDayDTO> dayList = new ArrayList<>();
        int idx = 0;
        for (int day = 1; day <= req.getDays(); day++) {
            List<AiGeneratedPoiStopDTO> stops = new ArrayList<>();
            int stopOrder = 1;
            for (int s = 0; s < stopsPerDay && idx < selected.size(); s++, idx++) {
                stops.add(mapPoiToStop(selected.get(idx), stopOrder++));
            }
            if (stops.isEmpty()) break;
            String theme = detectTheme(stops, day, city.getName());
            String desc  = "Day %d in %s — %s.".formatted(day, city.getName(), theme.toLowerCase());
            dayList.add(new AiGeneratedDayDTO(day, theme, desc, stops));
        }

        String pace = req.getPace();
        String title = "%d-day %s %s guide".formatted(req.getDays(),
            pace.equals("relaxed") ? "relaxed" : pace.equals("intense") ? "packed" : "balanced",
            city.getName());
        String desc = "A curated %d-day route through %s's top places. %s.".formatted(
            req.getDays(), city.getName(),
            req.getInterests().isEmpty() ? "Balanced mix of categories"
                : "Focused on " + String.join(" & ", req.getInterests()));

        return new AiGenerateRouteResponseDTO(title, desc, city.getId(), city.getName(),
            dayList.size(), dayList, false);
    }

    private int stopsPerDay(String pace) {
        return switch (pace != null ? pace : "normal") {
            case "relaxed" -> 4;
            case "intense" -> 8;
            default -> 6;
        };
    }

    private AiGeneratedPoiStopDTO mapPoiToStop(PointOfInterest poi, int order) {
        return new AiGeneratedPoiStopDTO(
            poi.getId(),
            poi.getName(),
            poi.getCategory(),
            poi.getMainImageUrl() != null ? poi.getMainImageUrl() : poi.getImageUrl(),
            poi.getLatitude(),
            poi.getLongitude(),
            poi.getAddress(),
            buildDefaultNote(poi),
            poi.getVisitMinutes() != null && poi.getVisitMinutes() > 0 ? poi.getVisitMinutes() : defaultVisitMinutes(poi.getCategory()),
            order
        );
    }

    private String buildDefaultNote(PointOfInterest poi) {
        if (poi.getDescription() != null && !poi.getDescription().isBlank()) {
            String d = poi.getDescription().trim();
            return d.length() > 120 ? d.substring(0, 120).trim() + "…" : d;
        }
        return switch (poi.getCategory() != null ? poi.getCategory() : "") {
            case "Restaurant", "Cafe", "Bar" -> "A great spot to take a break and enjoy local flavors.";
            case "Museum"                    -> "Allow time to explore the exhibits properly.";
            case "Park", "Viewpoint"         -> "A perfect spot to slow down and take in the surroundings.";
            case "Landmark"                  -> "One of the defining sights of the city.";
            case "Religious"                 -> "Worth a quiet visit — impressive architecture and atmosphere.";
            default                          -> "A recommended stop on your itinerary.";
        };
    }

    private int defaultVisitMinutes(String category) {
        if (category == null) return 60;
        return switch (category) {
            case "Museum", "Religious" -> 90;
            case "Restaurant"          -> 75;
            case "Cafe", "Bar"         -> 45;
            case "Park", "Viewpoint"   -> 60;
            default                    -> 60;
        };
    }

    private String detectTheme(List<AiGeneratedPoiStopDTO> stops, int dayNumber, String cityName) {
        if (stops.isEmpty()) return "City exploration";
        Map<String, Long> counts = stops.stream()
            .filter(s -> s.getCategory() != null)
            .collect(Collectors.groupingBy(AiGeneratedPoiStopDTO::getCategory, Collectors.counting()));
        String dominant = counts.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse(null);
        return dominant != null
            ? CATEGORY_THEME.getOrDefault(dominant, "City exploration")
            : "City exploration";
    }

    private AiGenerateRouteResponseDTO mapToResponse(AiRawResponse raw,
                                                      List<PointOfInterest> pois,
                                                      City city, int days, boolean aiGenerated) {
        Map<Long, PointOfInterest> poiMap = pois.stream()
            .collect(Collectors.toMap(PointOfInterest::getId, p -> p, (a, b) -> a));

        List<AiGeneratedDayDTO> dayList = new ArrayList<>();
        if (raw.days != null) {
            for (AiRawDay rawDay : raw.days) {
                List<AiGeneratedPoiStopDTO> stops = new ArrayList<>();
                if (rawDay.stops != null) {
                    int order = 1;
                    for (AiRawStop rawStop : rawDay.stops) {
                        PointOfInterest poi = poiMap.get(rawStop.poiId);
                        if (poi == null) continue; // skip hallucinated IDs
                        AiGeneratedPoiStopDTO stop = mapPoiToStop(poi, order++);
                        if (rawStop.note != null && !rawStop.note.isBlank()) stop.setNote(rawStop.note);
                        if (rawStop.visitMinutes > 0) stop.setVisitMinutes(rawStop.visitMinutes);
                        stop.setOrderInDay(rawStop.orderInDay > 0 ? rawStop.orderInDay : order - 1);
                        stops.add(stop);
                    }
                }
                dayList.add(new AiGeneratedDayDTO(
                    rawDay.dayNumber,
                    rawDay.theme != null ? rawDay.theme : "Day " + rawDay.dayNumber,
                    rawDay.description != null ? rawDay.description : "",
                    stops
                ));
            }
        }

        return new AiGenerateRouteResponseDTO(
            raw.title != null ? raw.title : days + "-day " + city.getName() + " route",
            raw.description != null ? raw.description : "",
            city.getId(), city.getName(), days, dayList, aiGenerated
        );
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class AiRawResponse {
        public String title;
        public String description;
        public List<AiRawDay> days;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class AiRawDay {
        public int dayNumber;
        public String theme;
        public String description;
        public List<AiRawStop> stops;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class AiRawStop {
        public Long poiId;
        public String note;
        public int visitMinutes;
        public int orderInDay;
    }
}
