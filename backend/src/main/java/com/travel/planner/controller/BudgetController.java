package com.travel.planner.controller;

import com.travel.planner.dto.BudgetSummaryDTO;
import com.travel.planner.dto.CreateRouteExpenseRequestDTO;
import com.travel.planner.dto.RouteExpenseDTO;
import com.travel.planner.dto.UpdateRouteExpenseRequestDTO;
import com.travel.planner.entity.User;
import com.travel.planner.service.BudgetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;

    @GetMapping("/routes/{id}/budget")
    public List<RouteExpenseDTO> getBudget(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return budgetService.getRouteExpenses(id, currentUser);
    }

    @PostMapping("/routes/{id}/expenses")
    public RouteExpenseDTO addExpense(
            @PathVariable Long id,
            @RequestBody CreateRouteExpenseRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return budgetService.addExpense(id, request, currentUser);
    }

    @PutMapping("/expenses/{id}")
    public RouteExpenseDTO updateExpense(
            @PathVariable Long id,
            @RequestBody UpdateRouteExpenseRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return budgetService.updateExpense(id, request, currentUser);
    }

    @DeleteMapping("/expenses/{id}")
    public ResponseEntity<Void> deleteExpense(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        budgetService.deleteExpense(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/routes/{id}/budget/summary")
    public BudgetSummaryDTO getBudgetSummary(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return budgetService.getBudgetSummary(id, currentUser);
    }
}
