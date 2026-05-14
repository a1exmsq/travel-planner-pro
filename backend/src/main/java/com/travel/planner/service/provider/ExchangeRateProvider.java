package com.travel.planner.service.provider;

import java.math.BigDecimal;

public interface ExchangeRateProvider {
    default String providerName() {
        return "stub";
    }

    default BigDecimal convert(BigDecimal amount, String fromCurrency, String toCurrency) {
        throw new UnsupportedOperationException("Exchange rates are prepared for Phase 2 and are not enabled yet");
    }
}
