package com.travel.planner.controller;

import com.travel.planner.dto.*;
import com.travel.planner.entity.User;
import com.travel.planner.service.ItineraryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ItineraryController {

    private final ItineraryService itineraryService;

    @PutMapping("/days/{id}")
    public RouteDayDTO updateDay(
            @PathVariable Long id,
            @RequestBody UpdateRouteDayRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return itineraryService.updateDay(id, request, currentUser);
    }

    @PostMapping("/days/{id}/activities")
    public DayActivityDTO addActivity(
            @PathVariable Long id,
            @RequestBody CreateDayActivityRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return itineraryService.addActivity(id, request, currentUser);
    }

    @PutMapping("/activities/{id}")
    public DayActivityDTO updateActivity(
            @PathVariable Long id,
            @RequestBody UpdateDayActivityRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return itineraryService.updateActivity(id, request, currentUser);
    }
}
