ALTER TABLE routes ADD COLUMN IF NOT EXISTS total_budget NUMERIC(19,2) DEFAULT 0;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS currency VARCHAR(8) DEFAULT 'USD';

CREATE TABLE IF NOT EXISTS route_expenses (
    id BIGSERIAL PRIMARY KEY,
    route_id BIGINT NOT NULL,
    route_poi_id BIGINT,
    category VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    planned_amount NUMERIC(19,2),
    actual_amount NUMERIC(19,2),
    currency VARCHAR(8),
    date DATE,
    is_paid BOOLEAN DEFAULT FALSE,
    notes VARCHAR(255)
);
