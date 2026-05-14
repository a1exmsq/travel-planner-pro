package com.travel.planner.entity;

import jakarta.persistence.Lob;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;

import java.sql.Types;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "routes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private int likeCount = 0;

    @Column(name = "is_public", nullable = false)
    private boolean isPublic = false;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private RouteType routeType = RouteType.CUSTOM;

    @ManyToOne
    @JoinColumn(name = "primary_country_id")
    private Country primaryCountry;

    @ManyToOne
    @JoinColumn(name = "primary_city_id")
    private City primaryCity;

    @Column(length = 120)
    private String regionLabel;

    @Column(length = 255)
    private String locationSummary;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "forked_from_route_id")
    private Route forkedFromRoute;

    @ManyToOne
    @JoinColumn(name = "original_route_id")
    private Route originalRoute;

    @OneToMany(mappedBy = "route", cascade = jakarta.persistence.CascadeType.ALL)
    private List<RoutePOI> routePois = new ArrayList<>();

    @OneToMany(mappedBy = "route", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    private List<RouteCollaborator> collaborators = new ArrayList<>();

    @OneToMany(mappedBy = "route", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    private List<RouteInvitation> invitations = new ArrayList<>();

    @OneToMany(mappedBy = "route", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    private List<RouteDay> days = new ArrayList<>();

    @OneToMany(mappedBy = "route", cascade = jakarta.persistence.CascadeType.ALL)
    private List<Like> likes = new ArrayList<>();

    @OneToMany(mappedBy = "route", cascade = jakarta.persistence.CascadeType.ALL)
    private List<Comment> comments = new ArrayList<>();

    @OneToMany(mappedBy = "route", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    private List<RoutePackingItem> packingItems = new ArrayList<>();

    @OneToMany(mappedBy = "route", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    private List<RouteJournalEntry> journalEntries = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    @JdbcTypeCode(Types.LONGVARCHAR)
    private String mainImageUrl;

    @ElementCollection
    @CollectionTable(name = "route_media", joinColumns = @JoinColumn(name = "route_id"))
    @Column(name = "media_url", columnDefinition = "TEXT")
    private List<String> routeMediaUrls = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "route_vibe_tags", joinColumns = @JoinColumn(name = "route_id"))
    @Column(name = "tag", length = 32)
    private Set<String> vibeTags = new LinkedHashSet<>();

    private Double totalDistanceKm = 0.0;

    private Integer totalDurationMinutes = 0;

    @Column(name = "is_optimized", nullable = false)
    private Boolean isOptimized = false;

    private LocalDate startDate;

    private LocalDate endDate;

    private Integer numberOfDays = 0;

    private BigDecimal totalBudget = BigDecimal.ZERO;

    @Column(length = 8)
    private String currency = "USD";

    @PrePersist
    @PreUpdate
    private void ensureDefaults() {
        if (routeType == null) {
            routeType = RouteType.CUSTOM;
        }
        if (vibeTags == null) {
            vibeTags = new LinkedHashSet<>();
        }
        if (totalDistanceKm == null) {
            totalDistanceKm = 0.0;
        }
        if (totalDurationMinutes == null) {
            totalDurationMinutes = 0;
        }
        if (isOptimized == null) {
            isOptimized = false;
        }
        if (startDate != null && endDate != null && !endDate.isBefore(startDate)) {
            numberOfDays = (int) java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
        } else {
            numberOfDays = 0;
        }
        if (totalBudget == null) {
            totalBudget = BigDecimal.ZERO;
        }
        if (currency == null || currency.isBlank()) {
            currency = "USD";
        }
    }
}
