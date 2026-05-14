package com.travel.planner.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class UpdateJournalEntryRequestDTO {
    private LocalDate entryDate;

    @Size(max = 160, message = "Entry title must be shorter than 160 characters")
    private String title;

    @Size(max = 4000, message = "Story must be shorter than 4000 characters")
    private String story;

    @Size(max = 160, message = "Location label must be shorter than 160 characters")
    private String locationLabel;

    @Size(max = 48, message = "Mood must be shorter than 48 characters")
    private String mood;

    @Size(max = 255, message = "Highlight must be shorter than 255 characters")
    private String highlight;

    private Boolean favorite;

    private List<String> mediaUrls;
}
