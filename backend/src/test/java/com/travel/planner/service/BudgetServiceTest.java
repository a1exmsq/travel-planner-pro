package com.travel.planner.service;

import com.travel.planner.dto.BudgetSummaryDTO;
import com.travel.planner.dto.RouteExpenseDTO;
import com.travel.planner.entity.*;
import com.travel.planner.repository.RouteExpenseRepository;
import com.travel.planner.repository.RoutePOIRepository;
import com.travel.planner.repository.RouteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BudgetServiceTest {

    @Mock
    private RouteExpenseRepository expenseRepository;
    @Mock
    private RoutePOIRepository routePOIRepository;
    @Mock
    private RouteRepository routeRepository;
    @Mock
    private RouteAccessService routeAccessService;

    @InjectMocks
    private BudgetService budgetService;

    private User mockUser;
    private Route mockRoute;

    @BeforeEach
    void setUp() {
        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail("test@example.com");

        mockRoute = new Route();
        mockRoute.setId(10L);
        mockRoute.setTotalBudget(new BigDecimal("1000.00"));
        mockRoute.setCurrency("PLN");
    }

    private RouteExpense expense(Long id, BigDecimal planned, BigDecimal actual, ExpenseCategory category) {
        RouteExpense e = new RouteExpense();
        e.setId(id);
        e.setRoute(mockRoute);
        e.setPlannedAmount(planned);
        e.setActualAmount(actual);
        e.setCategory(category);
        e.setName("Test expense");
        e.setDate(LocalDate.of(2025, 4, 20));
        e.setIsPaid(true);
        return e;
    }

    @Test
    void getBudgetSpentForRoute_shouldSumActualAmounts() {
        RouteExpense e1 = expense(1L, new BigDecimal("100"), new BigDecimal("120"), ExpenseCategory.FOOD);
        RouteExpense e2 = expense(2L, new BigDecimal("200"), null, ExpenseCategory.TRANSPORT);

        when(expenseRepository.findByRouteIdOrderByDateAscIdAsc(10L))
                .thenReturn(List.of(e1, e2));

        BigDecimal spent = budgetService.getBudgetSpentForRoute(10L);

        assertEquals(new BigDecimal("320"), spent); // 120 + 200 (planned fallback)
        verify(expenseRepository).findByRouteIdOrderByDateAscIdAsc(10L);
    }

    @Test
    void getBudgetForDate_shouldReturnZero_whenDateIsNull() {
        BigDecimal result = budgetService.getBudgetForDate(10L, null);
        assertEquals(BigDecimal.ZERO, result);
        verifyNoInteractions(expenseRepository);
    }

    @Test
    void getBudgetSummary_shouldCalculateTotalsAndCategories() {
        RouteExpense e1 = expense(1L, new BigDecimal("100"), new BigDecimal("90"), ExpenseCategory.FOOD);
        RouteExpense e2 = expense(2L, new BigDecimal("200"), new BigDecimal("200"), ExpenseCategory.TRANSPORT);
        RouteExpense e3 = expense(3L, new BigDecimal("50"), new BigDecimal("50"), ExpenseCategory.FOOD);

        when(routeAccessService.findViewableRoute(10L, mockUser)).thenReturn(mockRoute);
        when(expenseRepository.findByRouteIdOrderByDateAscIdAsc(10L))
                .thenReturn(List.of(e1, e2, e3));

        BudgetSummaryDTO summary = budgetService.getBudgetSummary(10L, mockUser);

        assertNotNull(summary);
        assertEquals(new BigDecimal("1000.00"), summary.getTotalBudget());
        assertEquals(new BigDecimal("350"), summary.getTotalPlanned());   // 100+200+50
        assertEquals(new BigDecimal("340"), summary.getTotalActual());    // 90+200+50
        assertEquals(new BigDecimal("660.00"), summary.getRemaining());   // 1000-340
        assertEquals("PLN", summary.getCurrency());
        assertEquals(2, summary.getCategories().size()); // FOOD + TRANSPORT

        verify(routeAccessService).findViewableRoute(10L, mockUser);
        verify(expenseRepository).findByRouteIdOrderByDateAscIdAsc(10L);
    }

    @Test
    void deleteExpense_shouldRemoveExpenseAndSyncBudget() {
        RouteExpense expense = expense(1L, new BigDecimal("100"), new BigDecimal("100"), ExpenseCategory.OTHER);

        when(expenseRepository.findById(1L)).thenReturn(Optional.of(expense));
        doNothing().when(routeAccessService).checkCanEdit(mockRoute, mockUser);
        when(expenseRepository.findByRouteIdOrderByDateAscIdAsc(10L)).thenReturn(List.of());

        budgetService.deleteExpense(1L, mockUser);

        verify(expenseRepository).delete(expense);
        verify(routeRepository).save(mockRoute);
    }

    @Test
    void getBudgetSpentForRoute_shouldReturnZero_forEmptyList() {
        when(expenseRepository.findByRouteIdOrderByDateAscIdAsc(10L)).thenReturn(List.of());

        BigDecimal spent = budgetService.getBudgetSpentForRoute(10L);

        assertEquals(BigDecimal.ZERO, spent);
    }
}
