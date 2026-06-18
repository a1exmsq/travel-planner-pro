package com.travel.planner.service;

import com.travel.planner.config.OsmConstants;
import com.travel.planner.dto.OsmImportResultDTO;
import com.travel.planner.dto.osm.OverpassElement;
import com.travel.planner.dto.osm.OverpassResponse;
import com.travel.planner.entity.City;
import com.travel.planner.entity.PointOfInterest;
import com.travel.planner.repository.CityRepository;
import com.travel.planner.repository.PointOfInterestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class OsmImportService {

    private final PointOfInterestRepository poiRepository;
    private final CityRepository cityRepository;

    private final RestClient restClient = RestClient.create();

    private static final Map<String, String> AMENITY = Map.ofEntries(
        Map.entry("restaurant",        "Restaurant"),
        Map.entry("fast_food",         "Restaurant"),
        Map.entry("food_court",        "Restaurant"),
        Map.entry("cafe",              "Cafe"),
        Map.entry("ice_cream",         "Cafe"),
        Map.entry("bar",               "Bar"),
        Map.entry("pub",               "Bar"),
        Map.entry("nightclub",         "Bar"),
        Map.entry("museum",            "Museum"),
        Map.entry("theatre",           "Culture"),
        Map.entry("cinema",            "Culture"),
        Map.entry("arts_centre",       "Culture"),
        Map.entry("library",           "Culture"),
        Map.entry("place_of_worship",  "Religious"),
        Map.entry("marketplace",       "Market"),
        Map.entry("park",              "Park")
    );

    private static final Map<String, String> TOURISM = Map.ofEntries(
        Map.entry("attraction",  "Landmark"),
        Map.entry("monument",    "Landmark"),
        Map.entry("museum",      "Museum"),
        Map.entry("gallery",     "Museum"),
        Map.entry("viewpoint",   "Viewpoint"),
        Map.entry("artwork",     "Landmark"),
        Map.entry("information", "Landmark"),
        Map.entry("theme_park",  "Landmark"),
        Map.entry("zoo",         "Landmark")
    );

    private static final Map<String, String> LEISURE = Map.ofEntries(
        Map.entry("park",            "Park"),
        Map.entry("garden",          "Park"),
        Map.entry("nature_reserve",  "Park"),
        Map.entry("sports_centre",   "Sport"),
        Map.entry("stadium",         "Sport"),
        Map.entry("beach_resort",    "Park")
    );

    private static final Map<String, String> HISTORIC = Map.ofEntries(
        Map.entry("monument",           "Landmark"),
        Map.entry("memorial",           "Landmark"),
        Map.entry("castle",             "Landmark"),
        Map.entry("palace",             "Landmark"),
        Map.entry("fort",               "Landmark"),
        Map.entry("ruins",              "Landmark"),
        Map.entry("archaeological_site","Landmark"),
        Map.entry("church",             "Religious"),
        Map.entry("cathedral",          "Religious"),
        Map.entry("building",           "Landmark")
    );

    private static final Map<String, String> CATEGORY_IMAGES = Map.ofEntries(
        Map.entry("Restaurant", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"),
        Map.entry("Cafe",       "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800"),
        Map.entry("Bar",        "https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=800"),
        Map.entry("Museum",     "https://images.unsplash.com/photo-1565060169194-19fabf63012c?w=800"),
        Map.entry("Park",       "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800"),
        Map.entry("Landmark",   "https://images.unsplash.com/photo-1468818438311-4bab781ab9b8?w=800"),
        Map.entry("Viewpoint",  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"),
        Map.entry("Religious",  "https://images.unsplash.com/photo-1548625149-720834bdac78?w=800"),
        Map.entry("Culture",    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800"),
        Map.entry("Market",     "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800"),
        Map.entry("Sport",      "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800")
    );

    @Transactional
    public OsmImportResultDTO importForCity(Long cityId) {
        City city = cityRepository.findById(cityId)
            .orElseThrow(() -> new RuntimeException("City not found: " + cityId));

        if (city.getLatitude() == null || city.getLongitude() == null) {
            throw new RuntimeException("City '" + city.getName() + "' has no coordinates");
        }

        log.info("[OSM] Starting import for {} ({}, {})",
            city.getName(), city.getLatitude(), city.getLongitude());

        String query   = buildQuery(city.getLatitude(), city.getLongitude());
        OverpassResponse resp = fetchOverpass(query);

        if (resp == null || resp.getElements() == null || resp.getElements().isEmpty()) {
            log.warn("[OSM] No elements returned for {}", city.getName());
            return new OsmImportResultDTO(cityId, city.getName(), 0, 0, 0);
        }

        String batch  = OsmConstants.SOURCE_NAME + "-" + cityId + "-" + System.currentTimeMillis();
        int imported  = 0;
        int skipped   = 0;

        for (OverpassElement el : resp.getElements()) {
            if (imported >= OsmConstants.MAX_IMPORT) break;
            if (el.getTags() == null) continue;

            String name = el.getTags().get("name");
            if (name == null || name.isBlank()) continue;

            String osmId = OsmConstants.EXTERNAL_SOURCE_PREFIX + ":" + el.getId();
            if (poiRepository.existsByExternalSourceId(osmId)) { skipped++; continue; }

            String category = resolveCategory(el.getTags());
            if (category == null) continue;

            PointOfInterest poi = buildPoi(el, name, osmId, category, city, batch);
            poiRepository.save(poi);
            imported++;
        }

        long total = poiRepository.countByCityIdAndIsGlobalTrue(cityId);
        city.setPoiCount((int) total);
        cityRepository.save(city);

        log.info("[OSM] Done for {}: imported={}, skipped={}, total={}",
            city.getName(), imported, skipped, total);
        return new OsmImportResultDTO(cityId, city.getName(), imported, skipped, (int) total);
    }

    private String buildQuery(double lat, double lng) {
        return String.format(Locale.ROOT, """
            [out:json][timeout:%d];
            (
              node["amenity"~"restaurant|fast_food|cafe|ice_cream|bar|pub|nightclub|museum|theatre|cinema|arts_centre|library|place_of_worship|marketplace"](around:%d,%f,%f);
              node["tourism"~"attraction|monument|museum|gallery|viewpoint|artwork|theme_park|zoo"](around:%d,%f,%f);
              node["leisure"~"park|garden|nature_reserve|sports_centre|stadium"](around:%d,%f,%f);
              node["historic"~"monument|memorial|castle|palace|fort|ruins|archaeological_site|church|cathedral"](around:%d,%f,%f);
            );
            out body;
            """,
            OsmConstants.QUERY_TIMEOUT_SECONDS,
            OsmConstants.RADIUS_METERS, lat, lng,
            OsmConstants.RADIUS_METERS, lat, lng,
            OsmConstants.RADIUS_METERS, lat, lng,
            OsmConstants.RADIUS_METERS, lat, lng);
    }

    private OverpassResponse fetchOverpass(String query) {
        try {
            String encoded = "data=" + URLEncoder.encode(query, StandardCharsets.UTF_8);
            return restClient.post()
                .uri(OsmConstants.OVERPASS_URL)
                .header("Content-Type", OsmConstants.CONTENT_TYPE_FORM_URLENCODED)
                .body(encoded)
                .retrieve()
                .body(OverpassResponse.class);
        } catch (Exception e) {
            log.error("[OSM] Overpass API error: {}", e.getMessage());
            throw new RuntimeException("OpenStreetMap service unavailable: " + e.getMessage());
        }
    }

    private String resolveCategory(Map<String, String> tags) {
        String v;
        if ((v = tags.get("amenity")) != null && AMENITY.containsKey(v)) return AMENITY.get(v);
        if ((v = tags.get("tourism")) != null && TOURISM.containsKey(v)) return TOURISM.get(v);
        if ((v = tags.get("leisure")) != null && LEISURE.containsKey(v)) return LEISURE.get(v);
        if ((v = tags.get("historic")) != null && HISTORIC.containsKey(v)) return HISTORIC.get(v);
        return null;
    }

    private PointOfInterest buildPoi(OverpassElement el, String name, String osmId,
                                     String category, City city, String batch) {
        Map<String, String> tags = el.getTags();

        PointOfInterest poi = new PointOfInterest();
        poi.setName(name);
        poi.setCategory(category);
        poi.setLatitude(el.getLat());
        poi.setLongitude(el.getLon());
        poi.setCity(city);
        poi.setIsGlobal(true);
        poi.setSource(OsmConstants.SOURCE_NAME);
        poi.setExternalSourceId(osmId);
        poi.setImportBatch(batch);
        poi.setUsageCount(0);
        poi.setRating(0.0);
        poi.setVerified(false);
        poi.setFeatured(false);

        String street = tags.get("addr:street");
        String num    = tags.get("addr:housenumber");
        if (street != null) poi.setAddress(num != null ? street + " " + num : street);

        String desc = tags.get("description");
        if (desc == null) desc = tags.get("name:en");
        poi.setDescription(desc);

        if (tags.containsKey("website")) poi.setSourceUrl(tags.get("website"));

        int score = OsmConstants.QUALITY_BASE_SCORE;
        if (tags.containsKey("website"))       score += OsmConstants.QUALITY_WEBSITE_BONUS;
        if (tags.containsKey("opening_hours")) score += OsmConstants.QUALITY_OPENING_HOURS_BONUS;
        if (tags.containsKey("phone"))         score += OsmConstants.QUALITY_PHONE_BONUS;
        if (tags.containsKey("description"))   score += OsmConstants.QUALITY_DESCRIPTION_BONUS;
        if (tags.containsKey("image"))         score += OsmConstants.QUALITY_IMAGE_BONUS;
        poi.setQualityScore(score);
        poi.setEditorialScore(score);

        String img = tags.get("image");
        if (img == null) img = CATEGORY_IMAGES.getOrDefault(category, OsmConstants.DEFAULT_IMAGE);
        poi.setImageUrl(img);
        poi.setMainImageUrl(img);
        poi.setGalleryUrls(new ArrayList<>(List.of(img)));

        List<String> poiTags = new ArrayList<>();
        poiTags.add(city.getName().toLowerCase());
        if (city.getCountry() != null) poiTags.add(city.getCountry().getName().toLowerCase());
        poiTags.add(category.toLowerCase());
        poiTags.add(OsmConstants.SOURCE_NAME);
        tags.forEach((k, v) -> {
            if (List.of("amenity","tourism","leisure","historic").contains(k))
                poiTags.add(v.replace("_", " "));
        });
        poi.setTags(new ArrayList<>(poiTags.stream().distinct().toList()));

        return poi;
    }
}
