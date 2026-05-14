package com.travel.planner.service;

import com.travel.planner.dto.CreateJournalEntryRequestDTO;
import com.travel.planner.dto.JournalEntryDTO;
import com.travel.planner.dto.UpdateJournalEntryRequestDTO;
import com.travel.planner.entity.Route;
import com.travel.planner.entity.RouteJournalEntry;
import com.travel.planner.entity.User;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.RouteJournalEntryRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class JournalService {

    private final RouteAccessService routeAccessService;
    private final RouteJournalEntryRepository routeJournalEntryRepository;

    public List<JournalEntryDTO> getEntries(Long routeId, User currentUser) {
        Route route = routeAccessService.findViewableRoute(routeId, currentUser);
        return routeJournalEntryRepository.findByRouteIdOrderByEntryDateDescCreatedAtDesc(route.getId()).stream()
                .map(this::mapEntry)
                .toList();
    }

    public List<JournalEntryDTO> getHighlights(Long routeId, User currentUser) {
        Route route = routeAccessService.findViewableRoute(routeId, currentUser);
        return routeJournalEntryRepository.findTop3ByRouteIdOrderByFavoriteDescEntryDateDescCreatedAtDesc(route.getId()).stream()
                .map(this::mapEntry)
                .toList();
    }

    @Transactional
    public JournalEntryDTO createEntry(Long routeId, CreateJournalEntryRequestDTO request, User currentUser) {
        Route route = routeAccessService.findEditableRoute(routeId, currentUser);
        RouteJournalEntry entry = new RouteJournalEntry();
        entry.setRoute(route);
        applyPayload(
                entry,
                request.getEntryDate(),
                request.getTitle(),
                request.getStory(),
                request.getLocationLabel(),
                request.getMood(),
                request.getHighlight(),
                request.getFavorite(),
                request.getMediaUrls()
        );
        return mapEntry(routeJournalEntryRepository.save(entry));
    }

    @Transactional
    public JournalEntryDTO updateEntry(Long entryId, UpdateJournalEntryRequestDTO request, User currentUser) {
        RouteJournalEntry entry = routeJournalEntryRepository.findById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("Journal entry not found"));
        routeAccessService.checkCanEdit(entry.getRoute(), currentUser);
        applyPayload(
                entry,
                request.getEntryDate() != null ? request.getEntryDate() : entry.getEntryDate(),
                request.getTitle() != null ? request.getTitle() : entry.getTitle(),
                request.getStory() != null ? request.getStory() : entry.getStory(),
                request.getLocationLabel() != null ? request.getLocationLabel() : entry.getLocationLabel(),
                request.getMood() != null ? request.getMood() : entry.getMood(),
                request.getHighlight() != null ? request.getHighlight() : entry.getHighlight(),
                request.getFavorite() != null ? request.getFavorite() : entry.getFavorite(),
                request.getMediaUrls() != null ? request.getMediaUrls() : entry.getMediaUrls()
        );
        return mapEntry(routeJournalEntryRepository.save(entry));
    }

    @Transactional
    public void deleteEntry(Long entryId, User currentUser) {
        RouteJournalEntry entry = routeJournalEntryRepository.findById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("Journal entry not found"));
        routeAccessService.checkCanEdit(entry.getRoute(), currentUser);
        routeJournalEntryRepository.delete(entry);
    }

    private void applyPayload(RouteJournalEntry entry, LocalDate entryDate, String title, String story,
                              String locationLabel, String mood, String highlight, Boolean favorite,
                              List<String> mediaUrls) {
        entry.setEntryDate(entryDate != null ? entryDate : LocalDate.now());
        entry.setTitle((title == null || title.isBlank()) ? "Travel note" : title.trim());
        entry.setStory(blankToNull(story));
        entry.setLocationLabel(blankToNull(locationLabel));
        entry.setMood(normalizeMood(mood));
        entry.setHighlight(blankToNull(highlight));
        entry.setFavorite(favorite != null ? favorite : Boolean.FALSE);
        entry.setMediaUrls(normalizeMedia(mediaUrls));
    }

    private String normalizeMood(String mood) {
        String normalized = blankToNull(mood);
        return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
    }

    private List<String> normalizeMedia(List<String> mediaUrls) {
        if (mediaUrls == null) {
            return new ArrayList<>();
        }
        return mediaUrls.stream()
                .map(this::blankToNull)
                .filter(value -> value != null)
                .limit(6)
                .toList();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private JournalEntryDTO mapEntry(RouteJournalEntry entry) {
        JournalEntryDTO dto = new JournalEntryDTO();
        dto.setId(entry.getId());
        dto.setEntryDate(entry.getEntryDate());
        dto.setTitle(entry.getTitle());
        dto.setStory(entry.getStory());
        dto.setLocationLabel(entry.getLocationLabel());
        dto.setMood(entry.getMood());
        dto.setHighlight(entry.getHighlight());
        dto.setFavorite(entry.getFavorite());
        dto.setMediaUrls(entry.getMediaUrls());
        dto.setCreatedAt(entry.getCreatedAt());
        dto.setUpdatedAt(entry.getUpdatedAt());
        return dto;
    }
}
