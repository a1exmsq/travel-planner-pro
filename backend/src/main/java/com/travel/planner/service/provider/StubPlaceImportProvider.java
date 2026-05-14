package com.travel.planner.service.provider;

import com.travel.planner.dto.ImportedStopDTO;
import com.travel.planner.dto.RouteImportPreviewDTO;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class StubPlaceImportProvider implements PlaceImportProvider {

    private static final Pattern COORDS_PATTERN = Pattern.compile("(-?\\d{1,3}\\.\\d+),\\s*(-?\\d{1,3}\\.\\d+)");

    @Override
    public RouteImportPreviewDTO previewImport(String rawUrl) {
        String cleanedUrl = rawUrl == null ? "" : rawUrl.trim();
        if (cleanedUrl.isEmpty()) {
            throw new IllegalArgumentException("Google Maps link is empty");
        }

        RouteImportPreviewDTO preview = new RouteImportPreviewDTO();
        preview.setProvider(providerName());
        preview.setSourceUrl(cleanedUrl);

        List<ImportedStopDTO> parsedStops = parseStops(cleanedUrl);
        if (parsedStops.isEmpty()) {
            throw new IllegalArgumentException("Could not find any importable stops in this Google Maps link");
        }

        Map<String, ImportedStopDTO> uniqueStops = new LinkedHashMap<>();
        for (ImportedStopDTO stop : parsedStops) {
            String key = (stop.getName() == null ? "" : stop.getName().toLowerCase(Locale.ROOT))
                    + "|"
                    + (stop.getLatitude() != null ? stop.getLatitude() : "null")
                    + "|"
                    + (stop.getLongitude() != null ? stop.getLongitude() : "null");
            uniqueStops.putIfAbsent(key, stop);
        }

        List<ImportedStopDTO> stops = new ArrayList<>(uniqueStops.values());
        preview.setStops(stops);
        long resolvedCount = stops.stream().filter(ImportedStopDTO::isResolved).count();
        long unresolvedCount = stops.size() - resolvedCount;
        String firstName = stops.get(0).getName() != null ? stops.get(0).getName() : "Imported route";
        preview.setSuggestedTitle(stops.size() > 1 ? firstName + " route" : firstName);
        preview.setSummary("Imported " + resolvedCount + " stop" + (resolvedCount == 1 ? "" : "s")
                + (unresolvedCount > 0 ? " and flagged " + unresolvedCount + " for review." : "."));
        if (unresolvedCount > 0) {
            preview.getWarnings().add("Some Google Maps segments did not expose coordinates. Review those stops before saving them.");
        }
        if (cleanedUrl.contains("maps.app.goo.gl")) {
            preview.getWarnings().add("Short Google Maps links can hide waypoint details. Expanded google.com/maps links work best.");
        }
        return preview;
    }

    @Override
    public String providerName() {
        return "google-maps-parser";
    }

    private List<ImportedStopDTO> parseStops(String rawUrl) {
        List<ImportedStopDTO> stops = new ArrayList<>();
        try {
            URI uri = URI.create(rawUrl);
            String decodedPath = decode(uri.getPath());
            String query = decode(uri.getQuery());

            if (decodedPath != null && decodedPath.contains("/dir/")) {
                String section = decodedPath.substring(decodedPath.indexOf("/dir/") + 5);
                String[] segments = section.split("/");
                for (String segment : segments) {
                    if (segment == null || segment.isBlank() || segment.startsWith("@")) {
                        continue;
                    }
                    ImportedStopDTO stop = parseStopCandidate(segment, "Directions");
                    if (stop != null) {
                        stops.add(stop);
                    }
                }
            }

            if (decodedPath != null && decodedPath.contains("/place/")) {
                String section = decodedPath.substring(decodedPath.indexOf("/place/") + 7);
                String candidate = section.split("/")[0];
                ImportedStopDTO stop = parseStopCandidate(candidate, "Place");
                if (stop != null) {
                    stops.add(stop);
                }
            }

            if (query != null && !query.isBlank()) {
                for (String part : query.split("&")) {
                    String[] pair = part.split("=", 2);
                    if (pair.length != 2) {
                        continue;
                    }
                    String key = pair[0];
                    String value = pair[1];
                    if (List.of("q", "query", "destination", "origin", "waypoints").contains(key) && !value.isBlank()) {
                        if ("waypoints".equals(key)) {
                            for (String waypoint : value.split("\\|")) {
                                ImportedStopDTO stop = parseStopCandidate(waypoint, "Waypoint");
                                if (stop != null) {
                                    stops.add(stop);
                                }
                            }
                        } else {
                            ImportedStopDTO stop = parseStopCandidate(value, key);
                            if (stop != null) {
                                stops.add(stop);
                            }
                        }
                    }
                }
            }
        } catch (Exception ignored) {
            ImportedStopDTO fallback = parseStopCandidate(rawUrl, "Google Maps");
            if (fallback != null) {
                stops.add(fallback);
            }
        }
        return stops;
    }

    private ImportedStopDTO parseStopCandidate(String rawCandidate, String sourceLabel) {
        String normalized = decode(rawCandidate)
                .replace('+', ' ')
                .replaceAll("!.*$", "")
                .trim();
        if (normalized.isBlank()) {
            return null;
        }

        Matcher matcher = COORDS_PATTERN.matcher(normalized);
        Double lat = null;
        Double lng = null;
        if (matcher.find()) {
            lat = Double.parseDouble(matcher.group(1));
            lng = Double.parseDouble(matcher.group(2));
        }

        String name = normalized
                .replaceAll("@-?\\d{1,3}\\.\\d+,-?\\d{1,3}\\.\\d+.*$", "")
                .replaceAll("-?\\d{1,3}\\.\\d+,-?\\d{1,3}\\.\\d+", "")
                .replace('/', ' ')
                .replaceAll("\\s+", " ")
                .trim();

        if (name.isBlank()) {
            name = lat != null && lng != null ? "Pinned stop" : sourceLabel + " stop";
        }

        boolean resolved = lat != null && lng != null;
        String note = resolved ? null : "Coordinates were not visible in this part of the link.";
        return new ImportedStopDTO(name, lat, lng, resolved, sourceLabel, note);
    }

    private String decode(String value) {
        if (value == null) {
            return null;
        }
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}
