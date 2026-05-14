package com.travel.planner.service;

import com.travel.planner.dto.*;
import com.travel.planner.entity.*;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.RouteExpenseRepository;
import com.travel.planner.repository.RoutePOIRepository;
import com.travel.planner.repository.RouteRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class BudgetService {

    private final RouteExpenseRepository routeExpenseRepository;
    private final RoutePOIRepository routePOIRepository;
    private final RouteRepository routeRepository;
    private final RouteAccessService routeAccessService;

    public List<RouteExpenseDTO> getRouteExpenses(Long routeId, User currentUser) {
        Route route = routeAccessService.findViewableRoute(routeId, currentUser);
        return routeExpenseRepository.findByRouteIdOrderByDateAscIdAsc(route.getId()).stream()
                .map(this::mapExpense)
                .toList();
    }

    @Transactional
    public RouteExpenseDTO addExpense(Long routeId, CreateRouteExpenseRequestDTO request, User currentUser) {
        Route route = routeAccessService.findEditableRoute(routeId, currentUser);
        RouteExpense expense = new RouteExpense();
        expense.setRoute(route);
        applyExpensePayload(expense, request.getRoutePoiId(), request.getCategory(), request.getName(), request.getPlannedAmount(),
                request.getActualAmount(), request.getCurrency(), request.getDate(), request.getIsPaid(), request.getNotes(), route);
        RouteExpense saved = routeExpenseRepository.save(expense);
        syncRouteBudget(route);
        return mapExpense(saved);
    }

    @Transactional
    public RouteExpenseDTO updateExpense(Long expenseId, UpdateRouteExpenseRequestDTO request, User currentUser) {
        RouteExpense expense = routeExpenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        routeAccessService.checkCanEdit(expense.getRoute(), currentUser);
        applyExpensePayload(
                expense,
                request.getRoutePoiId() != null ? request.getRoutePoiId() : expense.getRoutePoi() != null ? expense.getRoutePoi().getId() : null,
                request.getCategory() != null ? request.getCategory() : expense.getCategory().name(),
                request.getName() != null ? request.getName() : expense.getName(),
                request.getPlannedAmount() != null ? request.getPlannedAmount() : expense.getPlannedAmount(),
                request.getActualAmount() != null ? request.getActualAmount() : expense.getActualAmount(),
                request.getCurrency() != null ? request.getCurrency() : expense.getCurrency(),
                request.getDate() != null ? request.getDate() : expense.getDate(),
                request.getIsPaid() != null ? request.getIsPaid() : expense.getIsPaid(),
                request.getNotes() != null ? request.getNotes() : expense.getNotes(),
                expense.getRoute()
        );
        RouteExpense saved = routeExpenseRepository.save(expense);
        syncRouteBudget(expense.getRoute());
        return mapExpense(saved);
    }

    @Transactional
    public void deleteExpense(Long expenseId, User currentUser) {
        RouteExpense expense = routeExpenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        routeAccessService.checkCanEdit(expense.getRoute(), currentUser);
        Route route = expense.getRoute();
        routeExpenseRepository.delete(expense);
        syncRouteBudget(route);
    }

    public BudgetSummaryDTO getBudgetSummary(Long routeId, User currentUser) {
        Route route = routeAccessService.findViewableRoute(routeId, currentUser);
        return buildSummary(route, routeExpenseRepository.findByRouteIdOrderByDateAscIdAsc(route.getId()));
    }

    public BigDecimal getBudgetSpentForRoute(Long routeId) {
        return routeExpenseRepository.findByRouteIdOrderByDateAscIdAsc(routeId).stream()
                .map(expense -> safe(expense.getActualAmount() != null ? expense.getActualAmount() : expense.getPlannedAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal getBudgetForDate(Long routeId, LocalDate date) {
        if (date == null) {
            return BigDecimal.ZERO;
        }
        return routeExpenseRepository.findByRouteIdAndDate(routeId, date).stream()
                .map(expense -> safe(expense.getActualAmount() != null ? expense.getActualAmount() : expense.getPlannedAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void applyExpensePayload(RouteExpense expense, Long routePoiId, String category, String name,
                                     BigDecimal plannedAmount, BigDecimal actualAmount, String currency,
                                     LocalDate date, Boolean isPaid, String notes, Route route) {
        RoutePOI routePOI = routePoiId != null
                ? routePOIRepository.findById(routePoiId).orElseThrow(() -> new ResourceNotFoundException("Route stop not found"))
                : null;

        expense.setRoutePoi(routePOI);
        expense.setCategory(resolveCategory(category));
        expense.setName(name);
        expense.setPlannedAmount(safe(plannedAmount));
        expense.setActualAmount(actualAmount);
        expense.setCurrency(currency == null || currency.isBlank() ? route.getCurrency() : currency.toUpperCase(Locale.ROOT));
        expense.setDate(date);
        expense.setIsPaid(isPaid != null ? isPaid : Boolean.FALSE);
        expense.setNotes(notes);
    }

    private ExpenseCategory resolveCategory(String raw) {
        if (raw == null || raw.isBlank()) {
            return ExpenseCategory.OTHER;
        }
        try {
            return ExpenseCategory.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return ExpenseCategory.OTHER;
        }
    }

    private RouteExpenseDTO mapExpense(RouteExpense expense) {
        RouteExpenseDTO dto = new RouteExpenseDTO();
        dto.setId(expense.getId());
        dto.setRoutePoiId(expense.getRoutePoi() != null ? expense.getRoutePoi().getId() : null);
        dto.setRoutePoiName(expense.getRoutePoi() != null ? expense.getRoutePoi().getEffectiveName() : null);
        dto.setCategory(expense.getCategory() != null ? expense.getCategory().name() : ExpenseCategory.OTHER.name());
        dto.setName(expense.getName());
        dto.setPlannedAmount(expense.getPlannedAmount());
        dto.setActualAmount(expense.getActualAmount());
        dto.setCurrency(expense.getCurrency());
        dto.setDate(expense.getDate());
        dto.setIsPaid(expense.getIsPaid());
        dto.setNotes(expense.getNotes());
        return dto;
    }

    private BudgetSummaryDTO buildSummary(Route route, List<RouteExpense> expenses) {
        BigDecimal totalPlanned = expenses.stream()
                .map(expense -> safe(expense.getPlannedAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalActual = expenses.stream()
                .map(expense -> safe(expense.getActualAmount() != null ? expense.getActualAmount() : expense.getPlannedAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<ExpenseCategory, CategoryBudgetDTO> categories = new LinkedHashMap<>();
        for (RouteExpense expense : expenses.stream().sorted(Comparator.comparing(RouteExpense::getCategory)).toList()) {
            ExpenseCategory key = expense.getCategory() != null ? expense.getCategory() : ExpenseCategory.OTHER;
            CategoryBudgetDTO dto = categories.computeIfAbsent(key, ignored -> {
                CategoryBudgetDTO item = new CategoryBudgetDTO();
                item.setCategory(key.name());
                item.setPlanned(BigDecimal.ZERO);
                item.setActual(BigDecimal.ZERO);
                return item;
            });
            dto.setPlanned(dto.getPlanned().add(safe(expense.getPlannedAmount())));
            dto.setActual(dto.getActual().add(safe(expense.getActualAmount() != null ? expense.getActualAmount() : expense.getPlannedAmount())));
        }

        BudgetSummaryDTO summary = new BudgetSummaryDTO();
        summary.setTotalBudget(safe(route.getTotalBudget()));
        summary.setTotalPlanned(totalPlanned);
        summary.setTotalActual(totalActual);
        summary.setRemaining(safe(route.getTotalBudget()).subtract(totalActual));
        summary.setCurrency(route.getCurrency());
        summary.setCategories(new ArrayList<>(categories.values()));
        return summary;
    }

    private void syncRouteBudget(Route route) {
        BigDecimal spent = getBudgetSpentForRoute(route.getId());
        route.setCurrency(route.getCurrency() == null || route.getCurrency().isBlank() ? "USD" : route.getCurrency());
        routeRepository.save(route);
    }

    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
