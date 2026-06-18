package com.travel.planner.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
public class RouteShortDTO {

    private Long id;
    private String name;
    private String description;
    private int likeCounts;
    private boolean isPublic;
    private String routeType;
    private String regionLabel;
    private String locationSummary;
    private Long primaryCountryId;
    private String primaryCountryName;
    private String primaryCountryCode;
    private String primaryCountryImageUrl;
    private Long primaryCityId;
    private String primaryCityName;
    private String primaryCityImageUrl;
    private UserShortDTO author;
    private int totalDurationMinutes;
    private Double totalDistanceKm;
    private Boolean isOptimized;
    private String mainImageUrl;
    private List<String> routeMediaUrls;
    private List<String> vibeTags;
    private Long forkedFromRouteId;
    private String forkedFromRouteName;
    private String forkedFromAuthorUsername;
    private Long originalRouteId;
    private String originalRouteName;
    private String originalRouteAuthorUsername;
    private int remixCount;
    private String accessRole;
    private boolean canEdit;
    private boolean canManageCollaborators;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer numberOfDays;
    private BigDecimal totalBudget;
    private BigDecimal budgetSpent;
    private String currency;
    private long packingItemCount;
    private long packedItemCount;
    private long journalEntryCount;
}
