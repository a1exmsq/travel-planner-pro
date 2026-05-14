package com.travel.planner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "route_journal_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteJournalEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "route_id")
    private Route route;

    @Column(nullable = false)
    private LocalDate entryDate;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String story;

    @Column(length = 160)
    private String locationLabel;

    @Column(length = 48)
    private String mood;

    @Column(length = 255)
    private String highlight;

    private Boolean favorite;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @ElementCollection
    @CollectionTable(name = "route_journal_entry_media", joinColumns = @JoinColumn(name = "journal_entry_id"))
    @Column(name = "media_url", length = 255)
    private List<String> mediaUrls = new ArrayList<>();

    @PrePersist
    private void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (favorite == null) {
            favorite = Boolean.FALSE;
        }
        if (mediaUrls == null) {
            mediaUrls = new ArrayList<>();
        }
    }

    @PreUpdate
    private void preUpdate() {
        updatedAt = LocalDateTime.now();
        if (mediaUrls == null) {
            mediaUrls = new ArrayList<>();
        }
    }
}
