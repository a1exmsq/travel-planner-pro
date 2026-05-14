package com.travel.planner.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class JournalEntryDTO {
    private Long id;
    private LocalDate entryDate;
    private String title;
    private String story;
    private String locationLabel;
    private String mood;
    private String highlight;
    private Boolean favorite;
    private List<String> mediaUrls;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
