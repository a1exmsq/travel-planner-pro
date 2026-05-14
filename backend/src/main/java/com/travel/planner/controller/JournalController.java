package com.travel.planner.controller;

import com.travel.planner.dto.CreateJournalEntryRequestDTO;
import com.travel.planner.dto.JournalEntryDTO;
import com.travel.planner.dto.UpdateJournalEntryRequestDTO;
import com.travel.planner.entity.User;
import com.travel.planner.service.JournalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class JournalController {

    private final JournalService journalService;

    @GetMapping("/routes/{id}/journal")
    public List<JournalEntryDTO> getEntries(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return journalService.getEntries(id, currentUser);
    }

    @GetMapping("/routes/{id}/journal/highlights")
    public List<JournalEntryDTO> getHighlights(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return journalService.getHighlights(id, currentUser);
    }

    @PostMapping("/routes/{id}/journal")
    public JournalEntryDTO createEntry(
            @PathVariable Long id,
            @Valid @RequestBody CreateJournalEntryRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return journalService.createEntry(id, request, currentUser);
    }

    @PatchMapping("/journal/{id}")
    public JournalEntryDTO updateEntry(
            @PathVariable Long id,
            @Valid @RequestBody UpdateJournalEntryRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return journalService.updateEntry(id, request, currentUser);
    }

    @DeleteMapping("/journal/{id}")
    public ResponseEntity<Void> deleteEntry(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        journalService.deleteEntry(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
